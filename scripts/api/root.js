const UserResolver = require('./user')

module.exports = {
  me (args, req) {
    return new UserResolver(req.user)
  }
}
