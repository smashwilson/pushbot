// Description:
//   Manipulate a line buffer to stage, manipulate, then act on a selection from cached room
//   history, a la the git index.
//
// Commands:
//   hubot buffer help - Show detailed help for buffer manipulation subcommands.
//   hubot buffer add [#channel] [pattern]... - Introduce new lines to the buffer from the history cache.
//   hubot buffer addraw [text] - Add raw text directly to the buffer.
//   hubot buffer remove [numbers] - Remove one or more lines from the buffer by index.
//   hubot buffer replace [number] [text] - Replace a line from your buffer with new contents.
//   hubot buffer show - Show the current contents of your buffer, annotated with indices.
//   hubot buffer clear - Empty your buffer.

const Pattern = require("./models/pattern");
const Cache = require("./models/cache");
const Buffer = require("./models/buffer");

function isDirectMessage(msg) {
  return msg.envelope.room[0] === "D";
}

module.exports = function (robot) {
  function showIfDirect(msg, buffer) {
    if (isDirectMessage(msg)) {
      msg.send(buffer.show());
    }
  }

  function plural(name, array) {
    const s = array.length !== 1 ? "s" : "";
    return `${array.length} ${name}${s}`;
  }

  robot.cacheForChannel = (channel) => Cache.forChannel(robot, channel);
  robot.bufferForUserId = (userId) => Buffer.forUser(robot, userId);
  robot.mostRecent = (msg) => {
    return robot.cacheForChannel(robot, msg.message.room).mostRecent();
  };
  robot.mostRecentText = (msg) => {
    const payload = robot.mostRecent(msg);
    return !payload ? null : payload.text;
  };

  // Accumulate messages into the appropriate cache for each channel.
  robot.catchAll((msg) => {
    if (!msg.message.text || !msg.envelope.room) {
      return;
    }

    robot.cacheForChannel(msg.envelope.room).append(msg);
  });

  robot.respond(/buffer\s+help/i, (msg) => {
    if (!isDirectMessage(msg)) {
      msg.reply("It's a lot of text. Ask me in a DM!");
      return;
    }

    msg.send(
      'The "buffer" commands allow you to stage and manipulate lines of text, often taken' +
        "from the history of a channel, to prepare them for use as input to a different command." +
        "Everyone has their own buffer.\n" +
        "\n" +
        "To add content to your buffer, specify one or more _patterns_ or _ranges of patterns_:\n" +
        "\n" +
        '`buffer add "foo"` adds the most recently uttered line of text in the current room' +
        'that contains the exact string "foo".\n' +
        "`buffer add /hooray/` adds the most recently uttered line of text in the current room" +
        "that matches the regular expression /hooray/.\n" +
        "`buffer add /start/ ... /finish/` adds all of the lines of text between the ones that match" +
        "the patterns /start/ and /finish/, inclusively.\n" +
        '`buffer add #codecodecode "foo" ... "bar"` adds all lines between the ones that contain' +
        '"foo" and "bar" in the room #codecodecode, wherever it\'s run.\n' +
        '`buffer add "aaa" "bbb" "ccc" ... "ddd"` adds the line that contains "aaa", the line' +
        'that contains "bbb", and all of the lines between the ones that contain "ccc" and "ddd".\n' +
        "\n" +
        "Once you have lines within your buffer, you can use other buffer commands to `add` more lines," +
        "`remove` existing lines by index, or `clear` it entirely and start over from scratch. " +
        "`buffer show` will always tell you what your current buffer state is, including the" +
        "index of each line."
    );
  });

  robot.respond(/buffer\s+add (#\S+)?([^]*)/i, (msg) => {
    const channelName = msg.match[1] || msg.message.room;
    try {
      const patterns = Pattern.parse(msg.match[2]);
      const cache = robot.cacheForChannel(channelName);
      const buffer = robot.bufferForUserId(msg.message.user.id);

      const lines = [];
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const matches = pattern.matchesIn(cache);
        if (matches.length === 0) {
          const earliest = cache.earliest();
          const message = earliest
            ? `The earliest line I have is "${earliest}".`
            : "I haven't cached any lines yet.";

          msg.reply(
            `No lines were matched by the pattern ${pattern}.\n${message}`
          );
          return;
        } else {
          lines.push(...matches);
        }
      }

      buffer.append(lines);
      msg.reply(`Added ${plural("line", lines)} to your buffer.`);
      showIfDirect(msg, buffer);
    } catch (e) {
      msg.reply(
        `:no_entry_sign: ${e.message}\n` +
          `Call \`/dm ${robot.name} buffer help\` for a pattern syntax refresher.`
      );
    }
  });

  robot.respond(/buffer\s+remove\s*([\d\s\r\n,]+)/i, (msg) => {
    const buffer = robot.bufferForUserId(msg.message.user.id);
    const indices = msg.match[1]
      .match(/\d+/g)
      .map((digits) => parseInt(digits, 10));

    const invalid = indices.filter((index) => !buffer.isValidIndex(index));
    if (invalid.length === 1) {
      msg.reply(`:no_entry_sign: ${invalid[0]} is not a valid buffer index.`);
      return;
    }
    if (invalid.length > 1) {
      msg.reply(
        `:no_entry_sign: ${invalid.join(", ")} are not valid buffer indices.`
      );
      return;
    }

    indices.sort();
    indices.reverse();

    for (let i = 0; i < indices.length; i++) {
      buffer.remove(indices[i]);
    }

    const suffix = indices.length === 1 ? "y" : "ies";
    msg.reply(`Removed ${indices.length} buffer entr${suffix}.`);
    showIfDirect(msg, buffer);
  });

  robot.respond(/buffer\s+show/i, (msg) => {
    const buffer = robot.bufferForUserId(msg.message.user.id);
    msg.send(buffer.show());
  });

  robot.respond(/buffer\s+clear/i, (msg) => {
    const buffer = robot.bufferForUserId(msg.message.user.id);
    buffer.clear();
    msg.reply("Buffer forgotten.");
  });
};
