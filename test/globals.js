// Required first.

const pg = require('pg-promise')()
const hubotHelp = require('hubot-help')
const hubotAuth = require('hubot-auth')
require('hubot-test-helper')

global.expect = require('chai').expect
global.database = process.env.DATABASE_URL ? pg(process.env.DATABASE_URL) : null

global.delay = function (timeoutMs) {
  return function () {
    const timeout = timeoutMs || (database ? 100 : 10)
    return new Promise(resolve => setTimeout(resolve, timeout))
  }
}

global.usesDatabase = function (context, timeoutMs) {
  if (database) {
    const timeout = timeoutMs || 5000
    context.timeout(timeout)
  } else {
    context.skip()
  }
}

global.loadHelp = function (robot) {
  hubotHelp(robot, '*')

  return new Promise(resolve => setTimeout(resolve, 200))
}

global.loadAuth = function (robot, adminID = '0') {
  process.env.HUBOT_AUTH_ADMIN = adminID
  hubotAuth(robot, '*')

  return new Promise(resolve => setTimeout(resolve, 20))
}

global.message = function (username, line) {
  return {
    message: {
      text: line,
      user: {name: username}
    }
  }
}

// eslint-disable-next-line no-extend-native
Promise.prototype.tap = function (chunk) {
  return this.then((...values) => {
    chunk()

    if (values.length > 1) {
      return Promise.all(values)
    } else {
      return values[0]
    }
  })
}
