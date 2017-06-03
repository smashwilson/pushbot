# Description:
#   Count down to the end of the workday.
#
# Commands:
#   hubot gtfo <hh:mm> - tell the bot when you're leaving
#   hubot gtfo - how soon can i gtfo?


moment = require 'moment-timezone'
require 'moment-precise-range-plugin'

moment.tz.setDefault 'America/New_York'

module.exports = (robot) ->

  robot.respond /gtfo(?: (\S*))?/i, (msg) ->
    timeStr = msg.match[1]
    robot.brain.data.gtfo ?= {}

    if timeStr
      # Set your gtfo time.
      robot.brain.data.gtfo[msg.message.user.id] = timeStr
    else
      # Look up your existing gtfo time.
      timeStr = robot.brain.data.gtfo[msg.message.user.id]

    # Use Slack metadata to discover your current timezone.
    userTz = msg.message.user.tz || 'America/New_York'

    if timeStr
      if timeStr.match /\d\d:\d\d/
        time = moment.tz(timeStr, 'HH:mm', userTz)
      else if timeStr.match /\d{4}/
        time = moment.tz(timeStr, 'HHmm', userTz)
      else if timeStr.match /\d?\d:\d\d[aApP]/
        time = moment.tz(timeStr, 'hh:mma', userTz)
      else
        msg.reply "I only understand 16:00 (24-hour) or 4:00p (12-hour) formats."
        return

      time = null if time.isBefore()

    unless time?
      msg.reply "I have no idea when you're leaving!"
      return

    msg.reply "You are scheduled to GT the FO in #{moment.preciseDiff moment.tz(userTz), time}."
