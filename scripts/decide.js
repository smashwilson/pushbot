// Description:
//   Help you make the hard decisions.
//
// Commands:
//   hubot decide "<option 1>" "<option 2>" "<option 3>" - Use complex algorithms and advanced AI to give sage advice
//   hubot shawin "<option 1>" "<option 2>" "<option 3>" - Use actual complex algorithms to give sage advice

const _ = require('underscore')
const crypto = require('crypto')

const parseOptions = function (str) {
  const results = []

  let currentOption = ''
  let inQuotedOption = false
  let inPlainOption = false

  for (let letter of Array.from(str)) {
    switch (false) {
      case !inQuotedOption || (letter !== '"'):
        // End the current quoted option
        results.push(currentOption)
        currentOption = ''

        inQuotedOption = false
        break
      case !inQuotedOption:
        // Append to the current option, whitespace and all
        currentOption += letter
        break
      case !inPlainOption || !/\s/.test(letter):
        // End the current plain option
        results.push(currentOption)
        currentOption = ''

        inPlainOption = false
        break
      case !inPlainOption:
        // Append non-whitespace to the current option
        currentOption += letter
        break
      case letter !== '"':
        // Begin a quoted option
        inQuotedOption = true
        break
      case !/\S/.test(letter):
        // Begin a plain option with this character
        inPlainOption = true
        currentOption = letter
        break
    }
  }

  // Complete the final option.
  results.push(currentOption)

  return _.without(results, '')
}

const shaify = function (str) {
  const hash = crypto.createHmac('sha512', 'supersecretzomg')
  hash.update(str)
  const hexDigest = hash.digest('hex')
  // There is probably a less dumb way of doing this but OH WELL
  return parseInt(hexDigest, 16)
}

module.exports = function (robot) {
  robot.respond(/(?:decide|choose)(.*)/, function (msg) {
    const options = parseOptions(msg.match[1])
    const choice = msg.random(options)

    msg.reply(msg.random([
      `Definitely ${choice}.`,
      `Absolutely ${choice}.`,
      `No question: ${choice}.`,
      `${choice}, no doubt about it.`,
      `${choice}, I guess.`,
      `${choice} all the way.`,
      `Those are all terrible, but if you _have_ to pick one, go with ${choice}.`,
      `All good options, but if you must... go with ${choice}.`,
      `${choice}! Now! Faster! THERE'S NO TIME!`
    ]))
  })

  return robot.respond(/shawin(.*)/, function (msg) {
    const options = parseOptions(msg.match[1])
    const concat = options.join('')
    const concatSha = shaify(concat)
    const optionsSha = (Array.from(options).map((opt) => shaify(opt)))
    const diffs = (Array.from(optionsSha).map((sha) => Math.abs(sha - concatSha)))
    // Courtesy http://stackoverflow.com/a/11301464
    const choiceInd = diffs.indexOf(Math.min.apply(Math, diffs))
    msg.send(`The winner is ${options[choiceInd]}`)
  })
}
