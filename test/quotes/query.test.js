const { OnlyMe } = require('./roles')

const { createDocumentSet } = require('../../scripts/documentset')

describe('DocumentSet query', function () {
  let bot, documentSet

  beforeEach(function () {
    bot = new BotContext()
  })

  afterEach(function () {
    bot.destroy()
    if (documentSet) {
      return documentSet.destroy()
    }
  })

  function populate (commandOpts = true, docs = []) {
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', {
      query: commandOpts
    })

    return Promise.all(
      docs.map(doc => {
        let body = ''
        const attributes = []
        if (doc.body && doc.subject) {
          body = doc.body
          attributes.push({ kind: 'subject', value: doc.subject })
        } else {
          body = doc
        }
        return documentSet.add('me', body, attributes)
      })
    )
  }

  it('returns a random result', async function () {
    usesDatabase(this)

    await populate(true, ['one', 'two', 'three'])
    await bot.say('me', '@hubot blarf')
    await bot.waitForResponse(/^(one|two|three)$/)
  })

  it('returns a random document containing all terms within a query', async function () {
    usesDatabase(this)

    await populate(true, [
      'aaa 111 zzz', 'aaa 222 yyy', 'yyy 333 xxx',
      'aaa nope', 'aaa nope', 'aaa nope', 'aaa nope', 'aaa nope', 'aaa nope', 'aaa nope', 'aaa nope'
    ])
    await bot.say('me', '@hubot blarf aaa 222')
    await bot.waitForResponse('aaa 222 yyy')
  })

  it('escapes regular expression metacharacters within query terms', async function () {
    usesDatabase(this)

    await populate(true, [
      'aaa+bbb', 'nope', 'nope', 'nope', 'nope', 'nope', 'nope', 'nope', 'nope', 'nope', 'nope'
    ])
    await bot.say('me', '@hubot blarf \\+')
    await bot.waitForResponse('aaa+bbb')
  })

  it('collects words within double quotes as a single term', async function () {
    usesDatabase(this)

    await populate(true, [
      'aaa nope bbb', 'aaa nope bbb', 'aaa nope bbb', 'aaa nope bbb', 'aaa nope bbb',
      'correct aaa bbb'
    ])
    await bot.say('me', '@hubot blarf "aaa bbb"')
    await bot.waitForResponse('correct aaa bbb')
  })

  it('collects words within single quotes as a single term', async function () {
    usesDatabase(this)

    await populate(true, [
      'aaa nope bbb', 'aaa nope bbb', 'aaa nope bbb', 'aaa nope bbb', 'aaa nope bbb',
      'correct aaa bbb'
    ])
    await bot.say('me', "@hubot blarf 'aaa bbb'")
    await bot.waitForResponse('correct aaa bbb')
  })

  it('allows terms to contain single and double quotes escaped with a backslash', async function () {
    usesDatabase(this)

    await populate(true, [
      `correct aaa"bbb'ccc`, 'wrong aaabbbccc', 'wrong aaabbbccc', 'wrong aaabbbccc', 'wrong aaabbbccc'
    ])
    await bot.say('me', `@hubot blarf aaa\\"bbb\\'ccc`)
    await bot.waitForResponse(`correct aaa"bbb'ccc`)
  })

  it("permits access based on the caller's role", async function () {
    usesDatabase(this)

    await populate({ role: OnlyMe }, ['aaa'])
    await bot.say('me', '@hubot blarf')
    await bot.waitForResponse('aaa')
  })

  it("prohibits access based on the caller's role", async function () {
    usesDatabase(this)

    await populate({ role: OnlyMe }, ['aaa'])
    await bot.say('you', '@hubot blarf')
    await bot.waitForResponse('@you NOPE')
  })

  it('can be configured to query with a subject user', async function () {
    usesDatabase(this)

    await populate({ userOriented: true }, [
      { body: 'wrong 1', subject: 'me' },
      { body: 'correct', subject: 'you' },
      { body: 'wrong 2', subject: 'other' }
    ])
    await bot.say('me', '@hubot blarf @you')
    await bot.waitForResponse('correct')
  })

  it('can be configured to default to self with no query', async function () {
    usesDatabase(this)

    await populate({ userOriented: true }, [
      { body: 'wrong 1', subject: 'you' },
      { body: 'wrong 2', subject: 'you' },
      { body: 'correct', subject: 'me' },
      { body: 'wrong 3', subject: 'other' },
      { body: 'wrong 4', subject: 'person-four' }
    ])
    await bot.say('me', '@hubot blarf')
    await bot.waitForResponse('correct')
  })

  it('can be configured to return the latest rather than a random result', async function () {
    usesDatabase(this)

    documentSet = createDocumentSet(bot.getRobot(), 'blarf', {
      query: { userOriented: true, latest: true }
    })

    for (let i = 0; i < 10; i++) {
      await documentSet.add('me', `document #${i}`, [{ kind: 'subject', value: 'me' }])
    }
    await documentSet.add('me', 'latest', [{ kind: 'subject', value: 'me' }])

    await bot.say('me', '@hubot blarf')
    await bot.waitForResponse('latest')
  })

  it('generates default help text', async function () {
    await bot.loadHelp()
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { query: true })
    await bot.say('me', '@hubot help blarf')
    await bot.waitForResponse(/blarf/)

    const messages = bot.helpLines()
    expect(messages).to.include('hubot blarf - Return a blarf at random.')
    expect(messages).to.include('hubot blarf <query> - Return a blarf that matches <query>.')
  })

  it('accepts custom help text', async function () {
    await bot.loadHelp()
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', {
      query: {
        helpText: [
          'hubot blarf 1 - line one',
          'hubot blarf 2 - line two'
        ]
      }
    })
    await bot.say('me', '@hubot help blarf')
    await bot.waitForResponse(/blarf/)

    const messages = bot.helpLines()
    expect(messages).to.include('hubot blarf 1 - line one')
    expect(messages).to.include('hubot blarf 2 - line two')
  })
})
