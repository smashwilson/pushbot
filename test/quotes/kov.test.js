const {createDocumentSet} = require('../../scripts/documentset')

describe('DocumentSet markov models', function () {
  let bot, time, documentSet

  beforeEach(async function () {
    bot = new BotContext()
    time = new TimeContext()

    process.env.HUBOT_MARKOV_DEFAULT_MODEL = 'false'
    process.env.HUBOT_MARKOV_REVERSE_MODEL = 'false'
    await bot.loadMarkov()
  })

  afterEach(async function () {
    await new Promise(resolve => {
      try {
        bot.getRobot().markov.modelNamed('blarfkov', model => model.destroy(resolve))
      } catch (e) { resolve() }
    })

    bot.destroy()
    time.destroy()
    if (documentSet) {
      return documentSet.destroy()
    }
  })

  it('creates a markov model', async function () {
    expect(() => bot.getRobot().markov.modelNamed('blarfkov', () => {})).to.throw(/Unrecognized model/)

    documentSet = createDocumentSet(bot.getRobot(), 'blarf', {kov: true})

    bot.getRobot().markov.modelNamed('blarfkov', model => {
      expect(model).to.not.be.undefined
    })
  })

  it('adds new documents to the model', async function () {
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', {add: true, kov: true})

    const blarfToAdd = 'person-one [2:00 PM] \n' +
      'foo bar baz\n'

    await documentSet.whenConnected()
    await bot.say('me', `@hubot slackapp blarf: ${blarfToAdd}`)
    await bot.waitForResponse('1 blarf loaded.')

    const output = await new Promise((resolve, reject) => {
      bot.getRobot().markov.modelNamed('blarfkov', model => {
        model.generate('', 10, (err, text) => {
          if (err) return reject(err)
          resolve(text)
        })
      })
    })
    expect(output).to.equal('person-one: foo bar baz')
  })

  it('generates text from the model', async function () {
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', {kov: true})

    await documentSet.whenConnected()
    await new Promise(resolve => {
      bot.getRobot().markov.modelNamed('blarfkov', model => {
        model.learn('aaa bbb ccc', err => {
          expect(err).to.not.be.ok
          resolve()
        })
      })
    })

    await bot.say('me', '@hubot blarfkov')
    await bot.waitForResponse('aaa bbb ccc')
  })

  it('re-indexes the model from all documents', async function () {
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', {})
    await documentSet.add('me', 'aaa bbb ccc', [])
    await documentSet.add('me', 'aaa ddd eee', [])

    documentSet = createDocumentSet(bot.getRobot(), 'blarf', {kov: true})
    await documentSet.whenConnected()
    await bot.say('me', '@hubot reindex blarfkov')
    await bot.waitForResponse('@me Regenerated markov model from 2 blarfs.')

    await bot.say('me', '@hubot blarfkov')
    await bot.waitForResponse(/^aaa (bbb ccc|ddd eee)$/)
  })
})
