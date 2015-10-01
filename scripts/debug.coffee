# Description:
#   Diagnostic commands.
#
# Commands:
#   hubot debug_user <username> - dump everything from someone's user object.

traverse = (object, callback, level = 0, seen = []) ->
  seen.push object
  for own key, value of object
    if typeof value is 'object'
      if value in seen
        callback(key, "...", level)
      else
        callback(key, null, level)
        traverse(value, callback, level + 1, seen)
    else
      callback(key, value, level)

dump = (object, header) ->
  lines = [header]
  traverse object, (key, value, level) ->
    line = (' ' for i in [0...level]).join('')
    line += "#{key}:"
    line += " #{value} (#{typeof value})" if value?
    lines.push line
  lines.join("\n")

module.exports = (robot) ->

  robot.respond /debug_user(?: (.+))?/i, (msg) ->
    if msg.match[1]
      u = robot.brain.userForName msg.match[1]
      header = "user named #{msg.match[1]}"
    else
      u = msg.message.user
      header = "your user object"

    unless u?
      msg.reply "I don't know anyone named #{msg.match[1]}."
      return

    resp = ("#{key}: #{value}" for own key, value of u).join("\n")
    msg.reply dump(u, header)

  robot.respond /debug_message/i, (msg) ->
    msg.reply dump(msg.message, 'msg.message')
