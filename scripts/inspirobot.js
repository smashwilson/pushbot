// Description:
//   Inspiration on demand.
//
// Commands:
//   hubot inspire me - When you need a little inspiration.

const request = require('request')

module.exports = function (robot) {
  robot.respond(/inspire\b/i, msg => {
    request('http://inspirobot.me/api?generate=true', (err, resp, body) => {
      if (err) {
        robot.logger.error(`Unable to inspire a user:\n${err.stack}`)
        msg.reply(":boom: I couldn't reach the inspirobot API! You'll have to inspire yourself instead.")
      } else if (resp.statusCode === 200) {
        msg.send(body)
      } else {
        robot.logger.error(`Status ${resp.statusCode} from inspirobot API:\n${body}`)
        msg.reply(`:warning: Inspirobot gave me a ${resp.statusCode} response instead of a 200.`)
      }
    })
  })
}
