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

function responseFrom (document) {
  if (!document) {
    return {found: false, text: 'Not found'}
  }

  return {
    found: document.wasFound(),
    text: document.getBody()
  }
}

class DocumentSetResolver {
  constructor (name, set) {
    this.name = name
    this.set = set
    this.statsPromise = null
  }

  async random ({criteria}) {
    return responseFrom(
      await this.set.randomMatching(attributesFrom(criteria), criteria.query || '')
    )
  }

  mine (args, req) {
    return this.random({criteria: {subject: req.user.name}})
  }

  async rank (speaker) {
    if (!this.statsPromise) {
      this.statsPromise = this.set.getUserStats(['speaker'])
    }
    const stats = await this.statsPromise
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
