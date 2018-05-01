// Description:
//   Keep counts of the reactions received by each user.
//
// Commands:
//   hubot reactions @username - Show the number and kinds of reactions given to a user.
//   hubot toppun - Show the top 10 :beachball: receivers.
//   hubot toppun @username - Show the number of :beachball: reactions given to each user.

const {TallyMap} = require('./models/tally-map')

module.exports = function (robot) {
  if (robot.react) {
    robot.react(msg => {
      let delta = 0
      if (msg.message.type === 'added') { delta = 1 }
      if (msg.message.type === 'removed') { delta = -1 }

      const key = msg.message.reaction
      const giverUid = msg.message.user.id
      const receiverUid = msg.message.item_user.id

      if (giverUid === receiverUid) {
        return
      }

      TallyMap.reactionsGiven(robot).modifyTally(giverUid, key, delta)
      TallyMap.reactionsReceived(robot).modifyTally(receiverUid, key, delta)
    })
  }

  robot.respond(/reactions\s*(?:@?(\S+))?/i, msg => {
    let uid
    if (msg.match[1]) {
      const user = robot.brain.userForName(msg.match[1])
      if (!user) {
        msg.reply(`No user named ${msg.match[1]} found!`)
        return
      }
      uid = user.id
    } else {
      uid = msg.message.user.id
    }

    const lines = [`*Top 10 reactions to <@${uid}>*`]
    TallyMap.reactionsReceived(robot).topForUser(uid, 10, (err, reaction, tally) => {
      if (err) {
        msg.reply(`:boom: \`${err.stack}\``)
        return
      }
      lines.push(`:${reaction}: x${tally}`)
    })
    msg.send(lines.join('\n'))
  })

  robot.respond(/toppun(?:\s*@?(\S+))?/i, msg => {
    if (msg.match[1]) {
      const uname = msg.match[1]
      const user = robot.brain.userForName(uname)
      if (!user) {
        msg.reply(`No user named ${uname} found!`)
        return
      }
      const uid = user.id

      const tally = TallyMap.reactionsReceived(robot).forUser(uid).beachball || 'no'
      msg.send(`<@${uid}> has been struck by *${tally}* :beachball:.`)
      return
    }

    const lines = ['*Top 10 punmakers*']
    TallyMap.reactionsReceived(robot).topForKey('beachball', 10, (err, uid, tally) => {
      if (err) {
        msg.reply(`:boom: \`${err.stack}\``)
        return
      }
      lines.push(`<@${uid}> has been struck by *${tally}* :beachball:.`)
    })
    msg.send(lines.join('\n'))
  })
}
