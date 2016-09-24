# Description:
#   Keep counts of the reactions received by each user.
#
# Commands:
#   hubot reactions @username - Show the number and kinds of reactions given to a user.
#   hubot puncount - Show the top 10 :beachball: receivers.
#   hubot puncount @username - Show the number of :beachball: reactions given to each user.

_ = require 'underscore'
ReactionMessage = require 'hubot-slack/src/reaction-message'

isReaction = (message) -> message instanceof ReactionMessage

class TallyMap

  constructor: (@brain, @mapKey) ->

  getTallyMap: (uid) ->
    userMap = @brain.get(@mapKey) or {}
    userMap[uid] or {}

  modifyTally: (uid, key, delta) ->
    userMap = @brain.get(@mapKey) or {}
    userTally = userMap[uid] or {}

    userTally[key] = (userTally[key] or 0) + delta
    delete userTally[key] if userTally[key] <= 0

    userMap[uid] = userTally
    @brain.set(@mapKey, userMap)

topN = (map, n, callback) ->
  list = _.pairs map
  decreasing = _.sortBy list, (pair) -> pair[1] * -1
  for pair in _.first decreasing, n
    callback(pair[0], pair[1])

module.exports = (robot) ->

  reactionsReceived = new TallyMap(robot.brain, 'reactionsReceived')
  reactionsGiven = new TallyMap(robot.brain, 'reactionsGiven')

  robot.listen isReaction, (msg) ->
    delta = 0
    delta = 1 if msg.message.type is 'added'
    delta = -1 if msg.message.type is 'removed'

    key = msg.message.reaction
    giverUid = msg.message.user.id
    receiverUid = msg.message.item_user.id

    reactionsGiven.modifyTally giverUid, msg.message.reaction, delta
    reactionsReceived.modifyTally receiverUid, msg.message.reaction, delta

  robot.respond /reactions\s*(?:@?(\S+))?/i, (msg) ->
    if msg.match[1]?
      uname = msg.match[1]
      user = robot.brain.userForName uname
      unless user?
        msg.reply "No user named #{uname} found!"
        return
      uid = user.id
    else
      uname = msg.message.user.name
      uid = msg.message.user.id

    lines = ["*Top 10 reactions to @#{uname}*"]
    reactions = reactionsReceived.getTallyMap uid
    topN reactions, 10, (reaction, tally) ->
      lines.push ":#{reaction}: x#{tally}"
    msg.send lines.join "\n"

  robot.respond /puncount(?:\s*@?(\S+))?/i, (msg) ->
    if msg.match[1]?
      uname = msg.match[1]
      user = robot.brain.userForName uname
      unless user?
        msg.reply "No user named #{uname} found!"
        return
      uid = user.id

      tally = reactionsReceived.getTallyMap(uid).beachball or 'no'
      msg.send "@#{uname} has made *#{tally}* horrible puns."
      return

    punsPerUser = {}
    for uid in Object.keys(robot.brain.users())
      uname = robot.brain.users()[uid].name
      puns = reactionsReceived.getTallyMap(uid).beachball or 0
      punsPerUser[uname] = puns if puns > 0

    if Object.keys(punsPerUser).length is 0
      msg.reply "Nobody has punned since I started keeping track!"
      return

    lines = ["*Top 10 punmakers*"]
    topN punsPerUser, 10, (uname, tally) ->
      s = ''
      s = 's' if tally isnt 1
      lines.push "@#{uname} has made #{tally} pun#{s}."
    msg.send lines.join("\n")
