// Description:
//   Blood! Blood! Gullets! Gullets!
//
// Commands:
//   hubot pour blood down our gullets - Update the !blood list from the Obsidian Portal adventure log

const cheerio = require("cheerio");
const fetch = require("node-fetch");
const {Admin} = require("./roles");
const {createDocumentSet} = require("./documentset");

module.exports = function(robot) {
  if (!robot.postgres) {
    return;
  }

  // !blood and friends
  const bloodSet = createDocumentSet(robot, "blood", {
    query: true,
    count: true,
    kov: true,

    nullBody:
      "Blood Down the Gullet have not sung about anything that matches that query. Yet.",
  });

  robot.respond(/pour blood down our gullets/i, async msg => {
    if (!Admin.verify(robot, msg)) return;

    try {
      await bloodSet.truncate();

      const response = await fetch(
        "https://blood-down-the-gullet.obsidianportal.com/adventure-log"
      );
      const body = await response.text();
      if (!response.ok) {
        msg.reply(
          `I couldn't get to the page on Obsidian portal:\n${response.status}: ${response.statusText}\n\`\`\`\n${body}\n\`\`\`\n`
        );
        return;
      }
      const $ = cheerio.load(body);

      const tracks = [];
      $(".adventure-log-post .post-content").each((i, e) => {
        $(e)
          .find("p")
          .each((j, p) => {
            const pt = $(p).text();
            const rx = /[0-9]+\s*[.-]\s*["']?(.+)\n/gi;
            let m;
            while ((m = rx.exec(pt)) !== null) {
              tracks.push(m[1].replace(/["']$/, ""));
            }
          });

        $(e)
          .find("ol li")
          .each((j, li) => {
            tracks.push($(li).text());
          });
      });

      for (const track of tracks) {
        await bloodSet.add(msg.message.user.name, track, []);
        await new Promise((resolve, reject) => {
          robot.markov.modelNamed("bloodkov", model => {
            model.learn(track, err => {
              if (err) return reject(err);
              resolve();
            });
          });
        });
      }

      msg.reply(
        `:metal: Our gullets have accepted ${tracks.length} tracks. :metal:`
      );
    } catch (err) {
      msg.reply(
        `I couldn't get to the page on Obsidian portal:\n\`\`\`\n${err.stack}\n\`\`\`\n`
      );
    }
  });
};
