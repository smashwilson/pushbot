# Description:
#   Pipe-friendly functions to handle Slack message formatting.
#
# Commands:
#   hubot code - Surround input with a `fenced code block`
#   hubot blockquote - Nest input within a blockquote

inputFrom = (msg) -> msg.match[1].replace /^\s*/, ""

module.exports = (robot) ->

  robot.respond /code ([^]*)/i, (msg) ->
    msg.send "```\n#{inputFrom msg}\n```"

  robot.respond /blockquote ([^]*)/i, (msg) ->
    msg.send ("> #{line}" for line in inputFrom(msg).split /\n/).join("\n")
