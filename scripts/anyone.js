// Description:
//   Produce usernames. Most useful for piping into other commands.
// Commands:
//   hubot anyone - Return a known username chosen at random.
//   hubot anyone but me - Return a username, excluding the caller.
//   hubot anyone here - Return the username of any user that's currently online.
//   hubot anyone here but me - Return the username of any user that's currently online, except the caller.

module.exports = function (robot) {
  function allUserNames (filter) {
    const userNames = []
    const uids = Object.keys(robot.brain.users())
    for (let i = 0; i < uids.length; i++) {
      const user = robot.brain.users()[uids[i]]
      if (filter(user)) {
        userNames.push(user.name)
      }
    }
    return userNames
  }

  robot.respond(/anyone$/, msg => {
    const choices = allUserNames(() => true)
    msg.send(msg.random(choices))
  })

  robot.respond(/anyone\s+but\s+me\s*$/, msg => {
    const me = msg.message.user.name
    const choices = allUserNames(user => user.name !== me)
    msg.send(msg.random(choices))
  })

  robot.respond(/anyone\s+here\s*$/, msg => {
    const choices = allUserNames(user => user.slack.presence === 'active')
    msg.send(msg.random(choices))
  })

  robot.respond(/anyone\s+(?:but\s+me\s+here|here\s+but\s+me)\s*$/, msg => {
    const me = msg.message.user.name
    const choices = allUserNames(user => {
      return user.slack.presence === 'active' && user.name !== me
    })
    if (choices.length > 0) {
      msg.send(msg.random(choices))
    }
  })
}
