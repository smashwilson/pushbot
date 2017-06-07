# Description:
#   Cowsay with code fencing to prevent overly clever text formatters from mangling bovine speeches.
# Commands:
#   hubot cowsay <text> - Makes a cow say <text>

module.exports = (robot) ->
  robot.respond /cowsay( me)?\s*([^]*)/i, (msg) ->
    message = ''
    if msg.match[2].trim().length > 0
      message = msg.match[2]
    else
      message = robot.mostRecent(msg)?.text

    msg
      .http("http://cowsay.morecode.org/say")
      .query(format: 'text', message: message)
      .get() (err, res, body) ->
        msg.send "```#{body}\n```"
