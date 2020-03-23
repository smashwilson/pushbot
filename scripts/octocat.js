// Description:
//   Say it with an octocat.
// Commands:
//   hubot octosay <text> - Makes Mona Lisa say <text>

const {URL} = require("url");
const fetch = require("node-fetch");

module.exports = function (robot) {
  robot.respond(/octosay( me)?\s*([^]*)/i, async (msg) => {
    const message =
      msg.match[2].trim().length > 0
        ? msg.match[2]
        : robot.mostRecent(msg).text;

    const u = new URL("https://api.github.com/octocat");
    u.searchParams.set("s", message);
    try {
      const response = await fetch(u.href, {
        headers: {
          "User-Agent": "smashwilson/pushbot node-fetch/1.0",
        },
      });

      const body = await response.text();

      if (!response.ok) {
        msg.reply(
          ":boom: Unsuccessful response from the GitHub API:\n" +
            `${response.status}: ${response.statusText}\n` +
            "\n```\n" +
            body +
            "\n```\n"
        );
      } else {
        msg.send("\n```\n" + body + "\n```\n");
      }
    } catch (err) {
      msg.reply(":boom:\n```\n" + err.stack + "\n```\n");
    }
  });
};
