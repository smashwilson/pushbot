// Description:
//   D&D related commands.
//
// Commands:
//   hubot attr [@<username>] maxhp <amount> - Set your character's maximum HP
//   hubot attr [@<username>] dex <score> - Set your character's dexterity score
//   hubot hp [@<username>] - View your character's current HP
//   hubot hp [@<username>] <amount> - Set your character's HP to a fixed amount
//   hubot hp [@<username>] +/-<amount> - Add or remove HP from your character
//   hubot init clear - Reset all initiative counts. (DM only)
//   hubot init [@<username>] <score> - Set your character's initiative count
//   hubot init reroll [@<username>] <score> - Re-roll your initiative to break a tie.
//   hubot init next - Advance the initiative count and announce the next character
//   hubot init report - Show all initiative counts.
//   hubot character sheet [@<username>] - Summarize current character statistics
//   hubot character report - Summarize all character statistics

const _ = require("underscore");

const PUBLIC_CHANNEL = process.env.DND_PUBLIC_CHANNEL;

const DM_ROLE = "dungeon master";

const INITIATIVE_MAP_DEFAULT = {
  scores: [],
  current: null,
  unresolvedTies: {},
  rerolls: {},
};

const ATTRIBUTES = ["maxhp", "str", "dex", "con", "int", "wis", "cha"];

function modifier(score) {
  return Math.floor((score - 10) / 2);
}

function modifierStr(score) {
  const m = modifier(score);
  return m < 0 ? m.toString() : `+${m}`;
}

