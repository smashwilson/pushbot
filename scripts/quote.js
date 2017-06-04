// Description:
//   Quotefile central dispatch.

const {createDocumentSet} = require('./documentset')
const {Admin, QuotePontiff, PoetLaureate} = require('./roles')

const limFormatter = (lines, speakers, mentions) => {
  let body = lines.map(line => `> ${line.text}`).join('\n')

  const atSpeakers = Array.from(speakers, speaker => '@' + speaker)

  switch (atSpeakers.length) {
    case 0:
      body += '\n\n  - _anonymous_'
      break
    case 1:
      body += `\n\n  - by @${atSpeakers[0]}`
      break
    case 2:
      body += `\n\n  - a collaboration by ${atSpeakers.join(' and ')}`
      break
    default:
      const allButLast = atSpeakers.slice(0, atSpeakers.length - 1)
      const last = atSpeakers[atSpeakers.length - 1]

      body += `\n\n - by ${allButLast.join(', ')} and ${last}`
      break
  }

  return {body, speakers, mentions: []}
}

module.exports = function (robot) {
  // !quote and friends
  createDocumentSet(robot, 'quote', {
    add: { role: QuotePontiff },
    query: true,
    count: true,
    stats: true,
    by: true,
    about: true,

    nullBody: "That wasn't notable enough to quote. Try harder."
  })

  // !lim
  createDocumentSet(robot, 'lim', {
    add: {
      role: PoetLaureate,
      formatter: limFormatter
    },
    query: true,
    count: true,
    by: true,

    nullBody: 'No limericks found.'
  })

  // !title
  createDocumentSet(robot, 'title', {
    set: {
      roleForSelf: Admin,
      userOriented: true,
      helpText: ["hubot settitle <user>: <title> - Set anyone's title but your own."]
    },
    query: {
      userOriented: true,
      helpText: [
        'hubot title - See what the #~s hive mind has decided you are.',
        'hubot title @<user> - See what the #~s hive mind has designated <user>.'
      ]
    },
    nullBody: 'No title yet. Care to set it?'
  })
}
