// Description:
//   Quotefile central dispatch.

const {createDocumentSet} = require('./quotes');
const {Admin, QuotePontiff, PoetLaureate} = require('./roles');

module.exports = function(robot) {
  // !quote and friends
  createDocumentSet(robot, 'quote', {
    add: { role: QuotePontiff },
    query: true,
    count: true,
    stats: true,
    by: true,
    about: true,

    nullBody: "That wasn't notable enough to quote. Try harder."
  });

  // !lim
  createDocumentSet(robot, 'lim', {
    add: { role: PoetLaureate },
    query: true,
    count: true,
    by: true,

    nullBody: 'No limericks found.'
  });

  // !title
  createDocumentSet(robot, 'title', {
    set: {
      roleForSelf: Admin,
      userOriented: true,
      helpText: ["hubot settitle <title> - Set anyone's title but your own."]
    },
    query: {
      userOriented: true,
      helpText: [
        'hubot title - See what the #~s hive mind has decided you are.',
        'hubot title @<user> - See what the #~s hive mind has designated <user>.'
      ]
    }
  });
}
