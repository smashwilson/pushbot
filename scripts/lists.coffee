# Description:
#   There once was a bot from Nantucket
#
# Commands:
#   hubot lim [<query>] - Show a limerick, randomly or matching a query.
#   hubot reloadlims - Reload the limericks file
#   hubot howmanylims - Count the number of limericks matching a query string.

fs = require 'fs'
path = require 'path'
_ = require 'underscore'

DATA_ROOT = process.env.HUBOT_LISTS_ROOT || '/var/pushbot/data'
SEPARATOR = '---'

searchableList = (robot, name) ->

  filePath = path.join(DATA_ROOT, "#{name}.txt")
  items = []

  loadFile = (cb) ->
    items = []
    fs.readFile filePath, encoding: 'utf-8', (err, contents) ->
      return cb(err) if err?

      currentItem = []
      for line in contents.split(/\n/)
        if line isnt SEPARATOR
          currentItem.push line
        else if currentItem.length > 0
          items.push currentItem.join('\n')
          currentItem = []

      cb(null)

  matching = (query) ->
    if items.length is 0
      return ["Just a moment, the #{@name} file isn't loaded yet."]

    words = (query or '').trim().split(/\s+/)
    words = _.filter words, (part) -> part.length > 0

    if words.length is 0
      items
    else
      rxs = (new RegExp(w, 'i') for w in words)
      _.filter items, (item) ->
        _.every rxs, (rx) ->
          rx.test(item)

  robot.respond new RegExp("#{name}(\\s.*)?$", 'i'), (msg) ->
    potential = matching(msg.match[1])

    if potential.length > 0
      chosen = _.random potential.length - 1
      msg.send potential[chosen]
    else
      msg.send "I don't know any #{name}s that contain that!"

  robot.respond new RegExp("reload#{name}s", 'i'), (msg) ->
    loadFile (err) ->
      if err?
        msg.reply "Uh oh! #{err.message}"
      else
        msg.reply "#{items.length} #{name}s reloaded."

  robot.respond new RegExp("howmany#{name}s(\\s.*)?$", 'i'), (msg) ->
    matches = matching(msg.match[1])

    qstr = msg.match[1] or ' everything'
    msg.reply "There are #{matches.length} #{name}s about#{qstr}."

  # Perform the initial load.
  loadFile (err) -> console.error(err) if err?


module.exports = (robot) ->

  searchableList robot, "lim"
