# Description:
#   Pipe-friendly utilities and silly things intended to be used with command piping.
#
# Commands:
#   hubot elcor - Helpfully: repeat lines of speech in their native Elcor.
#   hubot hk47 - Query: why don't you try it and find out, meatbag?

module.exports = (robot) ->

  robot.respond /elcor\s*([^]*)/i, (msg) ->
    adjectives = [
      "Enthusiastically"
      "Sarcastically"
      "Insincerely"
      "Contritely"
      "Angry"
      "Matter-of-factly"
      "Annoyed"
      "Badassfully"
      "Euphemistically"
    ]

    output = []
    for line in msg.match[1].split(/\n/)
      if line.match /\S/
        output.push "#{msg.random adjectives}: #{line}"
    msg.send output.join("\n")

  robot.respond /hk47\s*([^]*)/i, (msg) ->
    adjectives = [
      "Translation"
      "Definition"
      "Mockery"
      "Statement"
      "Observation"
      "Retraction"
      "Explanation"
      "Suggestion"
      "Expletive"
      "Judgement"
    ]

    output = []
    for line in msg.match[1].split(/\n/)
      if line.match /\S/
        output.push "#{msg.random adjectives}: #{line.replace /[.!?,]$/, ""}, meatbag"
    msg.send output.join("\n")
