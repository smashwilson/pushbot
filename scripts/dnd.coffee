# Description:
#   D&D related commands.
#
# Commands:
#   hubot maxhp <username> <amount> - Set a character maximum HP
#   hubot hp <username> <amount> - Set a character's HP to a fixed amount
#   hubot hp <username> +/-<amount> - Add or remove HP from a character

module.exports = (robot) ->

  robot.respond /maxhp\s+@?(\w+)\s+(\d+)/i, (msg) ->
    username = msg.match[1]
    amount = parseInt(msg.match[2])

    robot.brain.set("dnd:maxhp:#{username}", amount)
    msg.reply "#{username}'s maximum HP is now #{amount}."

  robot.respond /hp\s+@?(\w+)\s+(\+|-)\s*(\d+)/i, (msg) ->
    username = msg.match[1]
    op = msg.match[2]
    amount = parseInt(msg.match[3])

    maxHP = robot.brain.get("dnd:maxhp:#{username}")
    if maxHP is null
      msg.reply [
        "#{username}'s maximum HP isn't set."
        "Please run `@#{robot.name}: maxhp #{username} <amount>` first."
      ].join("\n")
      return

    initHP = robot.brain.get("dnd:hp:#{username}")
    initHP = maxHP if currentHP is null

    finalHP = switch op
      when '+' then initHP + amount
      when '-' then initHP - amount
      else initHP

    finalHP = 0 if finalHP < 0
    finalHP = maxHP if finalHP > maxHP

    robot.brain.set("dnd:hp:#{username}", finalHP)

    lines = ["#{username}'s HP: #{initHP} :point_right: #{finalHP}'"]
    if finalHP is 0
      lines.push "#{username} is KO'ed!"

    msg.send lines.join("\n")

  robot.respond /hp\s+@?(\w+)\s*$/i, (msg) ->
    username = msg.match[1]

    maxHP = robot.brain.get("dnd:maxhp:#{username}")
    if maxHP is null
      msg.reply [
        "#{username}'s maximum HP isn't set."
        "Please run `@#{robot.name}: maxhp #{username} <amount>` first."
      ].join("\n")
      return

    currentHP = robot.brain.get("dnd:hp:#{username}")
    currentHP = maxHP if currentHP is null

    msg.send "#{username}: #{currentHP} / #{maxHP}"
