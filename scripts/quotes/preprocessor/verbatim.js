// Accept text as-is from a command's input. Derive no speaker metadata.

const createMentionDetector = require('./mentions');

module.exports = function(robot, text) {
  const mentions = createMentionDetector(robot).scan(text);
  const attributes = Array.from(mentions, value => ({kind: 'mention', value}));

  return {body: text, attributes};
};
