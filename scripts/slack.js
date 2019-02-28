// Description:
//   Pipe-friendly functions to handle Slack message formatting.
//
// Commands:
//   hubot code - Surround input with a `fenced code block`
//   hubot blockquote - Nest input within a blockquote

module.exports = function(robot) {
  const inputFrom = function(msg) {
    const message =
      msg.match[1].trim().length > 0 ? msg.match[1] : robot.mostRecentText(msg);
    if (!message) {
      return "";
    }
    return message.replace(/^\s*/, "");
  };

  robot.respond(/code\s*([^]*)/i, msg => {
    msg.send(`\`\`\`\n${inputFrom(msg)}\n\`\`\``);
  });

  robot.respond(/blockquote\s*([^]*)/i, msg => {
    msg.send(
      inputFrom(msg)
        .split(/\n/)
        .map(line => `> ${line}`)
        .join("\n")
    );
  });
};
