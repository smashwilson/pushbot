// Accept the current contents of the user's buffer.

const createMentionDetector = require('./mentions')

function fromLines (robot, lines) {
  const detector = createMentionDetector(robot)

  const result = []
  const speakers = new Set()
  const mentions = new Set()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    for (const mention of detector.scan(line.text)) {
      mentions.add(mention)
    }

    if (!line.isRaw()) {
      speakers.add(line.speaker)
    }

    result.push(line)
  }

  return { lines: result, speakers, mentions }
}

function preprocess (robot, msg) {
  const buffer = robot.bufferForUserId(msg.message.user.id)
  const lines = buffer.commit()

  return fromLines(robot, lines)
}

preprocess.fromLines = fromLines
module.exports = preprocess
