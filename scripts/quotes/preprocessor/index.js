// Export quote parsers as a convenient map.

// Standard preprocessing.
function processThen(text, parser) {
  const preprocessed = text.replace(/\u200B/g, '');
  return parser(preprocessed);
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
