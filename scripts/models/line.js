const moment = require('moment-timezone')

class Line {
  constructor (timestamp, speaker, text) {
    this.timestamp = timestamp
    this.speaker = speaker
    this.text = text
  }

  static deserialize (object) {
    return new Line(
      moment.tz.unix(object.timestamp, 'America/New_York'),
      object.speaker,
      object.text
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
      timestamp: this.timestamp.unix(),
      speaker: this.speaker,
      text: this.text
    }
  }
}

module.exports = Line
