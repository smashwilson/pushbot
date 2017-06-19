// Model classes for quotefile entries

// A queryable collection of related documents.
class DocumentSet {
  constructor (storage, name, nullBody) {
    this.storage = storage
    this.name = name

    this.nullDocument = new NullDocument(nullBody)

    this.connected = this.storage.connectDocumentSet(this)
  }

  async add (submitter, body, attributes) {
    await this.connected
    const result = await this.storage.insertDocument(this, submitter, body, attributes)
    return new Document(this, result)
  }

  async randomMatching (attributes, query) {
    await this.connected

    const row = await this.storage.randomDocumentMatching(this, attributes, query)
    if (!row) {
      return this.nullDocument
    }

    const doc = new Document(this, row)
    await doc.loadAttributes()
    return doc
  }

  async allMatching (attributes, query, first = null, cursor = null) {
    await this.connected

    const {
      hasPreviousPage, hasNextPage, rows
    } = await this.storage.allDocumentsMatching(this, attributes, query, first, cursor)

    const documents = rows.map(row => new Document(this, row))
    const byId = new Map(documents.map(doc => [doc.id, doc]))

    const attrRows = await this.storage.loadDocumentAttributes(this, documents)
    for (const row of attrRows) {
      const doc = byId.get(row.document_id)
      if (!doc) {
        continue
      }

      if (doc.attributes === null) {
        doc.attributes = []
      }

      doc.attributes.push(new Attribute(doc, row))
    }

    return {
      hasPreviousPage,
      hasNextPage,
      documents
    }
  }

  async countMatching (attributes, query) {
    await this.connected

    const row = await this.storage.countDocumentsMatching(this, attributes, query)
    return parseInt(row.count)
  }

  async getUserStats (attributeKinds) {
    await this.connected
    const rows = await this.storage.attributeStats(this, attributeKinds)

    const statsByUsername = new Map()
    for (const row of rows) {
      let stat = statsByUsername.get(row.value)
      if (stat === undefined) {
        stat = new UserStatistic(row.value)
        statsByUsername.set(row.value, stat)
      }

      const count = parseInt(row.count)
      stat.record(row.kind, count)
    }

    const builder = new UserStatisticTableBuilder()
    for (const stat of statsByUsername.values()) {
      builder.append(stat)
    }
    return builder.build()
  }

  async deleteMatching (attributes) {
    await this.connected
    return this.storage.deleteDocumentsMatching(this, attributes)
  }

  async destroy () {
    await this.connected
    return this.storage.destroyDocumentSet(this)
  }

  whenConnected () {
    return this.connected
  }

  documentTableName () {
    return `${this.name}_documents`
  }

  attributeTableName () {
    return `${this.name}_attributes`
  }
}

// An individual document contained within a DocumentSet.
class Document {
  constructor (set, result) {
    this.set = set

    this.id = result.id
    this.created = result.created
    this.updated = result.updated
    this.submitter = result.submitter
    this.body = result.body

    if (result.attributes) {
      this.attributes = result.attributes.map(row => new Attribute(this, row))
    } else {
      this.attributes = null
    }
  }

  getBody () {
    return this.body
  }

  getAttributes () {
    return this.attributes || []
  }

  wasFound () {
    return true
  }

  async loadAttributes () {
    if (this.attributes !== null) {
      return
    }

    const rows = await this.set.storage.loadDocumentAttributes(this.set, [this])
    this.attributes = rows.map(row => new Attribute(this, row))
  }
}

// A Document to be returned from queries that return no results.
class NullDocument {
  constructor (body) {
    this.body = body
    this.attributes = []
  }

  getBody () {
    return this.body
  }

  getAttributes () {
    return []
  }

  loadAttributes () {
    return Promise.resolve()
  }

  wasFound () {
    return false
  }
}

// Queryable document metadata.
class Attribute {
  constructor (doc, result) {
    this.doc = doc

    this.id = result.id
    this.kind = result.kind
    this.value = result.value
  }
}

const padded = (str, length) => str + ' '.repeat(Math.max(length - str.length, 0))

class UserStatistic {
  constructor (username) {
    this.username = username
    this.spokenCount = 0
    this.mentionCount = 0
    this.rank = 0
  }

  record (kind, count) {
    if (kind === 'speaker') {
      this.spokenCount = count
    } else if (kind === 'mention') {
      this.mentionCount = count
    }
  }

  getUsername (width = 0) {
    return padded(this.username, width)
  }

  getSpokenCount (width = 0) {
    return padded(this.spokenCount.toString(), width)
  }

  getMentionCount (width = 0) {
    return padded(this.mentionCount.toString(), width)
  }

  getRank () {
    return this.rank
  }
}

class UserStatisticTableBuilder {
  constructor () {
    this.stats = []

    this.longestUsername = 0
    this.longestSpoken = 0
    this.longestMention = 0
  }

  append (stat) {
    this.stats.push(stat)

    if (stat.username.length > this.longestUsername) {
      this.longestUsername = stat.username.length
    }

    if (stat.spokenCount.toString().length > this.longestSpoken) {
      this.longestSpoken = stat.spokenCount.toString().length
    }

    if (stat.mentionCount.toString().length > this.longestMention) {
      this.longestMention = stat.mentionCount.toString().length
    }
  }

  build () {
    this.stats.sort((a, b) => {
      if (a.spokenCount !== b.spokenCount) {
        return b.spokenCount - a.spokenCount
      } else {
        return b.mentionCount - a.mentionCount
      }
    })
    for (let i = 0; i < this.stats.length; i++) {
      this.stats[i].rank = i + 1
    }

    return new UserStatisticTable(this.stats, this.longestUsername, this.longestSpoken, this.longestMention)
  }
}

class UserStatisticTable {
  constructor (stats, longestUsername, longestSpoken, longestMention) {
    this.stats = stats

    this.longestUsername = longestUsername
    this.longestSpoken = longestSpoken
    this.longestMention = longestMention
  }

  getStats () {
    return this.stats
  }

  pad (header, length) {
    return padded(header, length)
  }
}

exports.DocumentSet = DocumentSet
