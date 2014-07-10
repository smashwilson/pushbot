# Description:
#   Simple "pick one of these random responses"-style commands.
#
# Commands:
#   hug <user> - express mechanical affection toward a target
#

_ = require 'underscore'

targetFrom = (msg, matchNo = 1) ->
  if msg.match[matchNo] then msg.match[matchNo] else msg.message.user.name

atRandom = (list) -> list[_.random list.length - 1]

module.exports = (robot) ->

  robot.hear /hug(?: (.*))?/i, (msg) ->
    target = targetFrom msg
    msg.send "/me compresses #{target} in a cold, metallic embrace"
