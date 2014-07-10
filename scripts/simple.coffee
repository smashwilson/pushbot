# Description:
#   Simple "pick one of these random responses"-style commands.
#
# Commands:
#   hug <user> - express mechanical affection toward a target
#   hi5 <user> - enthusiastically express congratulationss
#   magic8 <question> - gaze into your future

_ = require 'underscore'

targetFrom = (msg, matchNo = 1) ->
  if msg.match[matchNo] then msg.match[matchNo] else msg.message.user.name

atRandom = (list) -> list[_.random list.length - 1]

module.exports = (robot) ->

  robot.hear /hug(?: (.*))?/i, (msg) ->
    target = targetFrom msg
    msg.emote "compresses #{target} in a cold, metallic embrace"

  robot.hear /hi5(?: (.*)?)/i, (msg) ->
    target = targetFrom msg
    msg.emote atRandom [
      "high-fives #{target} with cold, unfeeling metal"
      "high-fives #{target} with enthusiasm!"
      "high-fives #{target} with glee!"
      "rocket-jumps off of an exploding helicopter to high-five #{target} in midair!"
      "high-fives #{target}... with dire consequences"
      "http://gifsec.com/wp-content/uploads/GIF/2014/04/GIF-Baby-high-five-cat.gif"
      "http://www.survivingcollege.com/wp-content/uploads/2014/04/stephen-colbert-high-five-gif.gif"
    ]

  robot.respond /magic8/i, (msg) ->
    positive = [
      "Definitely."
      "Absolutely."
      "Yep."
      "SO IT HAS BEEN FORETOLD"
      "Yes, sure. Why not."
      "The stars say... YES."
    ]

    negative = [
      "Nooooope."
      "Not a chance."
      "Never!"
      "http://media.giphy.com/media/d0QLPgh4VGiA0/giphy.gif"
      "http://media.giphy.com/media/DGiZfWmc0HWms/giphy.gif"
      "The stars say... NO."
    ]

    neutral = [
      "I slept with your spouse."
      "Curl up and die."
      "The stars say... MAYBE."
    ]

    all = positive
    all.push negative...
    all.push neutral...

    msg.reply atRandom(all)
