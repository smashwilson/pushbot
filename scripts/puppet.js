// Description:
//   Puppet lets administrators speak through the bot.
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:

module.exports = function (robot) {
  robot.respond(/puppet(?:\s+#(\S+))?\s+([^]+)/i, function (msg) {
    if (!robot.auth.hasRole(msg.message.user, "knober whisperer")) {
      return;
    }

    const room = msg.match[1] || "general";
    return robot.messageRoom(`#${room}`, msg.match[2]);
  });
};
