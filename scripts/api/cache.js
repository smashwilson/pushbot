const cache = require('../models/cache')
const UserSetResolver = require('./user-set')

const NullDataStore = {
  getChannelGroupOrDMById () {
    return null
  },

  getChannelByName () {
    return null
  }
}

function getDataStore (req) {
  const adapter = req.robot.adapter
  const client = adapter.client
  if (!client) return NullDataStore
  const rtm = client.rtm
  if (!rtm) return NullDataStore
  const dataStore = rtm.dataStore
  if (!dataStore) return NullDataStore
  return dataStore
}

class CacheResolver {
  knownChannels (options, req) {
    const dataStore = getDataStore(req)

    return cache.known().map(id => {
      const channel = dataStore.getChannelGroupOrDMById(id)
      return channel ? channel.name : id
    })
  }

  linesForChannel ({channel}, req) {
    const dataStore = getDataStore(req)

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

module.exports = CacheResolver
