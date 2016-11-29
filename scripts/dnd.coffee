# Description:
#   D&D related commands.
#
# Commands:
#   hubot attr [@<username>] maxhp <amount> - Set your character's maximum HP
#   hubot attr [@<username>] dex <score> - Set your character's dexterity score
#   hubot hp [@<username>] - View your character's current HP
#   hubot hp [@<username>] <amount> - Set your character's HP to a fixed amount
#   hubot hp [@<username>] +/-<amount> - Add or remove HP from your character
#   hubot init clear - Reset all initiative counts. (DM only)
#   hubot init [@<username>] <score> - Set your character's initiative count
#   hubot init next - Advance the initiative count and announce the next character
#   hubot init report - Show all initiative counts.
#   hubot character sheet [@<username>] - Summarize current character statistics
#   hubot character report - Summarize all character statistics

PUBLIC_CHANNEL = process.env.DND_PUBLIC_CHANNEL

DM_ROLE = 'dungeon master'

INITIATIVE_MAP_DEFAULT =
  scores: []
  current: null

ATTRIBUTES = ['maxhp', 'str', 'dex', 'con', 'int', 'wis', 'cha']

modifier = (score) -> Math.floor((score - 10) / 2)

modifierStr = (score) ->
  m = modifier(score)
  if m < 0 then m.toString() else "+#{m}"

