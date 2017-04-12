// Accept the current contents of the user's buffer.

const moment = require('moment');

module.exports = function (robot, msg) {
  const buffer = robot.bufferForUserName(msg.message.user.name);
  const lines = buffer.commit();

  const processed = [];
  const speakers = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.isRaw()) {
      processed.push(line.text);
    } else {
      const ts = moment(line.timestamp).format('h:mm A D MMM YYYY');

      speakers.add(line.speaker);
      processed.push(`[${ts}] ${line.speaker}: ${line.text}`);
    }
  }

  return {
    body: processed.join('\n'),
    attributes: Array.from(speakers, value => ({kind: 'speaker', value}))
  };
};
