// Description:
//   Cowsay with code fencing to prevent overly clever text formatters from mangling bovine speeches.
// Commands:
//   hubot cowsay <text> - Makes a cow say <text>

module.exports = function(robot) {
  robot.respond(/cowsay( me)?\s*([^]*)/i, function(msg) {
    let message = "";
    if (msg.match[2].trim().length > 0) {
      message = msg.match[2];
    } else {
      const m = robot.mostRecent(msg);
      if (m) {
        message = m.text;
      } else {
        return;
      }
    }

    msg
      .http("http://cowsay.morecode.org/say")
      .query({format: "text", message})
      .get()((err, _res, body) => {
      if (err) {
        msg.reply(`\`\`\`${err}\n\`\`\``);
      } else {
        msg.send(`\`\`\`${body}\n\`\`\``);
      }
    });
  });
};
