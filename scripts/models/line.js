class Line {
  constructor(timestamp, speaker, text) {
    this.timestamp = timestamp;
    this.speaker = speaker;
    this.text = text;
  }

  isRaw() {
    return this.speaker === undefined || this.speaker === null;
  }

  toString() {
    if (this.isRaw()) {
      return this.text;
    }

    return `${this.speaker}: ${this.text}`;
  }
}

module.exports = Line;
