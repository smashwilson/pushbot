const moment = require('moment-timezone')

const { createDocumentSet } = require('../../scripts/documentset')
const { OnlyMe } = require('./roles')
const Line = require('../../scripts/models/line')

describe('DocumentSet add', function () {
  let bot, time, documentSet

  beforeEach(function () {
    bot = new BotContext()
    time = new TimeContext()
  })

  afterEach(function () {
    bot.destroy()
    time.destroy()
    if (documentSet) {
      return documentSet.destroy()
    }
  })

  it('creates "slackapp blarf:"', async function () {
    usesDatabase(this)

    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { add: true })

    const blarfToAdd = 'person-one [2:00 PM] \n' +
      'foo bar baz\n' +
      '\n' +
      '[2:01]  \n' +
      'aaa bbb ccc\n'

    const expectedBlarf = '[2:00 PM 9 Apr 2017] person-one: foo bar baz\n' +
      '[2:01 PM 9 Apr 2017] person-one: aaa bbb ccc'

    await documentSet.whenConnected()
    await bot.say('me', `@hubot slackapp blarf: ${blarfToAdd}`)
    await bot.waitForResponse('1 blarf loaded.')

    const doc = await documentSet.randomMatching({}, '"foo bar baz"')
    expect(doc.getBody()).to.equal(expectedBlarf)
  })

  it('extracts "speaker" attributes from slackapp input', async function () {
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { add: true })

    const blarfToAdd = 'person-one [2:00 PM] \n' +
      'one one one' +
      '\n' +
      '[2:01]  \n' +
      'two two two\n' +
      '\n' +
      'person-two [9:09 AM] \n' +
      'three three three'

    const expectedBlarf = '[2:00 PM 9 Apr 2017] person-one: one one one\n' +
      '[2:01 PM 9 Apr 2017] person-one: two two two\n' +
      '[9:09 AM 9 Apr 2017] person-two: three three three'

    await documentSet.whenConnected()
    await bot.say('me', `@hubot slackapp blarf: ${blarfToAdd}`)
    await bot.waitForResponse('1 blarf loaded.')

    const doc = await documentSet.randomMatching({ speaker: ['person-one', 'person-two'] }, '')
    expect(doc.getBody()).to.equal(expectedBlarf)
  })

  it('extracts "mention" attributes from slackapp input', async function () {
    usesDatabase(this)

    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { add: true })

    const blarfToAdd = 'person-one [2:00 PM] \n' +
      'one one one' +
      '\n' +
      '[2:01]  \n' +
      '@person-two: two two two\n' +
      '\n' +
      'person-two [9:09 AM] \n' +
      'three three three person-three'

    const expectedBlarf = '[2:00 PM 9 Apr 2017] person-one: one one one\n' +
      '[2:01 PM 9 Apr 2017] person-one: @person-two: two two two\n' +
      '[9:09 AM 9 Apr 2017] person-two: three three three person-three'

    bot.createUser('1', 'person-one')
    bot.createUser('2', 'person-two')
    bot.createUser('3', 'person-three')
    bot.createUser('4', 'person-four')

    await documentSet.whenConnected()
    await bot.say('me', `@hubot slackapp blarf: ${blarfToAdd}`)
    await bot.waitForResponse('1 blarf loaded.')

    const doc = await documentSet.randomMatching({ mention: ['person-two', 'person-three'] }, '')
    expect(doc.getBody()).to.equal(expectedBlarf)
  })

  it('removes "new messages" from "slackapp blarf:"', async function () {
    usesDatabase(this)

    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { add: true })

    const blarfToAdd = 'person-one [2:00 PM] \n' +
      'one one one' +
      '\n' +
      '[2:01]  \n' +
      'two two two\n' +
      '\n' +
      'new messages\n' +
      '\n' +
      'person-two [9:09 AM] \n' +
      'three three three'

    const expectedBlarf = '[2:00 PM 9 Apr 2017] person-one: one one one\n' +
      '[2:01 PM 9 Apr 2017] person-one: two two two\n' +
      '[9:09 AM 9 Apr 2017] person-two: three three three'

    await documentSet.whenConnected()
    await bot.say('me', `@hubot slackapp blarf: ${blarfToAdd}`)
    await bot.waitForResponse('1 blarf loaded.')

    const doc = await documentSet.randomMatching([], '"two two two"')
    expect(doc.getBody()).to.equal(expectedBlarf)
  })

  it('removes "edited" from "slackapp blarf:"', async function () {
    usesDatabase(this)
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { add: true })

    const blarfToAdd = 'person-one [8:53 PM] \n' +
      'one one one' +
      '\n' +
      '[8:53]  \n' +
      'whatever (edited)\n' +
      '\n' +
      '[8:53]  \n' +
      '\n' +
      'three three three'

    const expectedBlarf = '[8:53 PM 9 Apr 2017] person-one: one one one\n' +
      '[8:53 PM 9 Apr 2017] person-one: whatever\n' +
      '[8:53 PM 9 Apr 2017] person-one: three three three'

    await documentSet.whenConnected()
    await bot.say('me', `@hubot slackapp blarf: ${blarfToAdd}`)
    await bot.waitForResponse('1 blarf loaded.')

    const doc = await documentSet.randomMatching([], 'whatever')
    expect(doc.getBody()).to.equal(expectedBlarf)
  })

  it('removes APP from integration output in "slackapp blarf:"', async function () {
    usesDatabase(this)
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { add: true })

    const blarfToAdd = 'me [1:10 PM]\n' +
      '!quote\n' +
      '\n' +
      'pushbotAPP [1:10 PM]\n' +
      'some response\n' +
      '\n' +
      'someone-else [1:20 PM]\n' +
      'more text' +
      '\n'

    const expectedBlarf = '[1:10 PM 9 Apr 2017] me: !quote\n' +
      '[1:10 PM 9 Apr 2017] pushbot: some response\n' +
      '[1:20 PM 9 Apr 2017] someone-else: more text'

    await documentSet.whenConnected()
    await bot.say('me', `@hubot slackapp blarf: ${blarfToAdd}`)
    await bot.waitForResponse('1 blarf loaded.')

    const doc = await documentSet.randomMatching([], 'response')
    expect(doc.getBody()).to.equal(expectedBlarf)
  })

  it('rejects malformed "slackapp blarf:" input', async function () {
    usesDatabase(this)
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { add: true })

    const malformedBlarf = '!quote\n' +
      '\n' +
      'person [1:10 PM]\n' +
      'some response\n'

    await documentSet.whenConnected()
    await bot.say('me', `@hubot slackapp blarf: ${malformedBlarf}`)
    await bot.waitForResponse(/sadtrombone\.com/)
  })

  it('creates "verbatim blarf:"', async function () {
    usesDatabase(this)
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { add: true })

    const verbatimBlarf = 'look ma\n' +
      'no formatting'

    await documentSet.whenConnected()
    await bot.say('me', `@hubot verbatim blarf: ${verbatimBlarf}`)
    await bot.waitForResponse('1 blarf loaded.')

    const doc = await documentSet.randomMatching([], 'formatting')
    expect(doc.getBody()).to.equal(verbatimBlarf)
  })

  it('extracts "mention" attributes from verbatim input', async function () {
    usesDatabase(this)
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { add: true })

    const verbatimBlarf = 'something about person-four\n' +
      'and @person-two with an @\n' +
      'andperson-onebutnotreally'

    bot.createUser('1', 'person-one')
    bot.createUser('2', 'person-two')
    bot.createUser('3', 'person-three')
    bot.createUser('4', 'person-four')

    await documentSet.whenConnected()
    await bot.say('me', `@hubot verbatim blarf: ${verbatimBlarf}`)
    await bot.waitForResponse('1 blarf loaded.')

    const doc = await documentSet.randomMatching({ mention: ['person-two', 'person-four'] }, '')
    expect(doc.getBody()).to.equal(verbatimBlarf)
  })

  it('creates "buffer blarf"', async function () {
    usesDatabase(this)
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { add: true })

    bot.load('buffer.js')

    const ts = hhmm => moment.tz(`2017-04-01 ${hhmm}`, 'YYYY-MM-DD HH:mm', 'America/New_York')
    const buffer = bot.getRobot().bufferForUserId('me')
    buffer.append([
      new Line(ts('9:30'), 'person-one', 'one one one'),
      new Line(ts('9:31'), 'person-two', 'two two two'),
      new Line(ts('9:32'), 'person-three', 'three three three')
    ])

    const expectedBlarf = '[9:30 AM 1 Apr 2017] person-one: one one one\n' +
      '[9:31 AM 1 Apr 2017] person-two: two two two\n' +
      '[9:32 AM 1 Apr 2017] person-three: three three three'

    await documentSet.whenConnected()
    await bot.say('me', '@hubot buffer blarf')
    await bot.waitForResponse(/1 blarf loaded\./)

    const doc = await documentSet.randomMatching([], 'two')
    expect(doc.getBody()).to.equal(expectedBlarf)
  })

  it('extracts "speaker" attributes from buffer input', async function () {
    usesDatabase(this)
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { add: true })

    bot.load('buffer.js')

    const ts = hhmm => moment.tz(`2017-04-01 ${hhmm}`, 'YYYY-MM-DD HH:mm', 'America/New_York')
    const buffer = bot.getRobot().bufferForUserId('me')
    buffer.append([
      new Line(ts('10:00'), 'person-one', 'person-four: one one one'),
      new Line(ts('10:01'), 'person-two', 'two two two'),
      new Line(ts('10:01'), 'person-one', 'three three three @person-one')
    ])

    const expectedBlarf = '[10:00 AM 1 Apr 2017] person-one: person-four: one one one\n' +
      '[10:01 AM 1 Apr 2017] person-two: two two two\n' +
      '[10:01 AM 1 Apr 2017] person-one: three three three @person-one'

    await documentSet.whenConnected()
    await bot.say('me', '@hubot buffer blarf')
    await bot.waitForResponse(/1 blarf loaded\./)

    const doc = await documentSet.randomMatching({ speaker: ['person-one', 'person-two'] }, '')
    expect(doc.getBody()).to.equal(expectedBlarf)
  })

  it('extracts "mention" attributes from buffer input', async function () {
    usesDatabase(this)
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { add: true })

    bot.load('buffer.js')

    const ts = hhmm => moment.tz(`2017-04-01 ${hhmm}`, 'YYYY-MM-DD HH:mm', 'America/New_York')
    const buffer = bot.getRobot().bufferForUserId('me')
    buffer.append([
      new Line(ts('10:00'), 'person-one', 'one one one @person-two'),
      new Line(ts('10:01'), 'person-two', 'two two two'),
      new Line(ts('10:01'), 'person-one', 'three three three person-three')
    ])

    const expectedBlarf = '[10:00 AM 1 Apr 2017] person-one: one one one @person-two\n' +
      '[10:01 AM 1 Apr 2017] person-two: two two two\n' +
      '[10:01 AM 1 Apr 2017] person-one: three three three person-three'

    bot.createUser('1', 'person-one')
    bot.createUser('2', 'person-two')
    bot.createUser('3', 'person-three')
    bot.createUser('4', 'person-four')

    await documentSet.whenConnected()
    await bot.say('me', '@hubot buffer blarf')
    await bot.waitForResponse(/1 blarf loaded\./)

    const doc = await documentSet.randomMatching({ mention: ['person-two', 'person-three'] }, '')
    expect(doc.getBody()).to.equal(expectedBlarf)
  })

  it('can be configured with a document formatter', async function () {
    usesDatabase(this)
    documentSet = createDocumentSet(bot.getRobot(), 'blarf', {
      add: {
        formatter: (lines, speakers, mentions) => {
          return {
            body: lines.map(line => `[${line.speaker}] ${line.text}`).join(', '),
            speakers,
            mentions
          }
        }
      }
    })

    const source = 'person-one [2:00 PM] \n' +
      'one one one' +
      '\n' +
      '[2:01]  \n' +
      'two two two\n' +
      '\n' +
      'person-two [9:09 AM] \n' +
      'three three three'

    const expected = '[person-one] one one one, [person-one] two two two, [person-two] three three three'

    await bot.say('me', `@hubot slackapp blarf: ${source}`)
    await bot.waitForResponse('1 blarf loaded.')

    const doc = await documentSet.randomMatching({ speaker: ['person-one', 'person-two'] }, '')
    expect(doc.getBody()).to.equal(expected)
  })

  it('validates a required role', async function () {
    documentSet = createDocumentSet(bot.getRobot(), 'blarf',
      { add: { role: OnlyMe } }
    )

    await documentSet.whenConnected()
    await bot.say('you', '@hubot verbatim blarf: nope')
    await bot.waitForResponse('@you NOPE')

    expect(await documentSet.countMatching({}, '')).to.equal(0)
  })

  it('generates default help text', async function () {
    usesDatabase(this)
    await bot.loadHelp()

    documentSet = createDocumentSet(bot.getRobot(), 'blarf', { add: true })
    await bot.say('me', '@hubot help blarf')
    await bot.waitForResponse(/buffer blarf/)

    const messages = bot.helpLines()

    expect(messages).to.include("hubot slackapp blarf: <source> - Parse a blarf from the Slack app's paste format.")
    expect(messages).to.include('hubot verbatim blarf: <source> - Insert a blarf exactly as given.')
    expect(messages).to.include('hubot buffer blarf - Insert a blarf from the current contents of your buffer.')
  })

  it('accepts custom help text', async function () {
    usesDatabase(this)
    await bot.loadHelp()

    documentSet = createDocumentSet(bot.getRobot(), 'blarf', {
      add: {
        helpText: [
          'hubot blarf 1 - First line',
          'hubot blarf 2 - Second line'
        ]
      }
    })

    await bot.say('me', '@hubot help blarf')
    await bot.waitForResponse(/blarf/)

    const messages = bot.helpLines()
    expect(messages).to.include('hubot blarf 1 - First line')
    expect(messages).to.include('hubot blarf 2 - Second line')
  })
})
