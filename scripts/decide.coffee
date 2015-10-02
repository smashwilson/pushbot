# Description:
#   Help you make the hard decisions.
#
# Commands:
#   hubot decide "<option 1>" "<option 2>" "<option 3>" - Use complex algorithms and advanced AI to give sage advice

_ = require 'underscore'

parseOptions = (str) ->
  results = []

  currentOption = ""
  inQuotedOption = false
  inPlainOption = false

  for letter in str
    switch
      when inQuotedOption and letter is '"'
        # End the current quoted option
        results.push currentOption
        currentOption = ""

        inQuotedOption = false
      when inQuotedOption
        # Append to the current option, whitespace and all
        currentOption += letter
      when inPlainOption and /\s/.test letter
        # End the current plain option
        results.push currentOption
        currentOption = ""

        inPlainOption = false
      when inPlainOption
        # Append non-whitespace to the current option
        currentOption += letter
      when letter is '"'
        # Begin a quoted option
        inQuotedOption = true
      when /\S/.test letter
        # Begin a plain option with this character
        inPlainOption = true
        currentOption = letter

  # Complete the final option.
  results.push currentOption

  _.without results, ""

module.exports = (robot) ->

  robot.respond /(?:decide|choose)(.*)/, (msg) ->
    options = parseOptions(msg.match[1])
    msg.reply "options = [#{options.join '|'}]"
