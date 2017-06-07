const Helper = require('hubot-test-helper')
const helper = new Helper('../scripts/buffer.js')

const Cache = require('../scripts/models/cache')
const Buffer = require('../scripts/models/buffer')

describe('!buffer', function () {
  let room, dm

  beforeEach(function () {
    room = helper.createRoom({httpd: false})
  })

  afterEach(function () {
    room.destroy()
    dm && dm.destroy()

    Cache.clear()
    Buffer.clear()
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
    let buffer

    beforeEach(async function () {
      await room.user.say('me', 'aaa')
      await room.user.say('me', 'bbb')
      await room.user.say('me', 'ccc')
      await room.user.say('me', 'ddd')
      await room.user.say('me', 'eee')
      await delay()

      buffer = Buffer.forUser(room.robot, 'me')
    })

    it('appends matching lines from the cache to the buffer', async function () {
      await room.user.say('me', '@hubot buffer add "bb" ... "dd"')
      await delay()

      expect(room.messages[room.messages.length - 1][1]).to.equal(
        '@me Added 3 lines to your buffer.'
      )
      expect(buffer.contents.map(each => each.text)).to.deep.equal([
        'bbb', 'ccc', 'ddd'
      ])
    })

    it('reports if any pattern matches no lines', async function () {
      await room.user.say('me', '@hubot buffer add "dd" "zzz" "a" .. "b"')
      await delay()

      expect(room.messages[room.messages.length - 1][1]).to.equal(
        '@me No lines were matched by the pattern "zzz".\n' +
        'The earliest line I have is "me: aaa".'
      )
      expect(buffer.contents).to.have.length(0)
    })

    it('reports problems parsing the patterns', async function () {
      await room.user.say('me', '@hubot buffer add oops')
      await delay()

      expect(room.messages[room.messages.length - 1][1]).to.equal(
        '@me :no_entry_sign: You need to quote patterns with \' or " for this command.\n' +
        'Call `/dm hubot buffer help` for a pattern syntax refresher.'
      )
      expect(buffer.contents).to.have.length(0)
    })
  })

  describe('remove', function () {
    let buffer

    beforeEach(async function () {
      await room.user.say('me', 'aaa 000')
      await room.user.say('me', 'bbb 000') // 0
      await room.user.say('me', 'ccc 000') // 1
      await room.user.say('me', 'ddd 000') // 2
      await room.user.say('me', 'eee 000') // 3
      await room.user.say('me', 'aaa 111') // 4
      await room.user.say('me', 'bbb 111') // 5
      await room.user.say('me', 'ccc 111') // 6
      await room.user.say('me', 'ddd 111') // 7
      await room.user.say('me', 'eee 111')
      await room.user.say('me', '@hubot buffer add "bbb 000" ... "ddd 111"')
      await delay()

      buffer = Buffer.forUser(room.robot, 'me')
    })

    it('removes buffer entries by index', async function () {
      await room.user.say('me', '@hubot buffer remove 6 2 4 1')
      await delay()

      expect(room.messages[room.messages.length - 1][1]).to.equal(
        '@me Removed 4 buffer entries.'
      )
      expect(buffer.contents.map(each => each.text)).to.deep.equal([
        'bbb 000', 'eee 000', 'bbb 111', 'ddd 111'
      ])
    })

    it('reports an error for invalid indices', async function () {
      await room.user.say('me', '@hubot buffer remove 10 2 12 3')
      await delay()

      expect(room.messages[room.messages.length - 1][1]).to.equal(
        '@me :no_entry_sign: 10, 12 are not valid buffer indices.'
      )
      expect(buffer.contents.map(each => each.text)).to.deep.equal([
        'bbb 000', 'ccc 000', 'ddd 000', 'eee 000',
        'aaa 111', 'bbb 111', 'ccc 111', 'ddd 111'
      ])
    })
  })

  describe('show', function () {
    it('reports an empty buffer')
    it('reports buffer contents and indices')
  })

  describe('clear', function () {
    it('removes all buffer entries')
  })
})