module.exports = (robot) ->

  dmOnlyError = (msg) ->
    [
      "You can't do that! You're not a *#{DM_ROLE}*."
      "Ask an admin to run `#{robot.name} grant #{msg.message.user.name} the #{DM_ROLE} role`."
    ].join("\n")

  dmOnly = (msg, error=null) ->
    if robot.auth.hasRole(msg.message.user, DM_ROLE)
      true
    else
      error ?= dmOnlyError(msg)
      msg.reply error
      false

  isPublicChannel = (msg) ->
    if PUBLIC_CHANNEL?
      msg.envelope.room is PUBLIC_CHANNEL
    else
      msg.envelope.room[0] isnt 'D'

  pmOnlyFromDM = (msg) ->
    if isPublicChannel(msg)
      true
    else
      error = ["Only a *#{DM_ROLE}* can do that here!"]
      if PUBLIC_CHANNEL?
        error.push "Try that again in the <##{PUBLIC_CHANNEL}> channel instead."
      else
        error.push "Try that again in a public channel instead."
      dmOnly(msg, error.join "\n")

  characterNameFrom = (msg) ->
    if msg.match[1]?
      # Explicit username. DM-only
      return null unless dmOnly(msg) or msg.match[1] is msg.message.user.name
      msg.match[1]
    else
      msg.message.user.name

  withCharacter = (msg, callback) ->
    username = characterNameFrom msg
    return unless username?

    existing = true
    characterMap = robot.brain.get('dnd:characterMap') or {}
    character = characterMap[username]
    unless character?
      existing = false
      character = {
        username: username
      }

    callback(existing, character)
    characterMap[username] = character

    robot.brain.set('dnd:characterMap', characterMap)

  robot.respond /attr\s+(?:@(\S+)\s+)?(\w+)(?:\s+(\d+))?/i, (msg) ->
    attrName = msg.match[2]
    score = null

    if msg.match[3]?
      return unless pmOnlyFromDM(msg)
      score = parseInt(msg.match[3])

    unless ATTRIBUTES.indexOf(attrName) isnt -1
      msg.reply [
        "#{attrName} isn't a valid attribute name."
        "Known attributes include: #{ATTRIBUTES.join ' '}"
      ].join "\n"
      return

    withCharacter msg, (existing, character) ->
      if score?
        character[attrName] = score

        if attrName is 'maxhp'
          if character.currenthp and character.currenthp > character.maxhp
            character.currenthp = character.maxhp
          unless character.currenthp?
            character.currenthp = character.maxhp

        msg.send "@#{character.username}'s #{attrName} is now #{score}."
      else
        msg.send "@#{character.username}'s #{attrName} is #{character[attrName]}."

  robot.respond /hp(?:\s+@(\S+))?(?:\s+(\+|-)?\s*(\d+))?/i, (msg) ->
    op = msg.match[2] or '='
    amountStr = msg.match[3]
    if amountStr?
      return unless pmOnlyFromDM(msg)
      amount = parseInt(amountStr)

    withCharacter msg, (existing, character) ->
      unless character.maxhp?
        msg.reply [
          "@#{character.username}'s maximum HP isn't set."
          "Please run `@#{robot.name}: attr maxhp <amount>` first."
        ].join("\n")
        return

      inithp = character.currenthp or character.maxhp

      # Query only
      unless amount?
        msg.send "@#{character.username}'s current HP is #{inithp} / #{character.maxhp}."
        return

      finalhp = switch op
        when '+' then inithp + amount
        when '-' then inithp - amount
        else amount

      finalhp = character.maxhp if finalhp > character.maxhp
      character.currenthp = finalhp

      lines = ["@#{character.username}'s HP: #{inithp} :point_right: #{finalhp} / #{character.maxhp}"]
      if finalHP <= 0
        lines.push "@#{character.username} is KO'ed!"
      msg.send lines.join("\n")

  robot.respond /init\s+clear/i, (msg) ->
    robot.brain.set 'dnd:initiativeMap', INITIATIVE_MAP_DEFAULT
    msg.reply 'All initiative counts cleared.'

  robot.respond /init(?:\s+@(\S+))?\s+(-?\d+)/, (msg) ->
    return unless pmOnlyFromDM(msg)
    score = parseInt(msg.match[2])

    initiativeMap = robot.brain.get('dnd:initiativeMap') or INITIATIVE_MAP_DEFAULT
    withCharacter msg, (existing, character) ->
      existing = null
      for each in initiativeMap.scores
        existing = each if each.username is character.username

      if existing?
        existing.score = score
      else
        created =
          username: character.username
          score: score
        initiativeMap.scores.push created

      # Sort score array in decreasing initiative score.
      initiativeMap.scores.sort((a, b) -> b.score - a.score)

      msg.send "@#{character.username} will go at initiative count #{score}."

  robot.respond /init\s+next/i, (msg) ->
    initiativeMap = robot.brain.get('dnd:initiativeMap') or INITIATIVE_MAP_DEFAULT

    unless initiativeMap.scores.length > 0
      msg.reply 'No known initiative scores.'
      return

    if initiativeMap.current?
      nextCount = initiativeMap.current + 1
      nextCount = 0 if nextCount >= initiativeMap.scores.length
    else
      nextCount = 0

    current = initiativeMap.scores[nextCount]
    initiativeMap.current = nextCount
    msg.send "@#{current.username} is up. _(#{current.score})_"

  robot.respond /init\s+report/i, (msg) ->
    initiativeMap = robot.brain.get('dnd:initiativeMap') or INITIATIVE_MAP_DEFAULT

    unless initiativeMap.scores.length > 0
      msg.reply 'No known initiative scores.'
      return

    lines = []
    i = 0
    for each in initiativeMap.scores
      prefix = if (initiativeMap.current or 0) is i then ':black_square_button:' else ':black_square:'
      lines.push "#{prefix} _(#{each.score})_ @#{each.username}"
      i++

    msg.send lines.join "\n"

  robot.respond /character sheet(?:\s+@(\S+))?/i, (msg) ->
    withCharacter msg, (existing, character) ->
      unless existing
        msg.reply "No character data for #{character.username} yet."
        return

      lines = ["*HP:* #{character.currenthp} / #{character.maxhp}"]

      for attrName in ['str', 'dex', 'con', 'int', 'wis', 'cha']
        attrScore = character[attrName]
        if attrScore?
          attrStr = "#{attrScore} (#{modifierStr attrScore})"
        else
          attrStr = '_unassigned_'

        lines.push "*#{attrName.toUpperCase()}:* #{attrStr}"

      msg.send lines.join "\n"

  robot.respond /character report/i, (msg) ->
    characterMap = robot.brain.get('dnd:characterMap') or {}
    lines = []
    for username, character of characterMap
      lines.push "*#{username}*: HP #{character.currenthp}/#{character.maxhp}"
    msg.send lines.join "\n"
