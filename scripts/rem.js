// Description:
//   Remember and forget arbitrary strings.
//
// Commands:
//   hubot rem key = value - Store a new key-value pair.
//   hubot rem key - Recall a previously stored key.
//   hubot forget key - Forget a previously stored key.

module.exports = function (robot) {
  robot.respond(/rem(?:ember)?([^=]+)(?:=([^]+))?/, function (msg) {
    const key = msg.match[1].trim()
    if (msg.match[2]) {
      const value = msg.match[2].trim()

      robot.brain.set(`rem:${key}`, value)
      msg.reply(`:ok_hand: I've learned "${key}".`)
    } else {
      const value = robot.brain.get(`rem:${key}`)
      if (value) {
        msg.send(value)
      } else {
        msg.send(`${key}? Never heard of it.`)
      }
    }
  })

  robot.respond(/forget([^]+)/, function (msg) {
    const key = msg.match[1].trim()
    robot.brain.remove(`rem:${key}`)
    msg.reply(`:dusty_stick: "${key}" has been forgotten.`)
  })
}
