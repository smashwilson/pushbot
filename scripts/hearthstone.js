// Description:
//   Look up information on hearthstone cards
//
// Commands:
//   hubot hspopulate <url> - (re)populate the brain with hearthstone data
//   hubot hearth <card> - look up card information
//
// Configuration:
//
// HUBOT_HEARTHSTONE_LOOKUP - URL to look up the cards

const request = require('request-promise-native')

module.exports = function (robot) {
  robot.respond(/hspopulate(?: (.*))?/i, async function (msg) {
    try {
      const uri = msg.match[1] || 'http://hearthstonejson.com/json/AllSets.json'
      const json = await request({ uri, json: true })

      robot.brain.data.hearthstone = {}

      for (const set of Object.keys(json)) {
        for (const card of json[set]) {
          // Debug cards have IDs that start with XXX
          // Not the much anticipated pornographic expansion, alas
          if (!card.id.startsWith('XXX_')) {
            robot.brain.data.hearthstone[card.name.toLowerCase()] = card
          }
        }
      }

      msg.send('Hearthstone population complete')
    } catch (err) {
      msg.send(`:boom:\n\`\`\`\n${err.stack || err}\n\`\`\`\n`)
    }
  })

  robot.respond(/hearth *(.+)/i, function (msg) {
    const name = msg.match[1].toLowerCase()
    const hs = robot.brain.data.hearthstone
    if (!hs) {
      msg.send('Run hspopulate first!')
      return
    }

    let found = hs[name]
    if (found) {
      found = [found]
    } else {
      // So much for the easy way, now we do it the stupid way
      found = []
      for (const cardName of Object.keys(hs)) {
        if (cardName.indexOf(name) !== -1) {
          found.push(hs[cardName])
        }
      }

      // If there's only one result, might as well make it official
      if (found.length === 1) {
        hs[name] = found[0]
      }
    }

    if (found.length === 0) {
      msg.send("Can't find any cards by that name")
      return
    }

    const lookup = process.env.HUBOT_HEARTHSTONE_LOOKUP || 'http://wow.zamimg.com/images/hearthstone/cards/enus/original/<card_id>.png'

    if (found.length <= 5) {
      for (const card of found) {
        const url = lookup.replace('<card_id>', card.id)
        msg.send(url)
      }
    } else {
      msg.send(`There are too many cards with that name (${found.length})`)
    }
  })
}
