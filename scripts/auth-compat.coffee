# Description:
#   Patch the msg.message.user model with keys from the user model in storage.

_ = require 'underscore'

module.exports = (robot) ->

  robot.receiveMiddleware (context, next, done) ->
    messageUser = context.response.message.user
    storedUser = robot.brain.data.users[messageUser.id]
    _.defaults(messageUser, storedUser) if storedUser?

    next(done)
