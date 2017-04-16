// Model classes for quotefile entries

// A queryable collection of related documents.
class DocumentSet {
  constructor(storage, name, nullBody) {
    this.storage = storage;
    this.name = name;

    this.nullDocument = new NullDocument(nullBody);

    this.connected = this.storage.connectDocumentSet(this);
  }

  add(submitter, body, attributes) {
    return this.connected
    .then(() => this.storage.insertDocument(this, submitter, body, attributes))
    .then(result => new Document(this, result));
  }

  randomMatching(attributes, query) {
    return this.connected
    .then(() => this.storage.randomDocumentMatching(this, attributes, query))
    .then(row => {
      if (!row) {
        return this.nullDocument;
      }

      return new Document(this, row);
    });
  }

  countMatching(attributes, query) {
    return this.connected
    .then(() => this.storage.countDocumentsMatching(this, attributes, query))
    .then(row => parseInt(row.count));
  }

  deleteMatching(attributes) {
    return this.connected
    .then(() => this.storage.deleteDocumentsMatching(this, attributes));
  }

  destroy() {
    return this.connected
    .then(() => this.storage.destroyDocumentSet(this));
  }

  whenConnected() {
    return this.connected;
  }

  documentTableName() {
    return `${this.name}_documents`;
  }

  attributeTableName() {
    return `${this.name}_attributes`;
  }
}

// An individual document contained within a DocumentSet.
class Document {
  constructor(set, result) {
    this.set = set;

    this.id = result.id;
    this.created = result.created;
    this.updated = result.updated;
    this.submitter = result.submitter;
    this.body = result.body;

    this.attributes = (result.attributes || []).map(row => new Attribute(this, row));
  }

  getBody() {
    return this.body;
  }
}

// A Document to be returned from queries that return no results.
class NullDocument {
  constructor(body) {
    this.body = body;
  }

  getBody() {
    return this.body;
  }
}

// Queryable document metadata.
class Attribute {
  constructor(doc, result) {
    this.doc = doc;

    this.id = doc.id;
    this.kind = doc.kind;
    this.value = doc.value;
  }
}

exports.DocumentSet = DocumentSet;
