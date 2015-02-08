# Description:
#   Look up information on hearthstone cards
#
# Commands:
#   hspopulate <url> - (re)populate the brain with hearthstone data
#   hearth <card> - look up card information
#
# Configuration:
#
# HUBOT_HEARTHSTONE_LOOKUP - URL to look up the cards

module.exports = (robot) ->

  robot.respond /hspopulate(?: (.*))?/i, (msg) ->
    url = msg.match[1] or "http://hearthstonejson.com/json/AllSets.json"
    msg.http(url).get() (err, res, body) ->
      errmsg = "Couldn't download/parse/whatever that"
      msg.send err if err
      try
        json = JSON.parse(body)
        robot.brain.data.hearthstone = {}
        for set of json
          for card in json[set]
            # Debug cards have IDs that start with XXX
            # Not the much anticipated pornographic expansion, alas
            if card.id[0..3] != "XXX_"
              robot.brain.data.hearthstone[card.name.toLowerCase()] = card
        msg.send "Hearthstone population complete"
      catch error
        msg.send errmsg
        msg.send error
        return

  robot.respond /hearth *(.+)/i, (msg) ->
    name = msg.match[1].toLowerCase()
    hs = robot.brain.data.hearthstone
    if not hs
      msg.send "Run hspopulate first!"
      return
    found = hs[name]
    if not found
      # So much for the easy way, now we do it the stupid way
      found = (hs[cardName] for cardName of hs when cardName.indexOf(name) != -1)
      # If there's only one result, might as well make it official
      if found.length == 1
        hs[name] = found[0]
    else
      found = [found]

    if found.length == 0
      msg.send "Can't find any cards by that name"
      return

    lookup = process.env.HUBOT_HEARTHSTONE_LOOKUP or "http://wow.zamimg.com/images/hearthstone/cards/enus/original/<card_id>.png"

    if found.length <= 5
      for card in found
        url = lookup.replace("<card_id>", card.id)
        msg.send url
    else
      msg.send "There are too many cards with that name (#{found.length})"
