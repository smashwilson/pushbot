# Description:
#   D&D related commands.
#
# Commands:
#   hubot maxhp <amount> - Set your character's maximum HP
#   hubot hp <amount> - Set your character's HP to a fixed amount
#   hubot hp +/-<amount> - Add or remove HP from your character
#   hubot maxhp @<username> <amount> - Set another character's maximum HP (DM only)
#   hubot hp @<username> <amount> - Set another character's HP to a fixed amount (DM only)
#   hubot hp @<username> +/-<amount> - Add or remove HP from another character (DM only)

DM_ROLE = 'dungeon master'

module.exports = (robot) ->

  characterNameFrom = (msg) ->
    if msg.match[1]?
      # Explicit username. DM-only
      unless robot.auth.hasRole(msg.message.user, DM_ROLE)
        msg.reply [
          "You can't do that! You're not a *#{DM_ROLE}*."
          "Ask an admin to run `#{robot.name} grant #{msg.message.user.name} the #{DM_ROLE} role`."
        ].join("\n")
        return null

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

  robot.respond /maxhp\s+(?:@?(\w+)\s+)?(\d+)/i, (msg) ->
    amount = parseInt(msg.match[2])

    withCharacter msg, (existing, character) ->
      character.maxHP = amount
      if character.currentHP and character.currentHP < character.maxHP
        character.currentHP = character.maxHP
      msg.reply "@#{character.username}'s maximum HP is now #{amount}."

  robot.respond /hp\s+(?:@?(\w+)\s+)?(\+|-)?\s*(\d+)/i, (msg) ->
    op = msg.match[2] or '='
    amount = parseInt(msg.match[3])

    withCharacter msg, (existing, character) ->
      unless character.maxHP?
        msg.reply [
          "@#{character.username}'s maximum HP isn't set."
          "Please run `@#{robot.name}: maxhp <amount>` first."
        ].join("\n")
        return

      initHP = character.currentHP or character.maxHP

      finalHP = switch op
        when '+' then initHP + amount
        when '-' then initHP - amount
        else amount

      finalHP = character.maxHP if finalHP > character.maxHP
      character.currentHP = finalHP

      lines = ["@#{character.username}'s HP: #{initHP} :point_right: #{finalHP} / #{character.maxHP}"]
      if finalHP <= 0
        lines.push "@#{character.username} is KO'ed!"
      msg.send lines.join("\n")
