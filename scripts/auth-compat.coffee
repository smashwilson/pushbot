# Description:
#   Patch the msg.message.user model with keys from the user model in storage.

_ = require 'underscore'

module.exports = (robot) ->

  userChange = (user) ->
    return unless user?.id?
    newUser =
      name: user.name
      real_name: user.real_name
      email_address: user.profile.email
      slack: {}

    for key, value of user
      continue if typeof(value) is 'function'
      newUser.slack[key] = value

    if user.id of robot.brain.data.users
      for key, value of robot.brain.data.users[user.id]
        unless key of newUser
          newUser[key] = value
    delete robot.brain.data.users[user.id]
    robot.brain.userForId user.id, newUser

  reloadUsers = ->
    return unless robot.adapter.client?

    count = 0
    for id, user of robot.adapter.client.rtm.dataStore.users
      userChange user
      count++
    count

  robot.brain.on 'loaded', -> reloadUsers()

  robot.receiveMiddleware (context, next, done) ->
    messageUser = context.response.message.user
    storedUser = robot.brain.data.users[messageUser.id]
    _.defaults(messageUser, storedUser) if storedUser?

    next(done)

  robot.respond /reload users/i, (msg) ->
    count = reloadUsers()
    msg.reply "#{count} users reloaded."
