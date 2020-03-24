// PostgreSQL-backed storage for various kinds of quotes.

const pg = require("pg-promise")();
const queryParser = require("./query");

const BEFORE = Symbol("before");
const AFTER = Symbol("after");
const RANDOM = Symbol("random");
const LATEST = Symbol("latest");

class Storage {
  constructor(options) {
    if (options.db) {
      this.db = options.db;
    } else if (options.databaseUrl) {
      this.db = pg(options.databaseUrl);
    } else {
      throw new Error("Either db or databaseUrl must be provided");
    }

    this.columnSets = new Map();
  }

  async connectDocumentSet(documentSet) {
    const values = {
      documentTable: documentSet.documentTableName(),
      attributeTable: documentSet.attributeTableName(),
    };

    await this.db.none(
      `
      CREATE TABLE IF NOT EXISTS $<documentTable:name> (
        id SERIAL PRIMARY KEY,
        created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        submitter TEXT,
        body TEXT NOT NULL
      )
    `,
      values
    );

    await this.db.none(
      `
      CREATE TABLE IF NOT EXISTS $<attributeTable:name> (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES $<documentTable:name>
          ON DELETE CASCADE,
        kind TEXT NOT NULL,
        value TEXT NOT NULL
      )
    `,
      values
    );

    const columnSet = {
      attributeInsert: new pg.helpers.ColumnSet(
        ["document_id", "kind", "value"],
        {table: values.attributeTable}
      ),
    };

    this.columnSets.set(documentSet, columnSet);
  }

  async insertDocument(documentSet, submitter, body, attributes) {
    const values = {
      documentTable: documentSet.documentTableName(),
      submitter,
      body,
    };

    const row = await this.db.one(
      `
      INSERT INTO $<documentTable:name>
      (submitter, body)
      VALUES ($<submitter>, $<body>)
      RETURNING id, created, updated
    `,
      values
    );

    const docResult = Object.assign({submitter, body, attributes: []}, row);
    if (attributes.length === 0) {
      return Promise.resolve([]);
    }

    const linkedAttributes = attributes.map((attribute) =>
      Object.assign({document_id: row.id}, attribute)
    );

    const cs = this.columnSets.get(documentSet).attributeInsert;
    const query = pg.helpers.insert(linkedAttributes, cs) + "RETURNING id";

    const attrRows = await this.db.many(query);
    for (let i = 0; i < attrRows.length; i++) {
      const original = attributes[i];
      const row = attrRows[i];
      const full = Object.assign({}, row, original);

      docResult.attributes.push(full);
    }

    return docResult;
  }

  singleDocumentMatching(documentSet, attributes, query, order) {
    const documentTableName = documentSet.documentTableName();
    const attributeTableName = documentSet.attributeTableName();

    const hasAttributes = Object.keys(attributes).length > 0;
    const hasQuery = query && /\s*\S/.test(query);

    let where = "";
    let queryClause = "";
    let separator = "";
    let attrClause = "";
    const parameters = [documentTableName, attributeTableName];

    if (hasQuery || hasAttributes) {
      where = "WHERE";
    }

    if (hasQuery) {
      const {clause, parameters: queryParameters} = createQueryClause(
        query,
        "body",
        parameters.length + 1
      );
      queryClause = clause;
      parameters.push(...queryParameters);
    }

    if (hasQuery && hasAttributes) {
      separator = "AND";
    }

    if (hasAttributes) {
      const {query, parameters: attrParameters} = createAttributeQuery(
        attributes,
        2,
        parameters.length + 1
      );
      attrClause = `id IN (${query})`;
      parameters.push(...attrParameters);
    }

    let orderClause = "";
    if (order === RANDOM) orderClause = "ORDER BY RANDOM()";
    if (order === LATEST) orderClause = "ORDER BY created DESC";

    const sql = `
      SELECT id, created, updated, submitter, body
      FROM $1:name
      ${where} ${queryClause} ${separator} ${attrClause}
      ${orderClause}
      LIMIT 1
    `;

    return this.db.oneOrNone(sql, parameters);
  }

