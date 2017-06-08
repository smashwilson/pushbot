const Helper = require('hubot-test-helper')
const helper = new Helper([])

const Cache = require('../../scripts/models/cache')

describe('Cache', function () {
  let room

  beforeEach(function () {
    room = helper.createRoom({httpd: false})
  })

  afterEach(function () {
    room.destroy()
    Cache.clear()
  })

  describe('append', function () {
    it('stores a new line', function () {
      const cache = Cache.forChannel(room.robot, 'C12345678')

      cache.append({message: {
        text: 'the text content',
        user: {name: 'someone'}
      }})

      expect(cache.lines).to.have.length(1)

      const line = cache.lines[0]
      expect(line.speaker).to.equal('someone')
      expect(line.text).to.equal('the text content')
      expect(line.timestamp).to.exist
    })

    it('splits multi-line messages', function () {
      const cache = Cache.forChannel(room.robot, 'C12345678')

      cache.append({message: {
        text: 'multi-line\nmessage',
        user: {name: 'someone'}
      }})

      expect(cache.lines).to.have.length(2)

      const line0 = cache.lines[0]
      expect(line0.speaker).to.equal('someone')
      expect(line0.text).to.equal('message')
      expect(line0.timestamp).to.exist

      const line1 = cache.lines[1]
      expect(line1.speaker).to.equal('someone')
      expect(line1.text).to.equal('multi-line')
      expect(line1.timestamp).to.exist
    })

    it('only stores the most recent lines', function () {
      const cache = Cache.forChannel(room.robot, 'C12345678')

      for (let i = 0; i < Cache.MAX_SIZE + 100; i++) {
        cache.append({message: {
          text: `message #${i}`,
          user: {name: 'someone'}
        }})
      }

      expect(cache.lines).to.have.length(Cache.MAX_SIZE)
      expect(cache.lines[0].text).to.equal(`message #${Cache.MAX_SIZE + 99}`)
    })
  })

  describe('serialization', function () {
    it('serializes and restores state from the brain', function () {
      const cache0a = Cache.forChannel(room.robot, 'C0')
      const cache1a = Cache.forChannel(room.robot, 'C1')

      for (let i = 0; i < 5; i++) {
        cache0a.append({message: {
          text: 'in room C0',
          user: {name: 'someone'}
        }})
      }

      for (let j = 0; j < 3; j++) {
        cache1a.append({message: {
          text: 'in room C1',
          user: {name: 'someone'}
        }})
      }

      Cache.clear()

      const cache0b = Cache.forChannel(room.robot, 'C0')
      const cache1b = Cache.forChannel(room.robot, 'C1')

      expect(cache0b.lines).to.have.length(5)
      expect(cache1b.lines).to.have.length(3)
    })
  })
})
