# Description:
#   Simple "pick one of these random responses"-style commands.
#
# Commands:
#   hubot hug <user> - express mechanical affection toward a target
#   hubot hi5 <user> - enthusiastically express congratulations
#   hubot magic8 <question> - gaze into your future
#   hubot judge <something> - render a verdict upon... something
#   hubot barf - BAAAAAARRRRRRRFFFFF
#   hubot betray <someone> - Curse your sudden but inevitable betrayal!
#   hubot burritohose <someone> - Doof. Doof. Doof. Splat. Splat. Splat.
#   hubot welcome <someone> - Welcome a newcomer to the channel.
#   hubot poker - A very involved game of skill and chance.
#   hubot sin - return a sin, courtesy of Jack Chick
#   hubot pokemonsay <string> - Translate string into Pokemon Unown Slack emojis.
#   hubot femshep - Express your rage in a healthy fashion
#   hubot nope - Just nope the f out of there
#   hubot fine - Show just how fine it is

# Configuration:
#
#   HUBOT_BETRAY_IMMUNE - comma-separated list of users who are immune to betrayal.

_ = require 'underscore'
{atRandom} = require './helpers'

betrayImmune = _.map (process.env.HUBOT_BETRAY_IMMUNE or '').split(/,/), (line) -> line.trim()

targetFrom = (msg, matchNo = 1) ->
  if msg.match[matchNo] then msg.match[matchNo] else msg.message.user.name

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
      "http://giphy.com/gifs/just-hooray-PCBJRuJbMYzLi#.gif"
      "http://media.giphy.com/media/dLuI7v4QXx5SM/giphy.gif"
      "http://giphy.com/gifs/cheezburger-high-five-tutle-2FazevvcDdyrf1E7C#.gif"
      "http://media3.giphy.com/media/HzSK6zrsNl3UY/giphy.gif"
      "http://media.giphy.com/media/ujGfBmVppmgEg/giphy.gif"
      "http://media2.giphy.com/media/fm4WhPMzu9hRK/giphy.gif"
      "http://media.giphy.com/media/VuwYcvElLOnuw/giphy.gif"
      "http://i.imgur.com/KZEsyv0.gif"
      "https://i.imgur.com/vUDUN5k.gif"
      "https://static1.e621.net/data/54/92/54927df9c2746b6bd28e0db41229f88d.gif"
      "http://sixprizes.com/wp-content/uploads/2014/01/vulpix-misty-flamethrower-fire-1.jpg"
      "http://mlb.mlb.com/images/0/7/2/177185072/050916_jose_helmet_med_a3yfultb.gif"
      "https://media.giphy.com/media/OIoQ9FzLel1qo/giphy.gif"
      "https://media.giphy.com/media/l4FGzzKKoxuv7AaL6/giphy.gif"
    ]

  robot.respond /magic8/i, (msg) ->
    positive = [
      "Definitely."
      "Absolutely."
      "Yep."
      "SO IT HAS BEEN FORETOLD"
      "Yes, sure. Why not."
      "The stars say... YES."
      "Just this once."
      "Confirm."
      "100%"
      "It is established fact."
      "We're doing this, we're making this happen!"
    ]

    negative = [
      "Nooooope."
      "Not a chance."
      "Never!"
      "http://media.giphy.com/media/d0QLPgh4VGiA0/giphy.gif"
      "http://media.giphy.com/media/DGiZfWmc0HWms/giphy.gif"
      "The stars say... NO."
      "Curl up and die."
      "I slept with your mother!"
      "When pigs fly!"
      "0%"
      "I will explode in your face."
      "The frustration with this stool is enormous. Terrible, just terrible."
    ]

    neutral = [
      "Maybe"
      "Perhaps"
      "It could happen"
      "Can't really say"
      "My own 8-ball is broken"
      "50%"
      "That's what SHE asked!"
      "As sure as my name is.... wait, who am I?"
      "The stars say... MAYBE."
      "http://i.imgur.com/rl2o77j.jpg"
      "INSUFFICIENT DATA FOR MEANINGFUL ANSWER"
    ]

    all = positive
    all.push negative...
    all.push neutral...

    msg.reply atRandom(all)

  robot.respond /judge/i, (msg) ->
    chance = _.random 100
    msg.reply(if chance < 80 then "HARSH" else "Lenient.")

  robot.respond /win/i, (msg) ->
    msg.reply "You win!"

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

  robot.respond /\S+hose(?: (@?\w+))?/i, (msg) ->
    msg.send "_doof doof doof_"

    prefix = "#{msg.match[1]}: " if msg.match[1]?
    prefix ?= ''

    fn = -> msg.send "#{prefix}_splat splat splat_"
    setTimeout fn, _.random(3000, 5000)

  robot.respond /welcome(?: +(@?\w+))?/i, (msg) ->
    target = if msg.match[1] then ", #{msg.match[1]}" else ""
    msg.send """
      Welcome to #~s#{target}! Here's a quick intro to Slack and me:
      https://gist.github.com/smashwilson/325d444e7a080906f8b9
      """

  robot.respond /poker.*/i, (msg) ->
    msg.send "I barely know her!"

  robot.respond /sin/i, (msg) ->
    msg.send atRandom [
      "Murder"
      "Having an affair"
      "Witchcraft"
      "Pride"
      "Hate"
      "Homosexuality"
      "Wanting something that belongs to someone else!"
      "Envy"
      "Stubbornness"
      "Cheating"
      "Unbelief"
      "Filthy talk"
      "Incest"
      "Shacking"
      "Swearing"
      "Stealing"
      "Worshipping false gods"
      "Drunkenness"
      "Playing with the occult"
      "Hating parents"
      "Lying"
      "Lust"
      "Ignoring God"
      "Selfishness"
    ]

  robot.respond /pokemonsay ([^]*)/i, (msg) ->
    unownify = (c) ->
      if c in "abcdefghijklmnopqrstuvwxyz"
        ":unown-#{c}:"
      else if c in "!"
        ":unown-ex:"
      else if c in "?"
        ":unown-qu:"
      else
        c
    lower_string = msg.match[1].toLowerCase()
    unown_string = lower_string.split('').map(unownify).join('')
    msg.send unown_string

  robot.respond /femshep/i, (msg) ->
    msg.send atRandom [
      "http://media.tumblr.com/tumblr_lsxdm7yONC1qbplir.gif"
      "http://i.imgur.com/vJL0E6t.gif"
    ]

  robot.respond /nope\s*$/i, (msg) ->
    msg.send "http://www.reactiongifs.com/wp-content/uploads/2013/06/nope.gif"

  robot.respond /fine/i, (msg) ->
    msg.send ":fire::thisisfine::fire:"

  robot.hear /robot\s+body/i, (msg) ->
    msg.send atRandom [
      "http://img.sharetv.com/shows/episodes/standard/345637.jpg"
      "https://68.media.tumblr.com/d6d9c3286d944ef1bdbf3e41e2f99d48/tumblr_omhzugCO4R1tpri36o1_500.png"
    ]

  robot.hear /\bbee+[s]?\b/i, (msg) ->
    msg.send atRandom [
      "https://media.giphy.com/media/dcubXtnbck0RG/giphy.gif"
      "http://i.imgur.com/hnGNH.gif"
      "http://i.imgur.com/tZ3yQMb.gif"
     ]

  robot.hear /\b(?:tit downwards|breasted boobily)\b/i, (msg) ->
    msg.send "http://imgur.com/TRAPYBX"
