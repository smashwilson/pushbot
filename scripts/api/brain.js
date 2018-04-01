const {Admin} = require('../roles')

function adminOnly (req) {
  if (!Admin.isAllowed(req.robot, req.user)) throw new Error('You must be an admin to perform brain surgery')
}

class BrainResolver {
  keys ({limit, prefix}, req) {
    adminOnly(req)

    const kvs = req.robot.brain.data._private
    const ks = Object.keys(kvs).filter(each => each.startsWith(prefix))
    ks.sort()
    return ks.slice(0, limit)
  }
}

module.exports = {BrainResolver}
