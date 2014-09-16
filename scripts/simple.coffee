# Description:
#   Simple "pick one of these random responses"-style commands.
#
# Commands:
#   hubot hug <user> - express mechanical affection toward a target
#   hubot hi5 <user> - enthusiastically express congratulations
#   hubot zing - someone made a terrible joke
#   hubot magic8 <question> - gaze into your future
#   hubot judge <something> - render a verdict upon... something
#   hubot barf - BAAAAAARRRRRRRFFFFF
#   hubot betray <someone> - Curse your sudden but inevitable betrayal!
#   hubot burritohose <someone> - Doof. Doof. Doof. Splat. Splat. Splat.
#
# Configuration:
#
#   HUBOT_BETRAY_IMMUNE - comma-separated list of users who are immune to betrayal.

_ = require 'underscore'

betrayImmune = _.map (process.env.HUBOT_BETRAY_IMMUNE or '').split(/,/), (line) -> line.trim()

targetFrom = (msg, matchNo = 1) ->
  if msg.match[matchNo] then msg.match[matchNo] else msg.message.user.name

atRandom = (list) -> list[_.random list.length - 1]

module.exports = (robot) ->

  allUsers = ->
    userMap = robot.brain.users()
    ids = Object.keys(userMap)
    userMap[id] for id in ids

  robot.respond /hug(?: (.*))?/i, (msg) ->
    target = targetFrom msg
    msg.emote "compresses #{target} in a cold, metallic embrace"

  robot.respond /hi5(?: (.*)?)/i, (msg) ->
    target = targetFrom msg
    msg.emote atRandom [
      "high-fives #{target} with cold, unfeeling metal"
      "high-fives #{target} with enthusiasm!"
      "high-fives #{target} with glee!"
      "rocket-jumps off of an exploding helicopter to high-five #{target} in midair!"
      "high-fives #{target}... with dire consequences"
      "http://gifsec.com/wp-content/uploads/GIF/2014/04/GIF-Baby-high-five-cat.gif"
      "http://www.survivingcollege.com/wp-content/uploads/2014/04/stephen-colbert-high-five-gif.gif"
      "http://giphy.com/gifs/just-hooray-PCBJRuJbMYzLi"
    ]

  robot.respond /zing/i, (msg) ->
    msg.send atRandom [
      "http://i.imgur.com/Wd9NiaB.jpg"
      "https://slack-files.com/files-tmb/T02D23B7G-F02ECEZEG-3fd432/img_201407206_133131_360.png"
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
      "http://i.imgur.com/rl2o77j.jpg"
    ]

    all = positive
    all.push negative...
    all.push neutral...

    msg.reply atRandom(all)

  robot.respond /judge/i, (msg) ->
    chance = _.random 100
    msg.reply(if chance < 80 then "HARSH" else "Lenient.")

  robot.respond /barf *(.*)/i, (msg) ->
    if not msg.match[1]
      text = "barf"
    else
      text = msg.match[1]
    text = text.toUpperCase()

    barfify = (letter) ->
      if letter in ["A", "E", "F", "H", "I",
          "J", "L", "M", "N", "O", "R",
          "S", "U", "V", "W", "Y", "Z"]
        return (letter for n in [1..5])
      return [letter]
    line = ((barfify char).join("") for char in text).join("")
    lines = (line for n in [1..5])
    msg.send lines.join("\n")

  robot.respond /sde *(.*)/i, (msg) ->
    text = if msg.match[1] then msg.match[1] else "shut down everything"
    lines = text.split " "
    if lines.length > 10
      msg.send "Ain't nobody got time for that!"
      return

    sendThenWait = (portion, rest) ->
      text = if rest.length > 0
        "#{portion}."
      else
        "#{portion.toUpperCase()}!"
      msg.send text
      if rest.length > 0
        setTimeout =>
          sendThenWait rest.shift(), rest
        , 1000
    sendThenWait lines.shift(), lines

  robot.hear /none/i, (msg) ->
    msg.send "more like \"#{msg.message.text.replace /none/ig, 'NAAN'}\"!"

  robot.hear /non-/i, (msg) ->
    msg.send "more like \"#{msg.message.text.replace /non-/ig, "NAAN-"}\"!"

  robot.respond /(?:harm|betray)(?: (\S+))?/i, (msg) ->
    if msg.message.user.id in betrayImmune
      backfire = false
    else
      backfire = _.random(100) < 10

    if backfire
      target = msg.message.user.name
    else if msg.match[1]
      target = targetFrom msg
      tname = target.replace /^@/, ''
      tu = robot.brain.userForName tname
      target = msg.message.user.name if tu? and tu.id.toString() in betrayImmune
    else
      potential = (u.name for u in allUsers() when u.id.toString() not in betrayImmune)
      if potential.length > 0
        target = atRandom potential
      else
        msg.reply "There's nobody left to betray!"
        return

    msg.emote atRandom [
      "stabs @#{target} in the back!"
      "stabs @#{target} in the front!"
      "stabs @#{target} in the spleen!"
      "stabs @#{target} in the face!"
      "knocks out @#{target} and hides the body in an air vent"
      "http://31.media.tumblr.com/14b87d0a25ee3f2e9b9caac550752e0f/tumblr_n0huzr2xVO1si4awpo3_250.gif"
    ]

  robot.respond /\w+hose(?: (@?\w+))?/i, (msg) ->
    msg.send "_doof_ _doof_ _doof_"

    prefix = "#{msg.match[1]}: " if msg.match[1]?
    prefix ?= ''

    fn = -> msg.send "#{prefix}_splat_ _splat_ _splat_"
    setTimeout fn, _.random(3000, 5000)