  allDocumentsMatching(
    documentSet,
    attributes,
    query,
    first = null,
    cursor = null
  ) {
    const documentTableName = documentSet.documentTableName();
    const attributeTableName = documentSet.attributeTableName();

    const hasAttributes = Object.keys(attributes).length > 0;
    const hasQuery = /\s*\S/.test(query);
    const hasCursor = cursor !== null;
    const hasFirst = first !== null;

    const clauses = [];
    const parameters = [documentTableName, attributeTableName];

    if (hasQuery) {
      const {clause, parameters: queryParameters} = createQueryClause(
        query,
        "body",
        parameters.length + 1
      );
      clauses.push(clause);
      parameters.push(...queryParameters);
    }

    if (hasAttributes) {
      const {query, parameters: attrParameters} = createAttributeQuery(
        attributes,
        2,
        parameters.length + 1
      );
      clauses.push(`id IN (${query})`);
      parameters.push(...attrParameters);
    }

    if (hasCursor) {
      clauses.push(`id > $${parameters.length + 1}`);
      parameters.push(cursor);
    }

    const where = clauses.length > 0 ? "WHERE" : "";
    let limit = "";
    if (hasFirst) {
      limit = `LIMIT $${parameters.length + 1}`;
      parameters.push(first);
    }

    const sql = `
      SELECT id, created, updated, submitter, body
      FROM $1:name
      ${where} ${clauses.join(" AND ")}
      ORDER BY id
      ${limit}
    `;

    return this.db.any(sql, parameters);
  }

  hasDocumentsMatching(documentSet, attributes, query, cursor, direction) {
    const documentTableName = documentSet.documentTableName();
    const attributeTableName = documentSet.attributeTableName();

    const hasAttributes = Object.keys(attributes).length > 0;
    const hasQuery = /\s*\S/.test(query);

    const clauses = [];
    const parameters = [documentTableName, attributeTableName];

    if (hasQuery) {
      const {clause, parameters: queryParameters} = createQueryClause(
        query,
        "body",
        parameters.length + 1
      );
      clauses.push(clause);
      parameters.push(...queryParameters);
    }

    if (hasAttributes) {
      const {query, parameters: attrParameters} = createAttributeQuery(
        attributes,
        2,
        parameters.length + 1
      );
      clauses.push(`id IN (${query})`);
      parameters.push(...attrParameters);
    }

    const operator = direction === BEFORE ? "<" : ">";
    clauses.push(`id ${operator} $${parameters.length + 1}`);
    parameters.push(cursor);

    const sql = `
      SELECT EXISTS(
        SELECT 1
        FROM $1:name
        WHERE ${clauses.join(" AND ")}
      ) AS exists
    `;

    return this.db.one(sql, parameters, (row) => row.exists);
  }

  countDocumentsMatching(documentSet, attributes, query) {
    const documentTableName = documentSet.documentTableName();
    const attributeTableName = documentSet.attributeTableName();

    const hasAttributes = Object.keys(attributes).length > 0;
    const hasQuery = query.trim() !== "";

    // Avoid an unnecessary join for attribute-only queries
    if (!hasQuery && hasAttributes) {
      const {query, parameters: attrParameters} = createAttributeQuery(
        attributes,
        1,
        2
      );
      const sql = `SELECT COUNT(*) AS count FROM (${query}) AS attrs`;
      const parameters = [attributeTableName, ...attrParameters];

      return this.db.one(sql, parameters);
    }

    let where = "";
    let queryClause = "";
    let separator = "";
    let attrClause = "";
    const parameters = [documentTableName, attributeTableName];

    if (hasQuery || hasAttributes) {
      where = "WHERE";
    }

    if (hasQuery) {
      const {clause, parameters: queryParameters} = createQueryClause(
        query,
        "body",
        parameters.length + 1
      );
      queryClause = clause;
      parameters.push(...queryParameters);
    }

    if (hasQuery && hasAttributes) {
      separator = "AND";
    }

    if (hasAttributes) {
      const {query, parameters: attrParameters} = createAttributeQuery(
        attributes,
        2,
        parameters.length + 1
      );
      attrClause = `id IN (${query})`;
      parameters.push(...attrParameters);
    }

    const sql = `
      SELECT COUNT(*) AS count
      FROM $1:name
      ${where} ${queryClause} ${separator} ${attrClause}
    `;

    return this.db.one(sql, parameters);
  }

