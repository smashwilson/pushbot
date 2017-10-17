// Export document formatters. Each formatter transforms its arguments (lines, speakers, mentions, userTz) into
// an object with the spec {body, speakers, mentions}.

module.exports = {
  quote: require('./quote'),
  lim: require('./lim')
}
