// Accept the current contents of the user's buffer.

const moment = require('moment');
const createMentionDetector = require('./mentions');

module.exports = function (robot, msg) {
  const buffer = robot.bufferForUserName(msg.message.user.name);
  const detector = createMentionDetector(robot);
  const lines = buffer.commit();

  const processed = [];
  const speakers = new Set();
  const mentions = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const mention of detector.scan(line.text)) {
      mentions.add(mention);
    }

    if (line.isRaw()) {
      processed.push(line.text);
    } else {
      const ts = moment(line.timestamp).format('h:mm A D MMM YYYY');
      speakers.add(line.speaker);

      processed.push(`[${ts}] ${line.speaker}: ${line.text}`);
    }
  }

  const attributes = [];
  attributes.push(...Array.from(speakers, value => ({kind: 'speaker', value})));
  attributes.push(...Array.from(mentions, value => ({kind: 'mention', value})));

  return {body: processed.join('\n'), attributes};
};
