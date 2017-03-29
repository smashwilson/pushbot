// Description:
//   Say it with an octocat.
// Commands:
//   hubot octosay <text> - Makes Mona Lisa say <text>

const request = require('request');

module.exports = function(robot) {
  robot.respond(/octosay( me)?\s*([^]*)/i, msg => {
    const message = msg.match[2].trim().length > 0 ? msg.match[2] : robot.mostRecent(msg);

    request({
      uri: 'https://api.github.com/octocat',
      qs: {s: message},
      headers: {
        'User-Agent': 'smashwilson/pushbot request/2.79.0',
      },
    }, (err, response, body) => {
      if (err) {
        msg.reply(":boom:\n```\n" + err.stack + "\n```\n");
        return;
      }

      msg.send("\n```\n" + body + "\n```\n");
    });
  });
}
