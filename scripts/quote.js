// Description:
//   Quotefile central dispatch.

const {createDocumentSet} = require("./documentset");
const {Admin, QuotePontiff, PoetLaureate} = require("./roles");
const formatter = require("./documentset/formatter");

module.exports = function(robot) {
  if (!robot.postgres) {
    return;
  }

  // !quote and friends
  createDocumentSet(robot, "quote", {
    add: {role: QuotePontiff},
    query: true,
    count: true,
    stats: true,
    by: true,
    about: true,
    kov: true,

    nullBody: "That wasn't notable enough to quote. Try harder.",
  });

  // !lim
  createDocumentSet(robot, "lim", {
    add: {
      role: PoetLaureate,
      formatter: formatter.lim,
    },
    query: true,
    count: true,
    by: true,
    kov: true,

    nullBody: "No limericks found.",
  });

  // !title
  createDocumentSet(robot, "title", {
    set: {
      roleForSelf: Admin,
      userOriented: true,
      helpText: [
        "hubot settitle <user>: <title> - Set anyone's title but your own.",
      ],
    },
    query: {
      userOriented: true,
      latest: true,
      helpText: [
        "hubot title - See what the #~s hive mind has decided you are.",
        "hubot title @<user> - See what the #~s hive mind has designated <user>.",
      ],
    },
    all: {
      userOriented: true,
    },
    nullBody: "No title yet. Care to set it?",
  });
};
