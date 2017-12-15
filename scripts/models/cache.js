// Cache recently spoken lines within a given channel. Persist the cache
// within the brain.

const moment = require('moment-timezone')
const Line = require('./line')

const MAX_CACHE_SIZE = 200
const CACHES = new Map()

class Cache {
  static known (robot) {
    return robot.brain.get('buffer-cache-known') || []
  }

  static remember (robot, channel) {
    const existing = Cache.known(robot)
    if (!existing.includes(channel)) {
      robot.brain.set('buffer-cache-known', existing.concat([channel]))
    }
  }

  static storageForChannel (robot, channel) {
    return robot.brain.get(`buffer-cache:${channel}`)
  }

  constructor (robot, channel) {
    this.robot = robot
    this.channel = channel

    const serialized = Cache.storageForChannel(this.robot, this.channel)
    if (serialized === null) {
      this.lines = []
    } else {
      this.lines = serialized.map(each => Line.deserialize(each))
    }

    Cache.remember(this.robot, this.channel)
  }

  append (msg, ts = undefined) {
    const now = ts || moment.tz('America/New_York')
    const isAction = msg.message.subtype === 'me_message'
    const toAdd = msg.message.text.split(/\n/).map(sourceLine => {
      return new Line(
        now,
        msg.message.user.name,
        isAction ? `_${sourceLine}_` : sourceLine
      )
    })
    toAdd.reverse()

    this.lines.unshift(...toAdd)
    this.lines = this.lines.slice(0, MAX_CACHE_SIZE)

    const serialized = this.lines.map(line => line.serialize())
    this.robot.brain.set(`buffer-cache:${this.channel}`, serialized)
    return this
  }

  mostRecent () {
    return this.lines[0]
  }

  earliest () {
    return this.lines.slice(-1)[0]
  }

  mostRecentMatch (pattern) {
    return this.lines.find(line => pattern.matches(line))
  }

  between (startPattern, endPattern) {
    const results = []
    let inMatch = false

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i]

      if (inMatch) {
        results.push(line)
        if (startPattern.matches(line)) {
          inMatch = false
          break
        }
      } else if (endPattern.matches(line)) {
        results.push(line)
        inMatch = true
      }
    }

    if (inMatch || results.length === 0) {
      return undefined
    }

    results.reverse()
    return results
  }
}

function prepopulate (robot) {
  if (CACHES.size !== 0) return

  // Pre-populate known channels.
  for (const former of Cache.known(robot)) {
    const resurrected = new Cache(robot, former)
    CACHES.set(former, resurrected)
  }
}

function cacheForChannel (robot, channel, create = true) {
  prepopulate(robot)

  const existing = CACHES.get(channel)
  if (existing) {
    return existing
  }

  if (!create && !Cache.storageForChannel(robot, channel)) {
    return null
  }

  const created = new Cache(robot, channel)
  CACHES.set(channel, created)
  return created
}

function clear () {
  CACHES.clear()
}

function known (robot) {
  prepopulate(robot)

  return Array.from(CACHES.keys())
}

exports.MAX_SIZE = MAX_CACHE_SIZE
exports.forChannel = cacheForChannel
exports.clear = clear
exports.known = known
