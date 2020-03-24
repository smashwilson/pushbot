// Description:
//   Look up information on eternal cards
//
// Commands:
//   hubot etload <url> - (re)populate the brain with eternal data
//   hubot eternal <card> - look up card information
//
// Configuration:
//
// process.env.HUBOT_ETERNAL_LOOKUP - URL to look up the cards, replace on <card_name>

const fetch = require("node-fetch");

module.exports = function (robot) {
  robot.respond(/etload(?: (.*))?/i, async function (msg) {
    const uri = msg.match[1] || "https://www.eternaljson.com/eternal.json";
    try {
      const response = await fetch(uri);
      const json = await response.json();
      robot.brain.data.eternal = {};
      for (const card of json) {
        robot.brain.data.eternal[card.name.toLowerCase()] = card;
      }
      msg.send("Successfully loaded eternal cards into the brain.");
    } catch (err) {
      msg.send(`:boom:\n${err.stack || err}`);
    }
  });

  robot.respond(/eternal *(.+)/i, function (msg) {
    const name = msg.match[1].toLowerCase();
    const {eternal} = robot.brain.data;
    if (!eternal) {
      msg.send("Run `eternalload` first!");
      return;
    }

    let found = eternal[name];
    if (found) {
      found = [found];
    } else {
      // So much for the easy way, now we do it the stupid way
      found = [];
      for (const cardName of Object.keys(eternal)) {
        if (cardName.indexOf(name) !== -1) {
          found.push(eternal[cardName]);
        }
      }

      // If there's only one result, might as well make it official
      if (found.length === 1) {
        eternal[name] = found[0];
      }
    }

    if (found.length === 0) {
      msg.send("Can't find any cards by that name");
      return;
    }

    const lookup =
      process.env.HUBOT_ETERNAL_LOOKUP ||
      "https://s3.amazonaws.com/eternaldecks/cards/<card_name>.png";

    if (found.length <= 5) {
      for (const card of found) {
        const url = lookup.replace(
          "<card_name>",
          encodeURIComponent(card.name)
        );
        msg.send(url);
      }
    } else {
      msg.send(
        `There are too many cards which match that name (${found.length})`
      );
    }
  });
};
