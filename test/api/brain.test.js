const util = require('util')

const {BrainResolver} = require('../../scripts/api/brain')

describe('BrainResolver', function () {
  let bot, brain, req, resolver
  let authorized, unauthorized

  beforeEach(async function () {
    bot = new BotContext()
    await bot.loadAuth('1')

    authorized = bot.createUser('1', 'authorized')
    unauthorized = bot.createUser('2', 'denied')

    brain = bot.getRobot().brain

    req = {robot: bot.getRobot(), user: authorized}
    resolver = new BrainResolver()
  })

  afterEach(function () {
    bot.destroy()
  })

  describe('keys', function () {
    let allKeys

    beforeEach(function () {
      allKeys = []
      for (let i = 0; i < 10; i++) {
        const prefix = i % 2 === 0 ? 'even' : 'odd'
        const key = `${prefix}-key:${i}`
        allKeys.push(key)
        brain.set(key, `value ${i}`)
      }
    })

    it('only permits admin access', function () {
      expect(() => {
        resolver.keys({}, {robot: bot.getRobot(), user: unauthorized})
      }).to.throw(/must be an admin/)
    })

    it('lists known keys', function () {
      expect(resolver.keys({limit: Infinity, prefix: ''}, req)).to.have.members(allKeys)
    })

    it('limits to the first N results', function () {
      expect(resolver.keys({limit: 5, prefix: ''}, req)).to.have.length(5)
    })

    it('limits by a prefix', function () {
      expect(resolver.keys({limit: Infinity, prefix: 'even'}, req)).to.have.members([
        'even-key:0', 'even-key:2', 'even-key:4', 'even-key:6', 'even-key:8'
      ])
    })
  })

  describe('key', function () {
    let root

    beforeEach(function () {
      root = {
        key0: {
          key00: 'astring',
          key01: 100,
          key02: null
        },
        key1: 'other'
      }
      brain.set('the-key', root)
    })

    it('only permits admin access', function () {
      expect(() => {
        resolver.key({name: 'the-key', property: []}, {robot: bot.getRobot(), user: unauthorized})
      }).to.throw(/must be an admin/)
    })

    it('throws an error if the key is unknown', function () {
      expect(() => resolver.key({name: 'bad-key', property: []}, req)).to.throw(/Unknown key/)
    })

    it('accesses the root-level object of a key as JSON', function () {
      const json = resolver.key({name: 'the-key', property: []}, req).json({pretty: false}, req)
      expect(JSON.parse(json)).to.deep.equal(root)
    })

    it('inspects the root-level object of a key with a given depth', function () {
      const insp = resolver.key({name: 'the-key', property: []}, req).inspect({depth: 2}, req)
      expect(insp).to.equal(util.inspect(root))
    })

    it('enumerates child properties of an object', function () {
      const props = resolver.key({name: 'the-key', property: []}, req).children({}, req)
      expect(props).to.deep.equal(['key0', 'key1'])
    })

    it('accesses a deep property of an object as JSON', function () {
      const child = resolver.key({name: 'the-key', property: ['key0']}, req).json({pretty: false}, req)
      expect(JSON.parse(child)).to.equal({key00: 'astring', key01: 100, key02: null})
    })

    it('inspects a deep property of an object', function () {
      const child = resolver.key({name: 'the-key', property: ['key0', 'key00']}, req).inspect({depth: 1}, req)
      expect(child).to.equal('"astring"')
    })

    it('throws an error if a property in the chain is invalid', function () {
      expect(() => resolver.key({name: 'the-key', property: ['key0', 'no', 'yes']}, req)).to.throw(/Invalid property/)
    })
  })
})
