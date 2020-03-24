// Description:
//   Look up words in the dictionary.
//
// Commands:
//   hubot urbandefine <word> - Look up a word on urban dictionary.
//   hubot define <word> - Look up a word on Merriam-Webster's online dictionary.

const {URL} = require("url");
const cheerio = require("cheerio");
const fetch = require("node-fetch");

const scrub = function (txt) {
  txt = txt.replace(/^[ \t\n]+/, "");
  txt = txt.replace(/[ \t\n]+$/, "");
  return txt;
};

module.exports = function (robot) {
  robot.respond(/define +([^]+)/i, async function (res) {
    const term = encodeURIComponent(res.match[1]);

    try {
      const response = await fetch(
        `http://www.merriam-webster.com/dictionary/${term}`
      );
      const body = await response.text();
      if (!response.ok) {
        res.send(
          `Merriam Webster hates us right now:\n${resp.status}: ${resp.statusText}` +
            "\n```\n" +
            body +
            "\n```\n"
        );
      } else {
        const $ = cheerio.load(body);

        $(".sense .dtText").each((i, element) => {
          if (i > 5) {
            return false;
          }

          const definitionText = [];
          $(element)[0].children.forEach((child) => {
            if (child.type === "text") {
              definitionText.push(scrub(child.data));
            } else if ($(child).is("a") || $(child).is("strong")) {
              definitionText.push(scrub($(child).text()));
            }
          });

          res.send(`> ${definitionText.join(" ")}`);
        });
      }
    } catch (err) {
      res.send(
        ":boom: THE INTERNET IS BROKEN file a ticket" +
          "\n```\n" +
          err.stack +
          "\n```\n`"
      );
    }
  });

  robot.respond(/urbandefine +([^]+)/i, async function (res) {
    const u = new URL("http://www.urbandictionary.com/define.php");
    u.searchParams.set("term", res.match[1]);

    try {
      const response = await fetch(u.href);
      const body = await response.text();
      if (!response.ok) {
        res.send(
          `Urban Dictionary hates us right now:\n${resp.status}: ${resp.statusText}` +
            "\n```\n" +
            body +
            "\n```\n"
        );
      } else {
        const $ = cheerio.load(body);

        const definition = scrub($(".meaning").eq(0).text());
        res.send(`> ${definition}`);
      }
    } catch (err) {
      res.send(
        ":boom: THE INTERNET IS BROKEN file a ticket" +
          "\n```\n" +
          err.stack +
          "\n```\n`"
      );
    }
  });
};
