# Description:
#   Update hubot automatically, the lazy way.
#
# Commands:
#   hubot update - Perform a git pull and npm update. Kill the bot if anything is pulled in.

childProcess = require 'child_process'

module.exports = (robot) ->

  robot.respond /update/i, (msg) ->
    changes = false
    try
      msg.send "*git pull*"
      childProcess.exec "git pull", (err, stdout, stderr) ->
        if err?
          msg.send "`git pull` failed:\n```\n#{stderr}\n```\n"
        else
          output = "#{stdout}"
          if /Already up\-to\-date/.test output
            msg.send "No source code changes."
          else
            msg.send "source code changes:\n```\n#{output}\n```\n"
            changes = true

        try
          msg.send "*npm update*"
          childProcess.exec "npm update", (err, stdout, stderr) ->
            if err?
              msg.send "`npm update` failed:\n```\n#{stderr}\n```\n"
            else
              output = "#{stdout}"
              if /node_modules/.test output
                msg.send "Dependencies updated:\n```\n#{output}\n```\n"
                changes = true
              else
                msg.send "No dependency changes."

            if changes
              msg.send ":hocho: :skull:"
              process.exit(0)
            else
              msg.send "Everything's already up to date. :sparkles:"
        catch err
          msg.send "`npm update` failed:\n```\n#{err}\n```\n"
    catch err
      msg.send "`git pull` failed:\n```\n#{err}\n```\n"
