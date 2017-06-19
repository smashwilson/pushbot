function attributesFrom (criteria) {
  const attributes = {}
  if (criteria.subject) {
    attributes.subject = [criteria.subject]
  }
  if (criteria.speakers) {
    attributes.speaker = criteria.speakers
  }
  if (criteria.mentions) {
    attributes.mention = criteria.mentions
  }
  return attributes
}

function attrValuesWithKind (document, kind) {
  return document.getAttributes()
    .filter(attr => attr.kind === kind)
    .map(attr => attr.value)
}

class DocumentResolver {
  constructor (document) {
    this.document = document

    this.found = this.document.wasFound()
    this.text = this.document.getBody()
  }

  subject () {
    const subjects = attrValuesWithKind(this.document, 'subject')
    return subjects.length > 0 ? subjects[0] : null
  }

  speakers () {
    return attrValuesWithKind(this.document, 'speaker')
  }

  mentions () {
    return attrValuesWithKind(this.document, 'mention')
  }
}

class DocumentSetResolver {
  constructor (name, set) {
    this.name = name
    this.set = set
    this.statsPromise = null
  }

  async random ({criteria}) {
    return new DocumentResolver(
      await this.set.randomMatching(attributesFrom(criteria), criteria.query || '')
    )
  }

  async all ({criteria, first, after}) {
    const attributes = attributesFrom(criteria)
    const query = criteria.query || ''

    const [{hasPreviousPage, hasNextPage, documents}, count] = await Promise.all([
      this.set.allMatching(attributes, query, first, after),
      this.set.countMatching(attributes, query)
    ])

    const edges = documents.map(doc => {
      return {
        cursor: doc.id,
        node: new DocumentResolver(doc)
      }
    })

    return {
      edges,
      pageInfo: {count, hasPreviousPage, hasNextPage}
    }
  }

  mine (args, req) {
    return this.subject({subject: req.user.name})
  }

  async rank ({speaker}) {
    if (!this.statsPromise) {
      this.statsPromise = this.set.getUserStats(['speaker'])
    }
    const stats = (await this.statsPromise).getStats()
    const stat = stats.find(stat => stat.getUsername() === speaker)
    if (stat === undefined) {
      return 0
    } else {
      return stat.getRank()
    }
  }

  count ({criteria}) {
    return this.set.countMatching(attributesFrom(criteria), criteria.query || '')
  }
}

module.exports = DocumentSetResolver
