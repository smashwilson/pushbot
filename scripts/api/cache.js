const cache = require('../models/cache')
const UserSetResolver = require('./user-set')

class CacheResolver {
  knownChannels () {
    return cache.known()
  }

  linesForChannel ({channel}, req) {
    const existing = cache.forChannel(req.robot, channel, false)
    if (!existing) {
      return null
    }

    const userSetResolver = new UserSetResolver()
    const lines = existing.lines.slice()
    lines.reverse()

    return lines.map(line => {
      return {
        id: line.id,
        speaker: userSetResolver.withName({name: line.speaker}, req),
        timestamp: line.timestamp.valueOf(),
        text: line.text
      }
    })
  }
}

module.exports = CacheResolver
