const UserResolver = require('./user')
const DocumentResolver = require('./document')

module.exports = {
  me (args, req) {
    return new UserResolver(req.user)
  },

  documentSets (args, req) {
    return Object.keys(req.robot.documentSets || {})
  },

  documents ({set}, req) {
    const sets = req.robot.documentSets || {}
    const documentSet = sets[set]

    return documentSet && new DocumentResolver(set, documentSet)
  }
}
