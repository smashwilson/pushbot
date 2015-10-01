# Description:
#   Cowsay with code fencing to prevent overly clever text formatters from mangling bovine speeches.
# Commands:
#   hubot cowsay <text> - Makes a cow say <text>

module.exports = (robot) ->
  robot.respond /cowsay( me)? (.*)/i, (msg) ->
    msg
      .http("http://cowsay.morecode.org/say")
      .query(format: 'text', message: msg.match[2])
      .get() (err, res, body) ->
        msg.send "```#{body}\n```"
