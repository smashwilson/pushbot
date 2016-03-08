# Description:
#   Help you make the hard decisions.
#
# Commands:
#   hubot decide "<option 1>" "<option 2>" "<option 3>" - Use complex algorithms and advanced AI to give sage advice
#   hubot shawin "<option 1>" "<option 2>" "<option 3>" - Use actual complex algorithms to give sage advice

_ = require 'underscore'
crypto = require 'crypto'

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


shaify = (str) ->
  hash = crypto.createHmac('sha512', 'supersecretzomg')
  hash.update(str)
  hex_digest = hash.digest('hex')
  # There is probably a less dumb way of doing this but OH WELL
  parseInt(hex_digest, 16)

module.exports = (robot) ->

  robot.respond /(?:decide|choose)(.*)/, (msg) ->
    options = parseOptions(msg.match[1])
    choice = msg.random options

    msg.reply msg.random [
      "Definitely #{choice}."
      "Absolutely #{choice}."
      "No question: #{choice}."
      "#{choice}, no doubt about it."
      "#{choice}, I guess."
      "#{choice} all the way."
      "Those are all terrible, but if you _have_ to pick one, go with #{choice}."
      "All good options, but if you must... go with #{choice}."
      "#{choice}! Now! Faster! THERE'S NO TIME!"
    ]

  robot.respond  /shawin(.*)/, (msg) ->
    options = parseOptions(msg.match[1])
    concat = options.join("")
    concat_sha = shaify(concat)
    options_sha = (shaify(opt) for opt in options)
    diffs = (Math.abs(sha - concat_sha) for sha in options_sha)
    # Courtesy http://stackoverflow.com/a/11301464
    choice_index = diffs.indexOf(Math.min.apply(Math, diffs))
    msg.send "The winner is #{options[choice_index]}"
