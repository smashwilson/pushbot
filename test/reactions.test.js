describe('reactions', function () {
  let bot

  beforeEach(function () {
    bot = new BotContext('../scripts/reactions.js')
    for (let i = 0; i < 20; i++) {
      bot.createUser(i.toString(), `user-${i}`)
    }
  })

  afterEach(function () {
    bot.destroy()
  })

  describe('recording', function () {
    it('tallies reactions given and received', async function () {
      await bot.addReaction('1', 'thumbsup', '2')
      await bot.addReaction('1', 'beachball', '2')
      await bot.addReaction('2', 'smile', '1')
      await bot.addReaction('3', 'thumbsup', '2')
      await bot.addReaction('3', '100', '2')
      await bot.removeReaction('1', 'beachball', '2')

      expect(bot.get('reactionsReceived')).to.deep.equal({
        '1': { smile: 1 },
        '2': { thumbsup: 2, '100': 1 }
      })

      expect(bot.get('reactionsGiven')).to.deep.equal({
        '1': { thumbsup: 1 },
        '2': { smile: 1 },
        '3': { thumbsup: 1, '100': 1 }
      })
    })

    it('ignores reactions you give yourself', async function () {
      await bot.addReaction('1', 'thumbsup', '2')
      await bot.addReaction('1', 'thumbsup', '1')

      expect(bot.get('reactionsReceived')).to.deep.equal({
        '2': { thumbsup: 1 }
      })

      expect(bot.get('reactionsGiven')).to.deep.equal({
        '1': { thumbsup: 1 }
      })
    })
  })

  describe('!reactions', function () {
    it('returns your top ten reactions, in descending order', async function () {
      bot.store('reactionsReceived', {
        '1': {
          'emoji-00': 100,
          'emoji-01': 90,
          'emoji-02': 86,
          'emoji-03': 80,
          'emoji-04': 70,
          'emoji-05': 69,
          'emoji-06': 43,
          'emoji-07': 41,
          'emoji-08': 37,
          'emoji-09': 36,
          'emoji-10': 35,
          'emoji-11': 10,
          'emoji-12': 2
        }
      })

      await bot.say('1', 'hubot: reactions')
      expect(bot.response()).to.equal([
        '*Top 10 reactions to <@1>*',
        ':emoji-00: x100',
        ':emoji-01: x90',
        ':emoji-02: x86',
        ':emoji-03: x80',
        ':emoji-04: x70',
        ':emoji-05: x69',
        ':emoji-06: x43',
        ':emoji-07: x41',
        ':emoji-08: x37',
        ':emoji-09: x36'
      ].join('\n'))
    })

    it('returns reactions of a named other user', async function () {
      bot.store('reactionsReceived', {
        '2': {
          'emoji-00': 100,
          'emoji-01': 88,
          'emoji-02': 86,
          'emoji-03': 75,
          'emoji-04': 70,
          'emoji-05': 69,
          'emoji-06': 43,
          'emoji-07': 40,
          'emoji-08': 37,
          'emoji-09': 36,
          'emoji-10': 35,
          'emoji-11': 10,
          'emoji-12': 5
        },
        '5': {
          'emoji-00': 100,
          'emoji-01': 90,
          'emoji-02': 86,
          'emoji-03': 80,
          'emoji-04': 70,
          'emoji-05': 69,
          'emoji-06': 43,
          'emoji-07': 41,
          'emoji-08': 37,
          'emoji-09': 36,
          'emoji-10': 35,
          'emoji-11': 10,
          'emoji-12': 2
        }
      })

      await bot.say('1', 'hubot: reactions user-5')
      expect(bot.response()).to.equal([
        '*Top 10 reactions to <@5>*',
        ':emoji-00: x100',
        ':emoji-01: x90',
        ':emoji-02: x86',
        ':emoji-03: x80',
        ':emoji-04: x70',
        ':emoji-05: x69',
        ':emoji-06: x43',
        ':emoji-07: x41',
        ':emoji-08: x37',
        ':emoji-09: x36'
      ].join('\n'))
    })
  })

  describe('!toppun', function () {
    beforeEach(function () {
      bot.store('reactionsReceived', {
        '0': {beachball: 100},
        '1': {beachball: 90, thumbsup: 76},
        '2': {beachball: 80},
        '3': {beachball: 70},
        '4': {beachball: 60},
        '5': {beachball: 50},
        '6': {beachball: 40},
        '7': {beachball: 30},
        '8': {beachball: 20},
        '9': {beachball: 10},
        '10': {beachball: 9},
        '11': {beachball: 8},
        '12': {beachball: 7},
        '13': {beachball: 6},
        '14': {beachball: 5},
        '15': {beachball: 4}
      })
    })

    it('returns the top ten most :beachball:ed users', async function () {
      await bot.say('user-1', 'hubot: toppun')
      expect(bot.response()).to.equal([
        '*Top 10 punmakers*',
        '<@0> has been struck by *100* :beachball:.',
        '<@1> has been struck by *90* :beachball:.',
        '<@2> has been struck by *80* :beachball:.',
        '<@3> has been struck by *70* :beachball:.',
        '<@4> has been struck by *60* :beachball:.',
        '<@5> has been struck by *50* :beachball:.',
        '<@6> has been struck by *40* :beachball:.',
        '<@7> has been struck by *30* :beachball:.',
        '<@8> has been struck by *20* :beachball:.',
        '<@9> has been struck by *10* :beachball:.'
      ].join('\n'))
    })

    it('returns the :beachball: count for a named user', async function () {
      await bot.say('user-3', 'hubot: toppun @user-1')
      expect(bot.response()).to.equal(
        '<@1> has been struck by *90* :beachball:.'
      )
    })
  })
})
