const UserSetResolver = require('./user-set')
const DocumentSetResolver = require('./document-set')
const CacheResolver = require('./cache')

const bufferPreprocessor = require('../documentset/preprocessor/buffer')
const cache = require('../models/cache')

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
  },

  async createDocument ({set, channel, lines}, req) {
    const sets = req.robot.documentSets || {}
    const documentSet = sets[set]

    if (!documentSet) throw new Error(`Unknown document set ${set}`)
    const addSpec = documentSet.spec.features.add
    if (!addSpec) throw new Error(`Cannot add to document set ${set}`)
    if (addSpec.userOriented) throw new Error(`Document set ${set} requires a subject`)

    const role = addSpec.role
    if (!role.isAllowed(req.robot, req.user)) throw new Error(`You are not authorized to add to document set ${set}`)

    const theCache = cache.forChannel(req.robot, channel, false)
    if (!theCache) throw new Error(`No lines available in channel ${channel}`)

    const ids = new Set(lines)
    const chosen = theCache.lines.filter(line => ids.delete(line.id))
    if (ids.size > 0) throw new Error(`Unable to find lines with IDs: ${Array.from(ids).join(', ')}`)
    chosen.reverse()

    const processed = bufferPreprocessor.fromLines(req.robot, chosen)
    const formatted = addSpec.formatter(processed.lines, processed.speakers, processed.mentions)

    const body = formatted.body
    const attributes = []
    for (const value of formatted.speakers) {
      attributes.push({kind: 'speaker', value})
    }
    for (const value of formatted.mentions) {
      attributes.push({kind: 'mention', value})
    }

    const doc = await documentSet.add(req.user.name, body, attributes)
    return new DocumentSetResolver(doc)
  }
}
