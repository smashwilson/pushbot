// Description:
//   Translate text to and from morse code.
//
// Commands:
//   hubot morse <input> - Convert <input> to morse code.
//   hubot demorse <code> - Covert morse code to text.

const morse = require("morse");

module.exports = function(robot) {
  robot.respond(/morse\s*([^]*)/i, function(msg) {
    const message = robot.mostRecentText(msg);
    if (!message) {
      msg.reply("No text to encode.");
      return;
    }

    msg.send(morse.encode(message));
  });

  return robot.respond(/demorse\s*([^]*)/i, function(msg) {
    const message = robot.mostRecentText(msg);
    if (!message) {
      msg.reply("No text to decode.");
      return;
    }

    return msg.send(morse.decode(message.trim()));
  });
};
