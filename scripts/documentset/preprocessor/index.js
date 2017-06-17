// Export quote parsers as a convenient map.

// Standard preprocessing.
function processThen (parser) {
  return function (robot, msg) {
    const preprocessed = msg.match[1].replace(/\u200B/g, '')
    return parser(robot, preprocessed)
  }
}

exports.verbatim = {
  argument: true,
  echo: false,
  defaultHelpText: 'Insert a %s exactly as given.',
  call: processThen(require('./verbatim'))
}

exports.slackapp = {
  argument: true,
  echo: false,
  defaultHelpText: "Parse a %s from the Slack app's paste format.",
  call: processThen(require('./slackapp'))
}

exports.buffer = {
  argument: false,
  echo: true,
  defaultHelpText: 'Insert a %s from the current contents of your buffer.',
  call: require('./buffer')
}
