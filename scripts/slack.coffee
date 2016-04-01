# Description:
#   Pipe-friendly functions to handle Slack message formatting.
#
# Commands:
#   hubot code - Surround input with a `fenced code block`
#   hubot blockquote - Nest input within a blockquote

inputFrom = (msg) ->
  message = if msg.match[1].trim().length > 0 then msg.match[1] else robot.mostRecent(msg)
  return '' unless message?
  message.replace /^\s*/, ""

module.exports = (robot) ->

  robot.respond /code\s*([^]*)/i, (msg) ->
    msg.send "```\n#{inputFrom msg}\n```"

  robot.respond /blockquote\s*([^]*)/i, (msg) ->
    msg.send ("> #{line}" for line in inputFrom(msg).split /\n/).join("\n")
