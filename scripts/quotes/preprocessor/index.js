// Export quote parsers as a convenient map.

// Standard preprocessing.
function processThen(parser) {
  return function(robot, msg) {
    const preprocessed = msg.match[1].replace(/\u200B/g, '');
    return parser(preprocessed);
  }
}

exports.verbatim = {
  argument: true,
  echo: false,
  call: processThen(require('./verbatim'))
};

exports.slackapp = {
  argument: true,
  echo: false,
  call: processThen(require('./slackapp'))
};
