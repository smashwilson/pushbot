const moment = require('moment-timezone')
const uuid = require('uuid/v1')

class Line {
  constructor (timestamp, speaker, text, id = null) {
    this.timestamp = timestamp
    this.speaker = speaker
    this.text = text

    this.id = id || uuid()
  }

  static deserialize (object) {
    return new Line(
      moment.unix(object.timestamp).tz('America/New_York'),
      object.speaker,
      object.text,
      object.id
    )
  }

  isRaw () {
    return this.speaker === undefined || this.speaker === null
  }

  toString () {
    if (this.isRaw()) {
      return this.text
    }

    return `${this.speaker}: ${this.text}`
  }

  serialize () {
    return {
      id: this.id,
      timestamp: this.timestamp.unix(),
      speaker: this.speaker,
      text: this.text
    }
  }
}

module.exports = Line
