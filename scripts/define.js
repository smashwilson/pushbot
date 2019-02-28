// Description:
//   Look up words in the dictionary.
//
// Commands:
//   hubot urbandefine <word> - Look up a word on urban dictionary.
//   hubot define <word> - Look up a word on Merriam-Webster's online dictionary.

const cheerio = require("cheerio");
const request = require("request");

const scrub = function(txt) {
  txt = txt.replace(/^[ \t\n]+/, "");
  txt = txt.replace(/[ \t\n]+$/, "");
  return txt;
};

module.exports = function(robot) {
  robot.respond(/define +([^]+)/i, function(res) {
    const term = encodeURIComponent(res.match[1]);

    return request(
      `http://www.merriam-webster.com/dictionary/${term}`,
      function(err, resp, body) {
        if (err) {
          res.send(`THE INTERNET IS BROKEN file a ticket ${err}`);
          return;
        }

        if (resp.statusCode !== 200) {
          res.send(`Merriam Webster hates us right now: ${resp.statusCode}`);
          return;
        }

        const $ = cheerio.load(body);

        $(".definition-inner-item.with-sense").each(function(i, element) {
          if (i <= 5) {
            const txt = scrub($(element).text());
            res.send(`> ${txt}`);
          }
        });
      }
    );
  });

  robot.respond(/urbandefine +([^]+)/i, function(res) {
    const opts = {
      url: "http://www.urbandictionary.com/define.php",
      qs: {
        term: res.match[1],
      },
    };

    return request(opts, function(err, resp, body) {
      if (err) {
        res.send(`THE INTERNET IS BROKEN file a ticket ${err}`);
        return;
      }

      if (resp.statusCode !== 200) {
        res.send(`Urban Dictionary hates us right now: ${resp.statusCode}`);
        return;
      }

      const $ = cheerio.load(body);

      const definition = scrub(
        $(".meaning")
          .eq(0)
          .text()
      );
      res.send(`> ${definition}`);

      const example = scrub(
        $(".example")
          .eq(0)
          .text()
      );
      res.send(`"_${example}_"`);
    });
  });
};
