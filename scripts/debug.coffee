# Description:
#   Simple "pick one of these random responses"-style commands.
#
# Commands:
#   hubot debug_user <username> - dump everything from someone's user object.

module.exports = (robot) ->

  robot.respond /debug_user(?: (.+))?/i, (msg) ->
    if msg.match[1]
      u = robot.brain.userForName msg.match[1]
    else
      u = msg.message.user

    unless u?
      msg.reply "I don't know anyone named #{msg.match[1]}."
      return

    resp = ("#{key}: #{value}" for own key, value of u).join("\n")
    msg.reply resp

  robot.respond /debug_echo/i, (msg) ->
    msg.reply msg.message.text
