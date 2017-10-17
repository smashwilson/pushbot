const Helper = require('hubot-test-helper')
const {createDocumentSet} = require('../../scripts/documentset')
const cache = require('../../scripts/models/cache')

const resolver = require('../../scripts/api/root')

const helper = new Helper([])

describe('GraphQL mutations', function () {
  let room, blarfSet
  let authorized, unauthorized

  beforeEach(function () {
    usesDatabase(this)
    cache.clear()

    room = helper.createRoom({httpd: false})
    room.robot.postgres = global.database

    authorized = room.robot.brain.userForId('1', {name: 'authy'})
    unauthorized = room.robot.brain.userForId('2', {name: 'fenris'})

    blarfSet = createDocumentSet(room.robot, 'blarf', {
      add: {
        role: { isAllowed (robot, user) { return user === authorized } }
      }
    })
  })

  afterEach(function () {
    room.destroy()
    return blarfSet.destroy()
  })

  describe('createDocument', function () {
    let lineIDs

    beforeEach(function () {
      const c = cache.forChannel(room.robot, 'general')
        .append(message('aaa', 'line one'))
        .append(message('bbb', 'line two\nline three'))
        .append(message('ccc', 'line four'))

      lineIDs = c.lines.map(line => line.id)
      lineIDs.reverse()

      room.robot.adapter.client = {
        rtm: {
          dataStore: {
            getChannelGroupOrDMById (id) {
              if (id === 'C100') return {name: 'general'}
              return undefined
            }
          }
        }
      }
    })

    it('rejects a request from a user without the required role', function () {
      return resolver.createDocument(
        {set: 'blarf', channel: 'general', lines: [lineIDs[0]]},
        {robot: room.robot, user: unauthorized}
      ).then(() => new Error('Did not reject'), err => expect(err.message).to.match(/not authorized/))
    })

    it('rejects a request with an invalid line ID', function () {
      return resolver.createDocument(
        {set: 'blarf', channel: 'general', lines: ['no']},
        {robot: room.robot, user: authorized}
      ).then(() => new Error('Did not reject'), err => expect(err.message).to.match(/no/))
    })

    it('rejects a request with an invalid channel')
    it('adds a document from the cache')
    it('chooses a channel by ID or name')
  })
})
