// Accept text as-is from a command's input. Derive no speaker metadata.

const createMentionDetector = require('./mentions')
const Line = require('../../models/line')

module.exports = function (robot, text) {
  const mentions = createMentionDetector(robot).scan(text)
  const lines = text.split(/\r?\n/).map(body => new Line(null, null, body))

  return { lines, speakers: [], mentions }
}
