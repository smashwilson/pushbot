// Accept text as-is from a command's input. Derive no speakers or about metadata.

module.exports = function(robot, msg) {
  return {
    body: msg.match[1],
    attributes: []
  };
};
