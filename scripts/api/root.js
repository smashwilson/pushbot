const UserSetResolver = require('./user-set')
const DocumentSetResolver = require('./document-set')
const CacheResolver = require('./cache')

module.exports = {
  me (args, req) {
    return new UserSetResolver().me(args, req)
  },

  users () {
    return new UserSetResolver()
  },

  documentSets (args, req) {
    return Object.keys(req.robot.documentSets || {})
  },

  documents ({set}, req) {
    const sets = req.robot.documentSets || {}
    const documentSet = sets[set]

    return documentSet && new DocumentSetResolver(set, documentSet)
  },

  cache () {
    return new CacheResolver()
  }
}
