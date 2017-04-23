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

  getUserStats(attributeKinds) {
    return this.connected
    .then(() => this.storage.attributeStats(this, attributeKinds))
    .then(rows => {
      const statsByUsername = new Map();
      for (const row of rows) {
        let stat = statsByUsername.get(row.value);
        if (stat === undefined) {
          stat = new UserStatistic(row.value);
          statsByUsername.set(row.value, stat);
        }

        const count = parseInt(row.count);
        stat.record(row.kind, count);
      }

      const builder = new UserStatisticTableBuilder();
      for (const stat of statsByUsername.values()) {
        builder.append(stat);
      }
      return builder.build();
    });
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

    this.id = result.id;
    this.kind = result.kind;
    this.value = result.value;
  }
}

const padded = (str, length) => str + ' '.repeat(Math.max(length - str.length, 0));

class UserStatistic {
  constructor(username) {
    this.username = username;
    this.spokenCount = 0;
    this.mentionCount = 0;
    this.rank = 0;
  }

  record(kind, count) {
    if (kind === 'speaker') {
      this.spokenCount = count;
    } else if (kind === 'mention') {
      this.mentionCount = count;
    }
  }

  getUsername(width = 0) {
    return padded(this.username, width);
  }

  getSpokenCount(width = 0) {
    return padded(this.spokenCount.toString(), width);
  }

  getMentionCount(width = 0) {
    return padded(this.mentionCount.toString(), width);
  }

  getRank() {
    return this.rank;
  }
}

class UserStatisticTableBuilder {
  constructor() {
    this.stats = [];

    this.longestUsername = 0;
    this.longestSpoken = 0;
    this.longestMention = 0;
  }

  append(stat) {
    this.stats.push(stat);

    if (stat.username.length > this.longestUsername) {
      this.longestUsername = stat.username.length;
    }

    if (stat.spokenCount.toString().length > this.longestSpoken) {
      this.longestSpoken = stat.spokenCount.toString().length;
    }

    if (stat.mentionCount.toString().length > this.longestMention) {
      this.longestMention = stat.mentionCount.toString().length;
    }
  }

  build() {
    this.stats.sort((a, b) => b.spokenCount - a.spokenCount);
    for (let i = 0; i < this.stats.length; i++) {
      this.stats[i].rank = i + 1;
    }

    return new UserStatisticTable(this.stats, this.longestUsername, this.longestSpoken, this.longestMention);
  }
}

class UserStatisticTable {
  constructor(stats, longestUsername, longestSpoken, longestMention) {
    this.stats = stats;

    this.longestUsername = longestUsername;
    this.longestSpoken = longestSpoken;
    this.longestMention = longestMention;
  }

  getStats() {
    return this.stats;
  }

  pad(header, length) {
    return padded(header, length);
  }
}

exports.DocumentSet = DocumentSet;
