const Helper = require('hubot-test-helper')
const helper = new Helper([])

const CacheResolver = require('../../scripts/api/cache')
const cache = require('../../scripts/models/cache')

function message (username, line) {
  return {
    message: {
      text: line,
      user: {name: username}
    }
  }
}

describe('CacheResolver', function () {
  let room, user, req, resolver

  beforeEach(function () {
    cache.clear()

    room = helper.createRoom({httpd: false})

    const robot = room.robot
    user = robot.brain.userForId('1', {name: 'self'})
    robot.brain.userForId('2', {name: 'aaa'})
    robot.brain.userForId('3', {name: 'bbb'})
    robot.brain.userForId('4', {name: 'ccc'})

    req = {robot, user}
    resolver = new CacheResolver()
  })

  afterEach(function () {
    room.destroy()
  })

  describe('knownChannels', function () {
    it('returns an empty array if no caches are present', function () {
      expect(resolver.knownChannels()).to.eql([])
    })

    it('returns the populated caches', function () {
      cache.forChannel(req.robot, '#general')
      cache.forChannel(req.robot, '#pushbotdev')

      expect(resolver.knownChannels()).to.have.members([
        '#general',
        '#pushbotdev'
      ])
    })
  })

  describe('linesForChannel', function () {
    it('returns an array of cached lines', function () {
      cache.forChannel(req.robot, '#general')
        .append(message('aaa', 'line one'))
        .append(message('bbb', 'line two\nline three'))
        .append(message('ccc', 'line four'))

      const lines = resolver.linesForChannel({channel: '#general'}, req)
      expect(lines).to.have.length(4)

      expect(lines[0].speaker.name).to.equal('aaa')
      expect(lines[0].text).to.equal('line one')

      expect(lines[1].speaker.name).to.equal('bbb')
      expect(lines[1].text).to.equal('line two')

      expect(lines[2].speaker.name).to.equal('bbb')
      expect(lines[2].text).to.equal('line three')

      expect(lines[3].speaker.name).to.equal('ccc')
      expect(lines[3].text).to.equal('line four')
    })

    it('returns an empty array for an empty cache', function () {
      cache.forChannel(req.robot, '#general')

      const lines = resolver.linesForChannel({channel: '#general'}, req)
      expect(lines).to.eql([])
    })

    it('returns null for an unknown channel', function () {
      const lines = resolver.linesForChannel({channel: '#nope'}, req)
      expect(lines).to.be.null
    })
  })
})
