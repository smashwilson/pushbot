const cache = require('../models/cache')
const {UserSetResolver} = require('./user-set')
const {getDataStore} = require('../helpers')

class CacheResolver {
  knownChannels (options, req) {
    const dataStore = getDataStore(req.robot)

    return cache.known().map(id => {
      const channel = dataStore.getChannelGroupOrDMById(id)
      return channel ? channel.name : id
    })
  }

  linesForChannel ({channel}, req) {
    const dataStore = getDataStore(req.robot)

    let existing = cache.forChannel(req.robot, channel, false)
    if (!existing) {
      const ch = dataStore.getChannelByName(channel)
      if (ch) {
        existing = cache.forChannel(req.robot, ch.id, false)
      }
    }

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
    }).filter(result => Boolean(result.speaker))
  }
}

module.exports = {CacheResolver}
