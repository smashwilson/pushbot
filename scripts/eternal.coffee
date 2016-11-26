# Description:
#   Look up information on eternal cards
#
# Commands:
#   hubot etload <url> - (re)populate the brain with eternal data
#   hubot eternal <card> - look up card information
#
# Configuration:
#
# process.env.HUBOT_ETERNAL_LOOKUP - URL to look up the cards, replace on <card_name>

module.exports = (robot) ->

  robot.respond /etload(?: (.*))?/i, (msg) ->
    url = msg.match[1] or "https://www.eternaljson.com/eternal.json"
    msg.http(url).get() (err, res, body) ->
      errmsg = "Failed to GET: #{url}"
      msg.send err if err
      try
        json = JSON.parse(body)
        robot.brain.data.eternal = {}
        for card in json
          robot.brain.data.eternal[card.name.toLowerCase()] = card
        msg.send "Successfully loaded eternal cards into the brain."
      catch error
        msg.send errmsg
        msg.send error
        return

  robot.respond /eternal *(.+)/i, (msg) ->
    name = msg.match[1].toLowerCase()
    eternal = robot.brain.data.eternal
    if not eternal
      msg.send "Run `eternalload` first!"
      return
    found = eternal[name]
    if not found
      # So much for the easy way, now we do it the stupid way
      found = (eternal[cardName] for cardName of eternal when cardName.indexOf(name) != -1)
      # If there's only one result, might as well make it official
      if found.length == 1
        eternal[name] = found[0]
    else
      found = [found]

    if found.length == 0
      msg.send "Can't find any cards by that name"
      return

    lookup = process.env.HUBOT_ETERNAL_LOOKUP or "https://s3.amazonaws.com/eternaldecks/cards/<card_name>.png"

    if found.length <= 5
      for card in found
        url = lookup.replace("<card_name>", encodeURIComponent card.name)
        msg.send url
    else
      msg.send "There are too many cards which match that name (#{found.length})"
