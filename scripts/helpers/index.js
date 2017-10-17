// Grab-bag of utility functions.

function atRandom (list) {
  const max = list.length - 1
  const index = Math.floor(Math.random() * (max + 1))
  return list[index]
}

const NullDataStore = {
  getChannelGroupOrDMById () {
    return null
  },

  getChannelByName () {
    return null
  }
}

function getDataStore (robot) {
  const adapter = robot.adapter
  const client = adapter.client
  if (!client) return NullDataStore
  const rtm = client.rtm
  if (!rtm) return NullDataStore
  const dataStore = rtm.dataStore
  if (!dataStore) return NullDataStore
  return dataStore
}

module.exports = {
  atRandom,
  getDataStore
}
