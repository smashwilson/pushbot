# Description:
#   Translate text to and from morse code.
#
# Commands:
#   hubot morse <input> - Convert <input> to morse code.
#   hubot demorse <code> - Covert morse code to text.

morse = require 'morse'

module.exports = (robot) ->

  robot.respond /morse\s*([^]+)/i, (msg) ->
    msg.send morse.encode msg.match[1]

  robot.respond /demorse\s*([^]+)/i, (msg) ->
    msg.send morse.decode msg.match[1]
