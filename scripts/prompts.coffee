# Description:
#   Generate random writing prompts.
#
# Commands:
#   hubot prompt me <n> - Generate n writing prompts.

module.exports = (robot) ->

  robot.respond /prompt\s+me(?:\s+(\d+))?/i, (msg) ->
    count = msg.match[1] or 1

    url = "http://itcamefromwritingprompts.com/api/generate"
    url += "/#{count}" if count > 1

    msg.http(url).get() (err, res, body) ->
      if err?
        msg.send err
        return

      try
        json = JSON.parse(body)
        msg.send prompt for prompt in json.generated
      catch err
        msg.send "Document:\n```\n#{body}\n```"
        msg.send "Error: *#{err}*"