module.exports = function(robot) {
  function dmOnlyError(msg) {
    return [
      `You can't do that! You're not a *${DM_ROLE}*.`,
      `Ask an admin to run \`${robot.name} grant ${
        msg.message.user.name
      } the ${DM_ROLE} role\`.`,
    ].join("\n");
  }

  function dmOnly(msg, error = dmOnlyError(msg)) {
    if (robot.auth.hasRole(msg.message.user, DM_ROLE)) {
      return true;
    } else {
      msg.reply(error);
      return false;
    }
  }

  function isPublicChannel(msg) {
    if (PUBLIC_CHANNEL) {
      return msg.envelope.room === PUBLIC_CHANNEL;
    } else {
      return msg.envelope.room[0] !== "D";
    }
  }

  function pmOnlyFromDM(msg) {
    if (isPublicChannel(msg)) {
      return true;
    } else {
      const error = [`Only a *${DM_ROLE}* can do that here!`];
      if (PUBLIC_CHANNEL) {
        error.push(
          `Try that again in the <#${PUBLIC_CHANNEL}> channel instead.`
        );
      } else {
        error.push("Try that again in a public channel instead.");
      }
      return dmOnly(msg, error.join("\n"));
    }
  }

  function characterNameFrom(msg) {
    if (msg.match[1]) {
      // Explicit username. DM-only
      if (!dmOnly(msg) && msg.match[1] !== msg.message.user.name) {
        return null;
      }
      return msg.match[1];
    } else {
      return msg.message.user.name;
    }
  }

  function withCharacter(msg, callback) {
    const username = characterNameFrom(msg);
    if (!username) {
      return;
    }

    let existing = true;
    const characterMap = robot.brain.get("dnd:characterMap") || {};
    let character = characterMap[username];
    if (!character) {
      existing = false;
      character = {username};
    }

    callback(existing, character);
    characterMap[username] = character;

    robot.brain.set("dnd:characterMap", characterMap);
  }

  function resortInitiativeOrder(initiativeMap) {
    initiativeMap.unresolvedTies = {};
    const rerollTies = [];

    // Sort score array in decreasing initiative score.
    // Break ties by DEX scores.
    // If *those* are tied, demand rerolls until the tie is resolved.
    initiativeMap.scores.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      } else {
        const characterMap = robot.brain.get("dnd:characterMap") || {};
        const aCharacter = characterMap[a.username] || {dex: 0};
        const bCharacter = characterMap[b.username] || {dex: 0};

        const aDex = aCharacter.dex || 0;
        const bDex = bCharacter.dex || 0;

        if (aDex !== bDex) {
          return bDex - aDex;
        } else {
          const aReroll = initiativeMap.rerolls[a.username];
          const bReroll = initiativeMap.rerolls[b.username];

          if (aReroll && bReroll) {
            if (aReroll !== bReroll) {
              return bReroll - aReroll;
            } else {
              // Re-roll tie; wipe results and try again.
              delete initiativeMap.rerolls[a.username];
              delete initiativeMap.rerolls[b.username];

              rerollTies.push(a.username, b.username);

              let ties = initiativeMap.unresolvedTies[a.score] || [];
              if (!ties) {
                ties = [];
                initiativeMap.unresolvedTies[a.score] = ties;
              }
              ties.push(a.username, b.username);
              return 0;
            }
          } else {
            let ties = initiativeMap.unresolvedTies[a.score] || [];
            if (!ties) {
              ties = [];
              initiativeMap.unresolvedTies[a.score] = ties;
            }
            ties.push(a.username, b.username);
            return 0;
          }
        }
      }
    });

    // Remove duplicates from the unresolvedTies map.
    for (let score of Object.keys(initiativeMap.unresolvedTies)) {
      initiativeMap.unresolvedTies[score] = _.uniq(
        initiativeMap.unresolvedTies[score]
      );
    }

    // Return a de-duplicated rerollTies collection.
    return _.uniq(rerollTies);
  }

  function hasInitiativeTie(initiativeMap, username) {
    return Object.keys(initiativeMap.unresolvedTies).some(score =>
      initiativeMap[score].includes(username)
    );
  }

  function reportInitiativeTies(msg, initiativeMap) {
    if (Object.keys(initiativeMap.unresolvedTies).length === 0) {
      return true;
    }

    const lines = ["Unresolved initiative ties!"];
    for (let score in initiativeMap.unresolvedTies) {
      const usernames = initiativeMap.unresolvedTies[score];
      const atMentions = [];
      for (let u of usernames) {
        atMentions.push(initiativeMap.rerolls[u] ? `_@${u}_` : `@${u}`);
      }
      lines.push(`Tied at ${score}: ${atMentions.join(", ")}`);
    }
    lines.push(`Please call \`${robot.name} init reroll <score>\` to re-roll.`);
    msg.send(lines.join("\n"));
    return false;
  }

  robot.respond(/attr\s+(?:@(\S+)\s+)?(\w+)(?:\s+(\d+))?/i, function(msg) {
    const attrName = msg.match[2];
    let score = null;

    if (msg.match[3]) {
      if (!pmOnlyFromDM(msg)) {
        return;
      }
      score = parseInt(msg.match[3]);
    }

    if (ATTRIBUTES.indexOf(attrName) === -1) {
      msg.reply(
        [
          `${attrName} isn't a valid attribute name.`,
          `Known attributes include: ${ATTRIBUTES.join(" ")}`,
        ].join("\n")
      );
      return;
    }

    withCharacter(msg, (_existing, character) => {
      if (!score) {
        msg.send(
          `@${character.username}'s ${attrName} is ${character[attrName]}.`
        );
        return;
      }

      character[attrName] = score;

      if (attrName === "maxhp") {
        if (character.currenthp && character.currenthp > character.maxhp) {
          character.currenthp = character.maxhp;
        }
        if (character.currenthp == null) {
          character.currenthp = character.maxhp;
        }
      }

      msg.send(`@${character.username}'s ${attrName} is now ${score}.`);
    });
  });

  robot.respond(/hp(?:\s+@(\S+))?(?:\s+(\+|-)?\s*(\d+))?/i, function(msg) {
    let amount;
    const op = msg.match[2] || "=";
    const amountStr = msg.match[3];
    if (amountStr) {
      if (!pmOnlyFromDM(msg)) {
        return;
      }
      amount = parseInt(amountStr);
    }

    withCharacter(msg, (_existing, character) => {
      if (!character.maxhp) {
        msg.reply(
          [
            `@${character.username}'s maximum HP isn't set.`,
            `Please run \`@${robot.name}: attr maxhp <amount>\` first.`,
          ].join("\n")
        );
        return;
      }

      const inithp = character.currenthp || character.maxhp;

      // Query only
      if (!amount) {
        msg.send(
          `@${character.username}'s current HP is ${inithp} / ${
            character.maxhp
          }.`
        );
        return;
      }

      let finalhp = (() => {
        switch (op) {
          case "+":
            return inithp + amount;
          case "-":
            return inithp - amount;
          default:
            return amount;
        }
      })();

      if (finalhp > character.maxhp) {
        finalhp = character.maxhp;
      }
      character.currenthp = finalhp;

      const lines = [
        `@${character.username}'s HP: ${inithp} :point_right: ${finalhp} / ${
          character.maxhp
        }`,
      ];
      if (finalhp <= 0) {
        lines.push(`@${character.username} is KO'ed!`);
      }
      msg.send(lines.join("\n"));
    });
  });

  robot.respond(/init\s+clear/i, function(msg) {
    robot.brain.set("dnd:initiativeMap", INITIATIVE_MAP_DEFAULT);
    msg.reply("All initiative counts cleared.");
  });

  robot.respond(/init(?:\s+@(\S+))?\s+(-?\d+)/, function(msg) {
    if (!pmOnlyFromDM(msg)) {
      return;
    }
    const score = parseInt(msg.match[2]);

    const initiativeMap =
      robot.brain.get("dnd:initiativeMap") || INITIATIVE_MAP_DEFAULT;
    withCharacter(msg, (_existing, character) => {
      const existing = initiativeMap.scores.find(
        each => each.username === character.username
      );

      if (existing) {
        existing.score = score;
      } else {
        const created = {username: character.username, score};
        initiativeMap.scores.push(created);
      }

      resortInitiativeOrder(initiativeMap);
      const lines = [
        `@${character.username} will go at initiative count ${score}.`,
      ];
      if (hasInitiativeTie(initiativeMap, character.username)) {
        lines.push("It's a tie!");
      }
      msg.send(lines.join("\n"));
      robot.brain.set("dnd:initiativeMap", initiativeMap);
    });
  });

  robot.respond(/init\s+reroll(?:\s+@(\S+))?\s+(-?\d+)/i, function(msg) {
    const score = parseInt(msg.match[2]);

    const initiativeMap =
      robot.brain.get("dnd:initiativeMap") || INITIATIVE_MAP_DEFAULT;
    let username = null;
    withCharacter(msg, (_existing, character) => {
      username = character.username;
    });

    if (!hasInitiativeTie(initiativeMap, username)) {
      msg.reply("You're not currently in an initiative tie.");
      return;
    }

    initiativeMap.rerolls[username] = score;

    const rerollTies = resortInitiativeOrder(initiativeMap);
    const lines = ["Initiative re-roll recorded."];
    if (rerollTies.indexOf(username) > 0) {
      lines.push("Whoops, the re-roll is still tied!");
    } else if (Object.keys(initiativeMap.unresolvedTies).length > 0) {
      lines.push("Waiting for remaining re-rolls.");
    } else {
      lines.push(":crossed_swords: Ready to go :crossed_swords:");
    }
    msg.reply(lines.join("\n"));

    robot.brain.set("dnd:initiativeMap", initiativeMap);
  });

  robot.respond(/init\s+next/i, function(msg) {
    let nextCount;
    const initiativeMap =
      robot.brain.get("dnd:initiativeMap") || INITIATIVE_MAP_DEFAULT;

    if (!(initiativeMap.scores.length > 0)) {
      msg.reply("No known initiative scores.");
      return;
    }

    if (!reportInitiativeTies(msg, initiativeMap)) {
      return;
    }

    if (initiativeMap.current) {
      nextCount = initiativeMap.current + 1;
      if (nextCount >= initiativeMap.scores.length) {
        nextCount = 0;
      }
    } else {
      nextCount = 0;
    }

    const current = initiativeMap.scores[nextCount];
    initiativeMap.current = nextCount;
    msg.send(`@${current.username} is up. _(${current.score})_`);
  });

  robot.respond(/init\s+report/i, function(msg) {
    const initiativeMap =
      robot.brain.get("dnd:initiativeMap") || INITIATIVE_MAP_DEFAULT;

    if (initiativeMap.scores.length === 0) {
      msg.reply("No known initiative scores.");
      return;
    }

    if (!reportInitiativeTies(msg, initiativeMap)) {
      return;
    }

    const lines = [];
    let i = 0;
    for (let each of initiativeMap.scores) {
      const prefix =
        (initiativeMap.current || 0) === i
          ? ":black_square_button:"
          : ":black_square:";
      lines.push(`${prefix} _(${each.score})_ @${each.username}`);
      i++;
    }

    msg.send(lines.join("\n"));
  });

  robot.respond(/character sheet(?:\s+@(\S+))?/i, msg =>
    withCharacter(msg, (existing, character) => {
      if (!existing) {
        msg.reply(`No character data for ${character.username} yet.`);
        return;
      }

      const lines = [`*HP:* ${character.currenthp} / ${character.maxhp}`];

      for (let attrName of ["str", "dex", "con", "int", "wis", "cha"]) {
        var attrStr;
        const attrScore = character[attrName];
        if (attrScore != null) {
          attrStr = `${attrScore} (${modifierStr(attrScore)})`;
        } else {
          attrStr = "_unassigned_";
        }

        lines.push(`*${attrName.toUpperCase()}:* ${attrStr}`);
      }

      msg.send(lines.join("\n"));
    })
  );

  robot.respond(/character report/i, function(msg) {
    const characterMap = robot.brain.get("dnd:characterMap") || {};
    const lines = [];
    for (const username in characterMap) {
      const character = characterMap[username];
      lines.push(`*${username}*: HP ${character.currenthp}/${character.maxhp}`);
    }
    msg.send(lines.join("\n"));
  });
};
