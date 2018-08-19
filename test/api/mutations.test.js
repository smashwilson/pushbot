const Helper = require('hubot-test-helper')
const moment = require('moment-timezone')
const {createDocumentSet} = require('../../scripts/documentset')
const cache = require('../../scripts/models/cache')

const resolver = require('../../scripts/api/root')

const helper = new Helper([])

const ts = moment.tz('2017-10-16 21:30:00-0400', 'America/New_York')

describe('GraphQL mutations', function () {
  let room, blarfSet
  let authorized, unauthorized

  beforeEach(function () {
    usesDatabase(this)
    cache.clear()

    room = helper.createRoom({httpd: false, name: 'C100'})
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
      const c = cache.forChannel(room.robot, 'C100')
        .append(message('aaa', 'line one'), ts)
        .append(message('bbb', 'line two\nline three'), ts)
        .append(message('ccc', 'line four'), ts)

      lineIDs = c.lines.map(line => line.id)
      lineIDs.reverse()

      room.robot.adapter.client = {
        rtm: {
          dataStore: {
            getChannelByName (name) {
              if (name === 'general') return {id: 'C100'}
              return undefined
            }
          }
        }
      }
    })

    it('rejects a request from a user without the required role', function () {
      return resolver.createDocument(
        {set: 'blarf', channel: 'C100', lines: [lineIDs[0]]},
        {robot: room.robot, user: unauthorized}
      ).then(() => new Error('Did not reject'), err => expect(err.message).to.match(/not authorized/))
    })

    it('rejects a request with an invalid line ID', function () {
      return resolver.createDocument(
        {set: 'blarf', channel: 'C100', lines: ['no']},
        {robot: room.robot, user: authorized}
      ).then(() => new Error('Did not reject'), err => expect(err.message).to.match(/no/))
    })

    it('rejects a request with an invalid channel', function () {
      return resolver.createDocument(
        {set: 'blarf', channel: 'nope', lines: [lineIDs[0]]},
        {robot: room.robot, user: authorized}
      ).then(() => new Error('Did not reject'), err => expect(err.message).to.match(/nope/))
    })

    it('rejects requests with an empty line array', function () {
      return resolver.createDocument(
        {set: 'blarf', channel: 'C100', lines: []},
        {robot: room.robot, user: authorized}
      ).then(() => new Error('Did not reject'), err => expect(err.message).to.match(/at least one line/))
    })

    it('adds a document from the cache', async function () {
      const docResolver = await resolver.createDocument(
        {set: 'blarf', channel: 'C100', lines: [lineIDs[1], lineIDs[2]]},
        {robot: room.robot, user: authorized}
      )

      expect(docResolver.found).to.be.true
      expect(docResolver.text).to.equal(
        '[9:30 PM 16 Oct 2017] bbb: line two\n' +
        '[9:30 PM 16 Oct 2017] bbb: line three'
      )
      expect(docResolver.speakers()).to.have.members(['bbb'])
      expect(docResolver.mentions()).to.be.empty

      const doc = await blarfSet.singleMatching({speaker: ['bbb']})
      expect(doc.wasFound()).to.be.true
      expect(doc.id).to.equal(docResolver.id)
      expect(doc.getBody()).to.equal(docResolver.text)
    })

    it('announces the quoting user to the channel', async function () {
      await resolver.createDocument(
        {set: 'blarf', channel: 'C100', lines: [lineIDs[1], lineIDs[3]]},
        {robot: room.robot, user: authorized}
      )

      expect(room.messages).to.deep.equal([
        [
          'hubot',
          '_<@1> quoted_\n' +
          '> bbb: line two\n' +
          '> ccc: line four'
        ]
      ])
    })

    it('preserves the channel order cache of the chosen lines', async function () {
      const docResolver = await resolver.createDocument(
        {set: 'blarf', channel: 'C100', lines: [lineIDs[2], lineIDs[3], lineIDs[1]]},
        {robot: room.robot, user: authorized}
      )

      expect(docResolver.found).to.be.true
      expect(docResolver.text).to.equal(
        '[9:30 PM 16 Oct 2017] bbb: line two\n' +
        '[9:30 PM 16 Oct 2017] bbb: line three\n' +
        '[9:30 PM 16 Oct 2017] ccc: line four'
      )
      expect(docResolver.speakers()).to.have.members(['bbb', 'ccc'])
      expect(docResolver.mentions()).to.be.empty

      const doc = await blarfSet.singleMatching({speaker: ['bbb']})
      expect(doc.wasFound()).to.be.true
      expect(doc.id).to.equal(docResolver.id)
      expect(doc.getBody()).to.equal(docResolver.text)
    })

    it('chooses a channel by ID or name', async function () {
      const docResolver = await resolver.createDocument(
        {set: 'blarf', channel: 'general', lines: [lineIDs[0]]},
        {robot: room.robot, user: authorized}
      )

      expect(docResolver.found).to.be.true
      expect(docResolver.text).to.equal(
        '[9:30 PM 16 Oct 2017] aaa: line one'
      )
    })
  })
})
