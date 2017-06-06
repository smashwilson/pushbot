const Helper = require('hubot-test-helper')
const helper = new Helper('../scripts/buffer.js')

const Cache = require('../scripts/models/cache')

describe('!buffer', function () {
  let room, dm

  beforeEach(function () {
    room = helper.createRoom({httpd: false})
  })

  afterEach(function () {
    room.destroy()
    dm && dm.destroy()
    Cache.clear()
  })

  it('accumulates spoken text into the channel cache', async function () {
    await room.user.say('me', 'one')
    await room.user.say('me', 'two')
    await room.user.say('me', 'three')

    const cache = room.robot.cacheForChannel(room.name)
    expect(cache.lines.map(each => each.text)).to.deep.equal([
      'three', 'two', 'one'
    ])
  })

  it('persists each cache in the brain', async function () {
    await room.user.say('me', 'aaa')
    await room.user.say('you', 'bbb')
    await delay()

    Cache.clear()
    const cache = room.robot.cacheForChannel(room.name)
    expect(cache.lines.map(each => each.text)).to.deep.equal([
      'bbb', 'aaa'
    ])
  })

  describe('help', function () {
    it('shows a brief message in public channels', async function () {
      await room.user.say('me', '@hubot buffer help')
      await delay()

      expect(room.messages).to.deep.equal([
        ['me', '@hubot buffer help'],
        ['hubot', "@me It's a lot of text. Ask me in a DM!"]
      ])
    })

    it('dumps a bunch of text in DM', async function () {
      dm = helper.createRoom({name: 'D100', httpd: false})
      await dm.user.say('me', '@hubot buffer help')
      await delay()

      expect(dm.messages[1][1]).to.match(/buffer add/)
    })
  })

  describe('add', function () {
    it('appends matching lines from the cache to the buffer')
    it('reports if any pattern matches no lines')
    it('reports problems parsing the patterns')
  })

  describe('remove', function () {
    it('removes buffer entries by index')
    it('reports an error for invalid indices')
  })

  describe('show', function () {
    it('reports an empty buffer')
    it('reports buffer contents and indices')
  })

  describe('clear', function () {
    it('removes all buffer entries')
  })
})
