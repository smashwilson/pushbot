// PostgreSQL-backed storage for various kinds of quotes.

const pg = require('pg-promise')();
const queryParser = require('./query');

class Storage {
  constructor(options) {
    if (options.db) {
      this.db = options.db;
    } else if (options.databaseUrl) {
      this.db = pg(databaseUrl);
    } else {
      throw new Error('Either db or databaseUrl must be provided');
    }

    this.columnSets = new Map();
  }

  connectDocumentSet(documentSet) {
    const values = {
      documentTable: documentSet.documentTableName(),
      attributeTable: documentSet.attributeTableName()
    };

    return this.db.none(`
      CREATE TABLE IF NOT EXISTS $<documentTable:name> (
        id SERIAL PRIMARY KEY,
        created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        submitter TEXT,
        body TEXT
      )
    `, values)
    .then(() => this.db.none(`
      CREATE TABLE IF NOT EXISTS $<attributeTable:name> (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES $<documentTable:name>
          ON DELETE CASCADE,
        kind TEXT NOT NULL,
        value TEXT
      )
    `, values))
    .then(() => {
      const columnSet = {
        attributeInsert: new pg.helpers.ColumnSet(
          ['document_id', 'kind', 'value'],
          {table: values.attributeTable}
        )
      };

      this.columnSets.set(documentSet, columnSet);
    });
  }

  insertDocument(documentSet, submitter, body, attributes) {
    const values = {
      documentTable: documentSet.documentTableName(),
      submitter,
      body
    };

    let docResult = null;

    return this.db.one(`
      INSERT INTO $<documentTable:name>
      (submitter, body)
      VALUES ($<submitter>, $<body>)
      RETURNING id, created, updated
    `, values)
    .then(row => {
      docResult = Object.assign({submitter, body, attributes: []}, row);
      if (attributes.length === 0) {
        return Promise.resolve([]);
      }

      const linkedAttributes = attributes
        .map(attribute => Object.assign({document_id: row.id}, attribute));

      const cs = this.columnSets.get(documentSet).attributeInsert;
      const query = pg.helpers.insert(linkedAttributes, cs) +
        'RETURNING id';

      return this.db.many(query);
    })
    .then(attrRows => {
      for (let i = 0; i < attrRows.length; i++) {
        const original = attributes[i];
        const row = attrRows[i];
        const full = Object.assign({}, row, original);

        docResult.attributes.push(full);
      }
    })
    .then(() => docResult);
  }

  randomDocumentMatching(documentSet, attributes, query) {
    const documentTableName = documentSet.documentTableName();
    const attributeTableName = documentSet.attributeTableName();

    const hasAttributes = Object.keys(attributes).length > 0;
    const hasQuery = /\s*\S/.test(query);

    let where = '';
    let queryClause = '';
    let separator = '';
    let attrClause = '';
    const parameters = [documentTableName, attributeTableName];

    if (hasQuery || hasAttributes) {
      where = 'WHERE';
    }

    if (hasQuery) {
      const {clause, parameters: queryParameters} = createQueryClause(query, 'body', parameters.length + 1);
      queryClause = clause;
      parameters.push(...queryParameters);
    }

    if (hasQuery && hasAttributes) {
      separator = 'AND';
    }

    if (hasAttributes) {
      const {query, parameters: attrParameters} = createAttributeQuery(attributes, 2, parameters.length + 1);
      attrClause = `id IN (${query})`;
      parameters.push(...attrParameters);
    }

    const sql = `
      SELECT id, created, updated, submitter, body
      FROM $1:name
      ${where} ${queryClause} ${separator} ${attrClause}
      ORDER BY RANDOM()
      LIMIT 1
    `;

    return this.db.oneOrNone(sql, parameters);
  }

  countDocumentsMatching(documentSet, attributes, query) {
    const documentTableName = documentSet.documentTableName();
    const attributeTableName = documentSet.attributeTableName();

    const hasAttributes = Object.keys(attributes).length > 0;
    const hasQuery = query.trim() !== '';

    // Avoid an unnecessary join for attribute-only queries
    if (!hasQuery && hasAttributes) {
      const {query, parameters: attrParameters} = createAttributeQuery(attributes, 1, 2);
      const sql = `SELECT COUNT(*) AS count FROM (${query}) AS attrs`;
      const parameters = [attributeTableName, ...attrParameters];

      return this.db.one(sql, parameters);
    }

    let where = '';
    let queryClause = '';
    let separator = '';
    let attrClause = '';
    const parameters = [documentTableName, attributeTableName];

    if (hasQuery || hasAttributes) {
      where = 'WHERE';
    }

    if (hasQuery) {
      const {clause, parameters: queryParameters} = createQueryClause(query, 'body', parameters.length + 1);
      queryClause = clause;
      parameters.push(...queryParameters);
    }

    if (hasQuery && hasAttributes) {
      separator = 'AND';
    }

    if (hasAttributes) {
      const {query, parameters: attrParameters} = createAttributeQuery(attributes, 2, parameters.length + 1);
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

  deleteDocumentsMatching(documentSet, attributes) {
    const documentTableName = documentSet.documentTableName();
    const attributeTableName = documentSet.attributeTableName();

    if (attributes.length === 0) {
      return this.destroyDocumentSet(documentSet);
    }

    const attr = createAttributeQuery(attributes, 2, 3);
    const query = `DELETE FROM $1:name WHERE id IN (${attr.query})`;
    const parameters = [documentTableName, attributeTableName, ...attr.parameters];

    return this.db.none(query, parameters);
  }

  destroyDocumentSet(documentSet) {
    const values = {
      documentTable: documentSet.documentTableName(),
      attributeTable: documentSet.attributeTableName()
    };

    return this.db.none('DROP TABLE IF EXISTS $<attributeTable:name>', values)
    .then(() => this.db.none('DROP TABLE IF EXISTS $<documentTable:name>', values))
    .then(() => this.columnSets.delete(documentSet));
  }
}

function createQueryClause(quoteSrc, fieldName, placeholderBase) {
  const terms = queryParser(quoteSrc);
  return {
    clause: terms
      .map((term, index) => `${fieldName} ~* $${placeholderBase + index}`)
      .join(' AND '),
    parameters: terms
  };
}

function createAttributeQuery(attributes, attrTablePlaceholder, placeholderBase) {
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

  return {query: subSelects.join(' INTERSECT '), parameters};
}

module.exports = Storage;
