# Description:
#   Translate text to and from morse code.
#
# Commands:
#   hubot morse <input> - Convert <input> to morse code.
#   hubot demorse <code> - Covert morse code to text.

morse = require 'morse'

module.exports = (robot) ->

  robot.respond /morse\s*([^]*)/i, (msg) ->
    message = if msg.match[1].trim().length > 0 then msg.match[1] else robot.mostRecent(msg)

    msg.send morse.encode message

  robot.respond /demorse\s*([^]*)/i, (msg) ->
    message = if msg.match[1].trim().length > 0 then msg.match[1] else robot.mostRecent(msg)
    message = message.trim() if message?

    msg.send morse.decode message
