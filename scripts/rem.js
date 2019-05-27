// Description:
//   Remember and forget arbitrary strings.
//
// Commands:
//   hubot rem key = value - Store a new key-value pair.
//   hubot rem key - Recall a previously stored key.
//   hubot remsearch key - List all known keys containing a case-insensitive substring.
//   hubot forget key - Forget a previously stored key.

module.exports = function(robot) {
  robot.rem = {
    get(key) {
      return robot.brain.get(`rem:${key}`);
    },

    set(key, value) {
      robot.brain.set(`rem:${key}`, value);
    },

    unset(key) {
      robot.brain.remove(`rem:${key}`);
    },

    search(query) {
      let matches = [];
      for (const key in robot.brain.data._private) {
        if (
          key.startsWith("rem:") &&
          (!query || key.toLowerCase().includes(query, 4))
        ) {
          matches.push(key.substring(4));
        }
      }
      return matches;
    },
  };

  robot.respond(/rem(?:ember)?\s+([^=]+)(?:=([^]+))?/, function(msg) {
    const key = msg.match[1].trim();
    if (msg.match[2]) {
      const value = msg.match[2].trim();

      robot.rem.set(key, value);
      msg.reply(`:ok_hand: I've learned "${key}".`);
    } else {
      const value = robot.rem.get(key);
      if (value) {
        msg.send(value);
      } else {
        msg.send(`${key}? Never heard of it.`);
      }
    }
  });

  robot.respond(/remsearch(?:\s+([^]*))?/, function(msg) {
    const pattern = (msg.match[1] || "").trim().toLowerCase();

    let matches = robot.rem.search(pattern);
    matches.sort((a, b) => -1 + Math.random() * 2);
    matches = matches.slice(0, 10);

    if (matches.length === 0) {
      msg.send(`No keys match "${pattern}".`);
      return;
    } else if (matches.length === 1) {
      value = robot.rem.get(matches[0]);
      msg.send(value);
      return;
    }

    msg.send(matches.map(m => `> ${m}\n`).join(""));
  });

  robot.respond(/forget([^]+)/, function(msg) {
    const key = msg.match[1].trim();
    robot.rem.unset(`rem:${key}`);
    msg.reply(`:dusty_stick: "${key}" has been forgotten.`);
  });
};
