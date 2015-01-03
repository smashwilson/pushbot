# Description:
#   Puppet lets administrators speak through the bot.
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:

module.exports = (robot) ->

  robot.respond /puppet(?:\s+#(\w+))?\s+(.+)/i, (msg) ->
    room = msg.match[1] or 'general'
    robot.messageRoom room, msg.match[2]
