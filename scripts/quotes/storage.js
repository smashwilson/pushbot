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
    }).then(attrRows => {
      for (let i = 0; i < attrRows.length; i++) {
        const original = attributes[i];
        const row = attrRows[i];
        const full = Object.assign({}, row, original);

        docResult.attributes.push(full);
      }
    }).then(() => docResult);
  }

  randomDocumentMatching(documentSet, attributes, query) {
    const documentTableName = documentSet.documentTableName();
    const attributeTableName = documentSet.attributeTableName();

    let first = Promise.resolve(null);
    if (attributes.length > 0) {
      const attr = attributeQuery(attributes, 1, 2);
      const parameters = [values.attributeTableName, ...attr.parameters];

      first = this.db.any(attr.query, parameters);
    }

    return first.then(ids => {
      const parameters = [
        documentTableName,
        queryParser(query)
      ];

      let scopeClause = '';

      if (ids !== null) {
        if (ids.length === 0) {
          return null;
        } else if (ids.length === 1) {
          scopeClause = 'AND id = $3';
          parameters.push(ids[0]);
        } else if (ids.length > 1) {
          const idList = ids.map((id, index) => `$${3 + index}`).join(', ');
          scopeClause = `AND id IN (${idList})`;
          parameters.push(...ids);
        }
      }

      return this.db.oneOrNone(`
          SELECT id, created, updated, submitter, body
          FROM $1:name
          WHERE body ~* $2
          ${scopeClause}
          ORDER BY RANDOM()
          LIMIT 1
        `, parameters);
    });
  }

  countDocumentsMatching(documentSet, attributes, query) {
    const documentTableName = documentSet.documentTableName();
    const attributeTableName = documentSet.attributeTableName();

    if (attributes.length > 0 && query === '') {
      // Only attributes
      const attr = attributeQuery(attributes, 1, 2);
      const query = `SELECT COUNT(*) AS count FROM (${attr.query}) AS attrs`;
      const parameters = [attributeTableName, ...attr.parameters];

      return this.db.one(query, parameters);
    } else if (attributes.length > 0 && query !== '') {
      // Attributes and query
      const attr = attributeQuery(attributes, 3, 4);
      const query = `
        SELECT COUNT(*) AS count FROM $1:name WHERE
        body ~* $2 AND
        id IN (${attr.query})
      `;
      const parameters = [documentTableName, queryParser(query), attributeTableName, ...attr.parameters];

      return this.db.one(query, parameters);
    } else if (attributes.length === 0 && query === '') {
      // No attributes, no query
      return this.db.one('SELECT COUNT(*) AS count FROM $1:name', [documentTableName]);
    } else if (attributes.length === 0 && query !== '') {
      // No attributes, query
      const query = 'SELECT COUNT(*) AS count FROM $1:name WHERE body ~* $2';
      const parameters = [documentTableName, queryParser(query)];

      return this.db.one(query, parameters);
    }
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

function attributeQuery(attributes, attrTablePlaceholder, placeholderBase) {
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
