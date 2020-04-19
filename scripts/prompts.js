// Description:
//   Generate random writing prompts.
//
// Commands:
//   hubot prompt me <n> - Generate n writing prompts.

const fetch = require("node-fetch");

module.exports = function (robot) {
  robot.respond(/prompt\s+me(?:\s+(\d+))?/i, async function (msg) {
    const count = msg.match[1] || 1;

    let url = "http://itcamefromwritingprompts.com/api/generate";
    if (count > 1) {
      url += `/${count}`;
    }

    try {
      const res = await fetch(url);
      const body = await res.json();
      msg.send(body.generated.join("\n"));
    } catch (err) {
      msg.send(`Error: **${err}**\n${err.stack}`);
    }
  });
};
