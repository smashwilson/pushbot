// Required first.

const path = require('path')
const pg = require('pg-promise')()
const Hubot = require('hubot')
const hubotHelp = require('hubot-help')
const hubotAuth = require('hubot-auth')

const Helper = require('hubot-test-helper')
const moment = require('moment-timezone')

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

global.message = function (username, line) {
  return {
    message: {
      text: line,
      user: {name: username}
    }
  }
}

global.BotContext = class {
  constructor (...scriptPaths) {
    this.helper = new Helper(scriptPaths)
    this.room = this.helper.createRoom({httpd: false})

    if (global.database) {
      this.room.robot.postgres = global.database
    }
  }

  destroy () {
    return this.room.destroy()
  }

  getRobot () {
    return this.room.robot
  }

  createUser (uid, username, extra = {}) {
    const udata = {id: uid, name: username, ...extra}
    this.room.robot.brain.users()[uid] = udata
    return udata
  }

  load (filename) {
    this.room.robot.loadFile(path.join(__dirname, '..', 'scripts'), filename)
  }

  async loadHelp () {
    hubotHelp(this.room.robot, '*')
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  async loadAuth (adminID = '0') {
    process.env.HUBOT_AUTH_ADMIN = adminID
    hubotAuth(this.room.robot, '*')

    const room = this.room
    this.room.receive = async function (userName, message) {
      this.messages.push([userName, message])
      const user = room.robot.brain.userForName(userName) ||
        room.robot.brain.userForId('0', {name: userName, room})
      await new Promise(resolve => room.robot.receive(new Hubot.TextMessage(user, message), resolve))
    }

    return new Promise(resolve => setTimeout(resolve, 20))
  }

  say (...args) {
    return this.room.user.say(...args)
  }

  response () {
    const lastInd = this.room.messages.length - 1
    const message = this.room.messages[lastInd]
    if (!message || message[0] !== 'hubot') return null
    return message[1]
  }

  helpLines () {
    return this.room.messages
      .filter(pair => pair[0] === 'hubot')
      .map(pair => pair[1].replace(/^@me\s+/, ''))
      .reduce((acc, line) => acc.concat(line.split(/\n/)), [])
  }

  async waitForResponse (pattern) {
    const matches = typeof pattern === 'string'
      ? r => r === pattern
      : r => pattern.test(r)

    for (let i = 0; i < 100; i++) {
      if (matches(this.response())) {
        return
      }

      await new Promise(resolve => setTimeout(resolve, 10))
    }

    console.error(this.room.messages)
    throw new Error(`Timed out waiting for a response matching ${pattern}`)
  }
}

global.TimeContext = class {
  constructor () {
    const ts = moment.tz('2017-04-09T15:28:30', moment.ISO_8601, 'America/New_York').valueOf()
    this.realNow = moment.now
    moment.now = () => ts
  }

  destroy () {
    moment.now = this.realNow
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