  loadDocumentAttributes(documentSet, documents) {
    const attributeTableName = documentSet.attributeTableName();
    const ids = documents.map((doc) => doc.id);
    const parameters = {attributeTableName, ids};

    if (documents.length === 0) {
      return [];
    }

    const sql = `
      SELECT id, kind, value, document_id
      FROM $<attributeTableName:name>
      WHERE document_id IN ($<ids:csv>)
    `;

    return this.db.any(sql, parameters);
  }

  attributeStats(documentSet, attributeKinds) {
    const attributeTableName = documentSet.attributeTableName();
    const parameters = [attributeTableName, attributeKinds];

    const sql = `
      SELECT kind, value, COUNT(*) AS count
      FROM $1:name
      WHERE kind IN ($2:csv)
      GROUP BY kind, value
      HAVING COUNT(*) > 0
    `;

    return this.db.any(sql, parameters);
  }

  deleteDocumentsMatching(documentSet, attributes) {
    const documentTableName = documentSet.documentTableName();
    const attributeTableName = documentSet.attributeTableName();

    if (attributes.length === 0) {
      return this.destroyDocumentSet(documentSet);
    }

    const attr = createAttributeQuery(attributes, 2, 3);
    const query = `DELETE FROM $1:name WHERE id IN (${attr.query})`;
    const parameters = [
      documentTableName,
      attributeTableName,
      ...attr.parameters,
    ];

    return this.db.none(query, parameters);
  }

  async destroyDocumentSet(documentSet) {
    const values = {
      documentTable: documentSet.documentTableName(),
      attributeTable: documentSet.attributeTableName(),
    };

    await this.db.none("DROP TABLE IF EXISTS $<attributeTable:name>", values);
    await this.db.none("DROP TABLE IF EXISTS $<documentTable:name>", values);
    this.columnSets.delete(documentSet);
  }

  async truncateDocumentSet(documentSet) {
    const values = {
      documentTable: documentSet.documentTableName(),
      attributeTable: documentSet.attributeTableName(),
    };

    await this.db.none(
      "TRUNCATE TABLE $<attributeTable:name>, $<documentTable:name>",
      values
    );
  }
}

function createQueryClause(quoteSrc, fieldName, placeholderBase) {
  const terms = queryParser(quoteSrc);
  return {
    clause: terms
      .map((term, index) => `${fieldName} ~* $${placeholderBase + index}`)
      .join(" AND "),
    parameters: terms,
  };
}

function createAttributeQuery(
  attributes,
  attrTablePlaceholder,
  placeholderBase
) {
  const parameters = [];

  const kinds = Object.keys(attributes);
  const subSelects = [];
  let placeholder = placeholderBase;

  for (let i = 0; i < kinds.length; i++) {
    const attrKind = kinds[i];
    const attrValues = attributes[attrKind];

    const attrKindPlaceholder = placeholder;
    parameters.push(attrKind);
    placeholder++;

    for (let j = 0; j < attrValues.length; j++) {
      const subSelect = `
        SELECT document_id FROM $${attrTablePlaceholder}:name
        WHERE kind = $${attrKindPlaceholder} AND value = $${placeholder}
      `;
      parameters.push(attrValues[j]);
      placeholder++;

      subSelects.push(subSelect);
    }
  }

  return {query: subSelects.join(" INTERSECT "), parameters};
}

module.exports = {
  Storage,
  BEFORE,
  AFTER,
  RANDOM,
  LATEST,
};
