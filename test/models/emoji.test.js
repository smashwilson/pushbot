const {emojiCacheFor} = require('../../scripts/models/emoji')

describe('EmojiCache', function () {
  let bot

  beforeEach(function () {
    bot = new BotContext()
  })

  afterEach(function () {
    bot.destroy()
  })

  function stubEndpoint () {
    const list = sinon.stub()
    bot.getRobot().adapter.client = {
      web: { emoji: { list } }
    }
    return list
  }

  describe('when empty', function () {
    it('sends a request to the Slack API', async function () {
      const api = stubEndpoint().returns(Promise.resolve({
        ok: true,
        emoji: {
          squirrel: 'https://media0.giphy.com/media/SztNh2RqJmXVC/giphy.gif'
        }
      }))

      await emojiCacheFor(bot.getRobot()).get('squirrel')
      expect(api.called).to.be.true
    })

    it('retrieves a custom emoji URL', async function () {
      stubEndpoint().returns(Promise.resolve({
        ok: true,
        emoji: {
          squirrel: 'https://media0.giphy.com/media/SztNh2RqJmXVC/giphy.gif'
        }
      }))

      const url = await emojiCacheFor(bot.getRobot()).get('squirrel')
      expect(url).to.equal('https://media0.giphy.com/media/SztNh2RqJmXVC/giphy.gif')
    })

    it('is a no-op when the Slack adapter is not present', async function () {
      const result = await emojiCacheFor(bot.getRobot()).get('something')
      expect(result).to.be.null
    })
  })

  describe('when populated', function () {
    beforeEach(function () {
      bot.store('slack:emoji', {
        emoji: {
          sausage: 'https://media0.giphy.com/media/SztNh2RqJmXVC/giphy.gif',
          sassage: 'alias:sausage'
        },
        age: Date.now()
      })
    })

    it('retrieves a custom emoji URL', async function () {
      const result = await emojiCacheFor(bot.getRobot()).get('sausage')
      expect(result).to.equal('https://media0.giphy.com/media/SztNh2RqJmXVC/giphy.gif')
    })

    it('returns null for unknown or non-custom emoji', async function () {
      const result = await emojiCacheFor(bot.getRobot()).get('no')
      expect(result).to.be.null
    })
  })

  describe('when expired', function () {
    let api

    beforeEach(function () {
      bot.store('slack:emoji', {
        emoji: {
          sausage: 'https://media0.giphy.com/media/SztNh2RqJmXVC/giphy.gif'
        },
        age: Date.now() - 2 * 60 * 60 * 1000
      })

      api = stubEndpoint().returns(Promise.resolve({
        ok: true,
        emoji: {
          sausage: 'https://user-images.githubusercontent.com/13645/35175029-ce6be492-fd3f-11e7-9dba-ea3ffc6982c4.png'
        }
      }))
    })

    it('triggers a new request to the Slack API', async function () {
      await emojiCacheFor(bot.getRobot()).get('sausage')
      expect(api.called).to.be.true
    })

    it('does not return new data yet', async function () {
      const url = await emojiCacheFor(bot.getRobot()).get('sausage')
      expect(url).to.equal('https://media0.giphy.com/media/SztNh2RqJmXVC/giphy.gif')
    })
  })
})
