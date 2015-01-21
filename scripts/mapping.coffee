# Description:
#   Maintain arbitrary sets of username -> text mappings.
#
# Commands:
#   hubot setupmapping <mappingname> - create mapping commands and data files called <mappingname>.
#   hubot <mappingname> <username> - show <username>'s current setting in a particular mapping.
#   hubot set<mappingname> <username> <value> - set <username>'s current mapping to <value>.
#
# Configuration:
#
#   HUBOT_MAPPING_DATAROOT Root directory to store mapping files.

fs = require 'fs'
path = require 'path'

ADMIN_ROLE = 'mapmaker'
DATAROOT = process.env.HUBOT_MAPPING_DATAROOT or '/var/pushbot/botdata/mappings'

class Mapping

  constructor: (@name, @missingText) ->
    @dataPath = path.join DATAROOT, "#{@name}.json"
    @data = null

  isLoaded: -> @data?

  loaded: (callback) ->
    if @isLoaded then callback(null) else reloadThen(callback)

  createThen: (callback) ->
    @data = {}
    fs.writeFile @dataPath, JSON.stringify(@data), encoding: 'utf-8', flag: 'wx', callback

  reloadThen: (callback) ->
    fs.readFile @dataPath, encoding: 'utf-8', (err, data) ->
      if err?
        callback(err)
        return

      @data = JSON.parse(data)
      callback(null)

  saveThen: (callback) ->
    fs.writeFile @dataPath, JSON.stringify(@data), encoding: 'utf-8', callback

  get: (username, callback) ->
    @loaded (err) =>
      if err?
        callback(err)
        return

      callback(null, @data[username] or @missingText)

  set: (username, value, callback) ->
    @loaded (err) =>
      if err?
        callback(err)
        return

      @data[username] = value

      @saveThen callback

  @all: (callback) ->
    fs.readdir DATAROOT, (err, files) ->
      if err?
        callback(err)
        return

      ms = []
      for fileName in files
        if fileName.indexOf('.json', file.length - 5) != -1
          ms.push new Mapping(fileName.substring(0, fileName.length - 5))

module.exports = (robot) ->

  checkAuth = (msg) ->
    unless robot.auth.hasRole(msg.message.user, ADMIN_ROLE)
      msg.reply [
        "You can't do that! You're not a *#{ADMIN_ROLE}*."
        "Ask an admin to run `#{robot.name} grant #{msg.message.user.name} the #{ADMIN_ROLE}`."
      ].join("\n")
      return false
    true

  createMapping = (mapping) ->
    robot.respond /#{mapping.name}(?:\s+@?(\S+))?/, (msg) ->
      username = msg.match[1] or msg.message.user.name

      mapping.get username, (err, value) ->
        msg.reply "#{username}: #{value}"

    robot.respond /set#{mapping.name}\s+@?(\S+)\s+(.+)/, (msg) ->
      return unless checkAuth(msg)

      username = msg.match[1]
      value = msg.match[2]

      mapping.set username, value, (err) ->

  # Initial load.
  Mapping.all (err, ms) ->
    throw err if err?

    createMapping(mapping) for mapping in ms

  robot.respond /setupmapping\s+(\w+)\s+"([^"])"/, (msg) ->
    return unless checkAuth(msg)

    mapping = new Mapping(msg.match[1], msg.match[2])
    mapping.createThen (err) ->
      if err?
        msg.reply "Couldn't create the mapping: #{err}"
      else
        createMapping(mapping)
