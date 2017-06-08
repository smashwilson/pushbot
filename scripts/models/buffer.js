// Per-user stash of Lines.

const Line = require('./line')

const BUFFERS = new Map()

class Buffer {
  constructor (robot, ownerId) {
    this.robot = robot
    this.ownerId = ownerId

    const serialized = this.robot.brain.get(`buffer:${this.ownerId}`)
    if (serialized) {
      this.contents = serialized.map(each => Line.deserialize(each))
    } else {
      this.contents = []
    }
  }

  isValidIndex (index) {
    return index >= 0 && index < this.contents.length
  }

  append (lines) {
    this.contents.push(...lines)
    this.save()
  }

  remove (index) {
    this.contents.splice(index, 1)
    this.save()
  }

  replace (index, newLines) {
    this.contents.splice(index, 1, ...newLines)
    this.save()
  }

  clear () {
    this.contents = []
    this.save()
  }

  show () {
    if (this.contents.length === 0) {
      return 'Your buffer is currently empty.'
    }

    return this.contents.map((line, i) => `_(${i})_ ${line}`).join('\n')
  }

  commit () {
    const prior = this.contents
    this.contents = []
    this.save()
    return prior
  }

  save () {
    const serialized = this.contents.map(line => line.serialize())
    this.robot.brain.set(`buffer:${this.ownerId}`, serialized)
  }
}

function forUser (robot, uid) {
  const existing = BUFFERS.get(uid)
  if (existing) {
    return existing
  }

  const created = new Buffer(robot, uid)
  BUFFERS.set(uid, created)
  return created
}

function clear () {
  BUFFERS.clear()
}

exports.forUser = forUser
exports.clear = clear
