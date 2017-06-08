// Unit tests for the manipulations of arbitrary DocumentSets.

const path = require('path')
const moment = require('moment-timezone')

const Helper = require('hubot-test-helper')
const helper = new Helper([])

const {createDocumentSet} = require('../../scripts/documentset')
const Line = require('../../scripts/models/line')

const OnlyMe = {
  verify: (robot, msg) => {
    if (msg.message.user.name === 'me') {
      return true
    }

    msg.reply('NOPE')
    return false
  }
}

const Nobody = {
  verify: (robot, msg) => {
    return false
  }
}

describe('createDocumentSet', function () {
  let room, documentSet
  let realNow

  beforeEach(function () {
    room = helper.createRoom({httpd: false})
    realNow = moment.now
    moment.now = () => 1491766054971 // Sunday, April 9th 2017, 3:28:30 pm

    if (!global.database) {
      return this.skip()
    }

    room.robot.postgres = global.database
  })

  afterEach(function () {
    room.destroy()
    moment.now = realNow

    if (documentSet) {
      return documentSet.destroy()
    }
  })

  function setUsers (usernames) {
    const userMap = {}
    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i]
      userMap[i] = {name: username}
    }

    room.robot.brain.data.users = userMap
  };

  function helpLines () {
    return room.messages
      .filter(pair => pair[0] === 'hubot')
      .map(pair => pair[1].replace(/^@me\s+/, ''))
      .reduce((acc, line) => acc.concat(line.split(/\n/)), [])
  }

  describe('add', function () {
    it('creates "slackapp blarf:"', function () {
      usesDatabase(this)

      documentSet = createDocumentSet(room.robot, 'blarf', {add: true})

      const blarfToAdd = 'person-one [2:00 PM] \n' +
        'foo bar baz\n' +
        '\n' +
        '[2:01]  \n' +
        'aaa bbb ccc\n'

      const expectedBlarf = '[2:00 PM 9 Apr 2017] person-one: foo bar baz\n' +
        '[2:01 PM 9 Apr 2017] person-one: aaa bbb ccc'

      return documentSet.whenConnected()
      .then(() => room.user.say('me', `@hubot slackapp blarf: ${blarfToAdd}`))
      .then(delay())
      .then(() => {
        expect(room.messages).to.eql([
          ['me', `@hubot slackapp blarf: ${blarfToAdd}`],
          ['hubot', '1 blarf loaded.']
        ])

        return documentSet.randomMatching({}, '"foo bar baz"')
      })
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf))
    })

    it('extracts "speaker" attributes from slackapp input', function () {
      documentSet = createDocumentSet(room.robot, 'blarf', {add: true})

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

      return documentSet.whenConnected()
      .then(() => room.user.say('me', `@hubot slackapp blarf: ${blarfToAdd}`))
      .then(delay())
      .then(() => documentSet.randomMatching({speaker: ['person-one', 'person-two']}, ''))
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf))
    })

    it('extracts "mention" attributes from slackapp input', function () {
      usesDatabase(this)

      documentSet = createDocumentSet(room.robot, 'blarf', {add: true})

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

      setUsers(['person-one', 'person-two', 'person-three', 'person-four'])

      return documentSet.whenConnected()
      .then(() => room.user.say('me', `@hubot slackapp blarf: ${blarfToAdd}`))
      .then(delay())
      .then(() => documentSet.randomMatching({mention: ['person-two', 'person-three']}, ''))
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf))
    })

    it('removes "new messages" from "slackapp blarf:"', function () {
      usesDatabase(this)

      documentSet = createDocumentSet(room.robot, 'blarf', {add: true})

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

      return documentSet.whenConnected()
      .then(() => room.user.say('me', `@hubot slackapp blarf: ${blarfToAdd}`))
      .then(delay())
      .then(() => {
        expect(room.messages).to.eql([
          ['me', `@hubot slackapp blarf: ${blarfToAdd}`],
          ['hubot', '1 blarf loaded.']
        ])

        return documentSet.randomMatching([], '"two two two"')
      })
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf))
    })

    it('removes "edited" from "slackapp blarf:"', function () {
      usesDatabase(this)

      documentSet = createDocumentSet(room.robot, 'blarf', {add: true})

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

      return documentSet.whenConnected()
      .then(() => room.user.say('me', `@hubot slackapp blarf: ${blarfToAdd}`))
      .then(delay())
      .then(() => {
        expect(room.messages).to.eql([
          ['me', `@hubot slackapp blarf: ${blarfToAdd}`],
          ['hubot', '1 blarf loaded.']
        ])

        return documentSet.randomMatching([], 'whatever')
      })
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf))
    })

    it('removes APP from integration output in "slackapp blarf:"', function () {
      usesDatabase(this)

      documentSet = createDocumentSet(room.robot, 'blarf', {add: true})

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

      return documentSet.whenConnected()
      .then(() => room.user.say('me', `@hubot slackapp blarf: ${blarfToAdd}`))
      .then(delay())
      .then(() => {
        expect(room.messages).to.eql([
          ['me', `@hubot slackapp blarf: ${blarfToAdd}`],
          ['hubot', '1 blarf loaded.']
        ])

        return documentSet.randomMatching([], 'response')
      })
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf))
    })

    it('rejects malformed "slackapp blarf:" input', function () {
      usesDatabase(this)

      documentSet = createDocumentSet(room.robot, 'blarf', {add: true})

      const malformedBlarf = '!quote\n' +
        '\n' +
        'person [1:10 PM]\n' +
        'some response\n'

      return documentSet.whenConnected()
      .then(() => room.user.say('me', `@hubot slackapp blarf: ${malformedBlarf}`))
      .then(delay())
      .then(() => {
        expect(room.messages).to.have.length(2)
        expect(room.messages[0]).to.deep.equal(['me', `@hubot slackapp blarf: ${malformedBlarf}`])
        expect(room.messages[1][1]).to.match(/sadtrombone\.com/)
      })
    })

    it('creates "verbatim blarf:"', function () {
      usesDatabase(this)

      documentSet = createDocumentSet(room.robot, 'blarf', {add: true})

      const verbatimBlarf = 'look ma\n' +
        'no formatting'

      return documentSet.whenConnected()
      .then(() => room.user.say('me', `@hubot verbatim blarf: ${verbatimBlarf}`))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', `@hubot verbatim blarf: ${verbatimBlarf}`],
          ['hubot', '1 blarf loaded.']
        ])

        return documentSet.randomMatching({}, 'formatting')
      }).then(doc => expect(doc.getBody()).to.equal(verbatimBlarf))
    })

    it('extracts "mention" attributes from verbatim input', function () {
      usesDatabase(this)

      documentSet = createDocumentSet(room.robot, 'blarf', {add: true})

      const verbatimBlarf = 'something about person-four\n' +
        'and @person-two with an @\n' +
        'andperson-onebutnotreally'

      setUsers(['person-one', 'person-two', 'person-three', 'person-four'])

      return documentSet.whenConnected()
      .then(() => room.user.say('me', `@hubot verbatim blarf: ${verbatimBlarf}`))
      .then(delay())
      .then(() => documentSet.randomMatching({mention: ['person-two', 'person-four']}, ''))
      .then(doc => expect(doc.getBody()).to.equal(verbatimBlarf))
    })

    it('creates "buffer blarf"', function () {
      usesDatabase(this)

      documentSet = createDocumentSet(room.robot, 'blarf', {add: true})

      room.robot.loadFile(path.join(__dirname, '..', '..', 'scripts'), 'buffer.js')

      const ts = hhmm => moment.tz(`2017-04-01 ${hhmm}`, 'YYYY-MM-DD HH:mm', 'America/New_York')
      const buffer = room.robot.bufferForUserId('me')
      buffer.append([
        new Line(ts('9:30'), 'person-one', 'one one one'),
        new Line(ts('9:31'), 'person-two', 'two two two'),
        new Line(ts('9:32'), 'person-three', 'three three three')
      ])

      const expectedBlarf = '[9:30 AM 1 Apr 2017] person-one: one one one\n' +
        '[9:31 AM 1 Apr 2017] person-two: two two two\n' +
        '[9:32 AM 1 Apr 2017] person-three: three three three'

      return documentSet.whenConnected()
      .then(() => room.user.say('me', '@hubot buffer blarf'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot buffer blarf'],
          ['hubot', expectedBlarf],
          ['hubot', '1 blarf loaded.']
        ])

        return documentSet.randomMatching([], 'two')
      })
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf))
    })

    it('extracts "speaker" attributes from buffer input', function () {
      usesDatabase(this)

      documentSet = createDocumentSet(room.robot, 'blarf', {add: true})

      room.robot.loadFile(path.join(__dirname, '..', '..', 'scripts'), 'buffer.js')

      const ts = hhmm => moment.tz(`2017-04-01 ${hhmm}`, 'YYYY-MM-DD HH:mm', 'America/New_York')
      const buffer = room.robot.bufferForUserId('me')
      buffer.append([
        new Line(ts('10:00'), 'person-one', 'person-four: one one one'),
        new Line(ts('10:01'), 'person-two', 'two two two'),
        new Line(ts('10:01'), 'person-one', 'three three three @person-one')
      ])

      const expectedBlarf = '[10:00 AM 1 Apr 2017] person-one: person-four: one one one\n' +
        '[10:01 AM 1 Apr 2017] person-two: two two two\n' +
        '[10:01 AM 1 Apr 2017] person-one: three three three @person-one'

      return documentSet.whenConnected()
      .then(() => room.user.say('me', '@hubot buffer blarf'))
      .then(delay())
      .then(() => documentSet.randomMatching({speaker: ['person-one', 'person-two']}, ''))
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf))
    })

    it('extracts "mention" attributes from buffer input', function () {
      usesDatabase(this)

      documentSet = createDocumentSet(room.robot, 'blarf', {add: true})

      room.robot.loadFile(path.join(__dirname, '..', '..', 'scripts'), 'buffer.js')

      const ts = hhmm => moment.tz(`2017-04-01 ${hhmm}`, 'YYYY-MM-DD HH:mm', 'America/New_York')
      const buffer = room.robot.bufferForUserId('me')
      buffer.append([
        new Line(ts('10:00'), 'person-one', 'one one one @person-two'),
        new Line(ts('10:01'), 'person-two', 'two two two'),
        new Line(ts('10:01'), 'person-one', 'three three three person-three')
      ])

      const expectedBlarf = '[10:00 AM 1 Apr 2017] person-one: one one one @person-two\n' +
        '[10:01 AM 1 Apr 2017] person-two: two two two\n' +
        '[10:01 AM 1 Apr 2017] person-one: three three three person-three'

      setUsers(['person-one', 'person-two', 'person-three', 'person-four'])

      return documentSet.whenConnected()
      .then(() => room.user.say('me', '@hubot buffer blarf'))
      .then(delay())
      .then(() => documentSet.randomMatching({speaker: ['person-one', 'person-two']}, ''))
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf))
    })

    it('can be configured with a document formatter', function () {
      usesDatabase(this)

      documentSet = createDocumentSet(room.robot, 'blarf', {
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

      return room.user.say('me', `@hubot slackapp blarf: ${source}`)
      .then(delay())
      .then(() => documentSet.randomMatching({speaker: ['person-one', 'person-two']}, ''))
      .then(doc => expect(doc.getBody()).to.equal(expected))
    })

    it('validates a required role', function () {
      documentSet = createDocumentSet(room.robot, 'blarf',
        { add: { role: OnlyMe } }
      )

      return documentSet.whenConnected()
      .then(() => room.user.say('you', '@hubot verbatim blarf: nope'))
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['you', '@hubot verbatim blarf: nope'],
          ['hubot', '@you NOPE']
        ])

        return documentSet.countMatching([], '')
      })
      .then(count => expect(count).to.equal(0))
    })

    it('generates default help text', function () {
      usesDatabase(this)

      return loadHelp(room.robot)
      .then(() => createDocumentSet(room.robot, 'blarf', {add: true}))
      .then(() => room.user.say('me', '@hubot help blarf'))
      .then(delay())
      .then(() => {
        const messages = helpLines()

        expect(messages).to.include("hubot slackapp blarf: <source> - Parse a blarf from the Slack app's paste format.")
        expect(messages).to.include('hubot verbatim blarf: <source> - Insert a blarf exactly as given.')
        expect(messages).to.include('hubot buffer blarf - Insert a blarf from the current contents of your buffer.')
      })
    })

    it('accepts custom help text', function () {
      usesDatabase(this)

      return loadHelp(room.robot)
      .then(() => createDocumentSet(room.robot, 'blarf', {
        add: {
          helpText: [
            'hubot blarf 1 - First line',
            'hubot blarf 2 - Second line'
          ]
        }
      }))
      .then(() => room.user.say('me', '@hubot help blarf'))
      .then(delay())
      .then(() => {
        const messages = helpLines()

        expect(messages).to.include('hubot blarf 1 - First line')
        expect(messages).to.include('hubot blarf 2 - Second line')
      })
    })
  })

  describe('set', function () {
    it('adds a new document with "setblarf:"', function () {
      usesDatabase(this)
      documentSet = createDocumentSet(room.robot, 'blarf', { set: true })

      return documentSet.whenConnected()
      .then(() => room.user.say('me', '@hubot setblarf: something embarassing'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot setblarf: something embarassing'],
          ['hubot', "me's blarf has been set to 'something embarassing'."]
        ])

        return documentSet.randomMatching({subject: ['me']}, '')
      })
      .then(doc => expect(doc.getBody()).to.equal('something embarassing'))
    })

    it('adds a new document for a different user with "setblarf @<username>:"', function () {
      usesDatabase(this)
      documentSet = createDocumentSet(room.robot, 'blarf', { set: true })

      return documentSet.whenConnected()
      .then(() => room.user.say('me', '@hubot setblarf @other: something embarassing'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot setblarf @other: something embarassing'],
          ['hubot', "other's blarf has been set to 'something embarassing'."]
        ])

        return documentSet.randomMatching({subject: ['other']}, '')
      })
      .then(doc => expect(doc.getBody()).to.equal('something embarassing'))
    })

    it('replaces an existing document with "setblarf:"', function () {
      usesDatabase(this)
      documentSet = createDocumentSet(room.robot, 'blarf', { set: true })

      return documentSet.add('admin', 'blah', [{kind: 'subject', value: 'me'}])
      .then(() => room.user.say('me', '@hubot setblarf: something better'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot setblarf: something better'],
          ['hubot', "me's blarf has been set to 'something better'."]
        ])

        return Promise.all([
          documentSet.countMatching({subject: ['me']}, ''),
          documentSet.randomMatching({subject: ['me']}, '')
        ])
      })
      .then(results => {
        expect(results[0]).to.equal(1)
        expect(results[1].getBody()).to.equal('something better')
      })
    })

    it('replaces an existing document for a different user with "setblarf @<username>:"', function () {
      usesDatabase(this)
      documentSet = createDocumentSet(room.robot, 'blarf', { set: true })

      return documentSet.add('admin', 'blah', [{kind: 'subject', value: 'other'}])
      .then(() => room.user.say('me', '@hubot setblarf other: something better'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot setblarf other: something better'],
          ['hubot', "other's blarf has been set to 'something better'."]
        ])

        return Promise.all([
          documentSet.countMatching({subject: ['other']}, ''),
          documentSet.randomMatching({subject: ['other']}, '')
        ])
      })
      .then(results => {
        expect(results[0]).to.equal(1)
        expect(results[1].getBody()).to.equal('something better')
      })
    })

    it('validates a required role for setting your own', function () {
      usesDatabase(this)
      documentSet = createDocumentSet(room.robot, 'blarf', {
        set: { roleForSelf: OnlyMe }
      })

      return documentSet.whenConnected()
      .then(() => room.user.say('you', '@hubot setblarf: nice try'))
      .then(delay())
      .then(() => room.user.say('you', '@hubot setblarf me: this works'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['you', '@hubot setblarf: nice try'],
          ['hubot', '@you NOPE'],
          ['you', '@hubot setblarf me: this works'],
          ['hubot', "me's blarf has been set to 'this works'."]
        ])

        return Promise.all([
          documentSet.countMatching({subject: ['me']}, ''),
          documentSet.countMatching({subject: ['you']}, '')
        ])
      })
      .then(results => expect(results).to.deep.equal([1, 0]))
    })

    it('validates a required role for setting another', function () {
      usesDatabase(this)
      documentSet = createDocumentSet(room.robot, 'blarf', {
        set: { roleForOther: OnlyMe }
      })

      return documentSet.whenConnected()
      .then(() => room.user.say('you', '@hubot setblarf me: nice try'))
      .then(delay())
      .then(() => room.user.say('you', '@hubot setblarf: this works'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['you', '@hubot setblarf me: nice try'],
          ['hubot', '@you NOPE'],
          ['you', '@hubot setblarf: this works'],
          ['hubot', "you's blarf has been set to 'this works'."]
        ])

        return Promise.all([
          documentSet.countMatching({subject: ['me']}, ''),
          documentSet.countMatching({subject: ['you']}, '')
        ])
      })
      .then(results => expect(results).to.deep.equal([0, 1]))
    })

    it('validates the correct role for explicitly setting your own', function () {
      usesDatabase(this)
      documentSet = createDocumentSet(room.robot, 'blarf', {
        set: { roleForSelf: OnlyMe, roleForOther: Nobody }
      })

      return documentSet.whenConnected()
      .then(() => room.user.say('me', '@hubot setblarf me: this works'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot setblarf me: this works'],
          ['hubot', "me's blarf has been set to 'this works'."]
        ])

        return documentSet.countMatching({subject: ['me']}, '')
      })
      .then(count => expect(count).to.equal(1))
    })

    it('generates default help text', function () {
      usesDatabase(this)

      return loadHelp(room.robot)
      .then(() => createDocumentSet(room.robot, 'blarf', {set: true}))
      .then(() => room.user.say('me', '@hubot help'))
      .then(delay())
      .then(() => {
        const messages = helpLines()

        expect(messages).to.include("hubot setblarf <user>: <source> - Set user's blarf to <source>.")
        expect(messages).to.include('hubot setblarf: <source> - Set your own blarf to <source>.')
      })
    })

    it('accepts custom help text', function () {
      usesDatabase(this)

      return loadHelp(room.robot)
      .then(() => createDocumentSet(room.robot, 'blarf', {
        set: {
          helpText: [
            'hubot setblarf 1 - First line',
            'hubot setblarf 2 - Second line'
          ]
        }
      }))
      .then(() => room.user.say('me', '@hubot help setblarf'))
      .then(delay())
      .then(() => {
        const messages = helpLines()

        expect(messages).to.include('hubot setblarf 1 - First line')
        expect(messages).to.include('hubot setblarf 2 - Second line')
      })
    })
  })

  describe('query', function () {
    function populate (commandOpts = true, docs = []) {
      documentSet = createDocumentSet(room.robot, 'blarf', {
        query: commandOpts
      })

      return Promise.all(
        docs.map(doc => {
          let body = ''
          const attributes = []
          if (doc.body && doc.subject) {
            body = doc.body
            attributes.push({kind: 'subject', value: doc.subject})
          } else {
            body = doc
          }
          return documentSet.add('me', body, attributes)
        })
      )
    }

    it('returns a random result', function () {
      usesDatabase(this)

      return populate(true, ['one', 'two', 'three'])
      .then(() => room.user.say('me', '@hubot blarf'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.have.length(2)
        expect(room.messages[0]).to.deep.equal(['me', '@hubot blarf'])

        const [speaker, message] = room.messages[1]
        expect(speaker).to.equal('hubot')
        expect(message).to.be.oneOf(['one', 'two', 'three'])
      })
    })

    it('returns a random document containing all terms within a query', function () {
      usesDatabase(this)

      return populate(true, [
        'aaa 111 zzz', 'aaa 222 yyy', 'yyy 333 xxx',
        'aaa nope', 'aaa nope', 'aaa nope', 'aaa nope', 'aaa nope', 'aaa nope', 'aaa nope', 'aaa nope'
      ])
      .then(() => room.user.say('me', '@hubot blarf aaa 222'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarf aaa 222'],
          ['hubot', 'aaa 222 yyy']
        ])
      })
    })

    it('escapes regular expression metacharacters within query terms', function () {
      usesDatabase(this)

      return populate(true, [
        'aaa+bbb', 'nope', 'nope', 'nope', 'nope', 'nope', 'nope', 'nope', 'nope', 'nope', 'nope'
      ])
      .then(() => room.user.say('me', '@hubot blarf \\+'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarf \\+'],
          ['hubot', 'aaa+bbb']
        ])
      })
    })

    it('collects words within double quotes as a single term', function () {
      usesDatabase(this)

      return populate(true, [
        'aaa nope bbb', 'aaa nope bbb', 'aaa nope bbb', 'aaa nope bbb', 'aaa nope bbb',
        'correct aaa bbb'
      ])
      .then(() => room.user.say('me', '@hubot blarf "aaa bbb"'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarf "aaa bbb"'],
          ['hubot', 'correct aaa bbb']
        ])
      })
    })

    it('collects words within single quotes as a single term', function () {
      usesDatabase(this)

      return populate(true, [
        'aaa nope bbb', 'aaa nope bbb', 'aaa nope bbb', 'aaa nope bbb', 'aaa nope bbb',
        'correct aaa bbb'
      ])
      .then(() => room.user.say('me', "@hubot blarf 'aaa bbb'"))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', "@hubot blarf 'aaa bbb'"],
          ['hubot', 'correct aaa bbb']
        ])
      })
    })

    it('allows terms to contain single and double quotes escaped with a backslash', function () {
      usesDatabase(this)

      return populate(true, [
        `correct aaa"bbb'ccc`, 'wrong aaabbbccc', 'wrong aaabbbccc', 'wrong aaabbbccc', 'wrong aaabbbccc'
      ])
      .then(() => room.user.say('me', `@hubot blarf aaa\\"bbb\\'ccc`))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', `@hubot blarf aaa\\"bbb\\'ccc`],
          ['hubot', `correct aaa"bbb'ccc`]
        ])
      })
    })

    it("permits access based on the caller's role", function () {
      usesDatabase(this)

      return populate({ role: OnlyMe }, ['aaa'])
      .then(() => room.user.say('me', '@hubot blarf'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarf'],
          ['hubot', 'aaa']
        ])
      })
    })

    it("prohibits access based on the caller's role", function () {
      usesDatabase(this)

      return populate({ role: OnlyMe }, ['aaa'])
      .then(() => room.user.say('you', '@hubot blarf'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['you', '@hubot blarf'],
          ['hubot', '@you NOPE']
        ])
      })
    })

    it('can be configured to query with a subject user', function () {
      usesDatabase(this)

      return populate({ userOriented: true }, [
        {body: 'wrong 1', subject: 'me'},
        {body: 'correct', subject: 'you'},
        {body: 'wrong 2', subject: 'other'}
      ])
      .then(() => room.user.say('me', '@hubot blarf @you'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarf @you'],
          ['hubot', 'correct']
        ])
      })
    })

    it('can be configured to default to self with no query', function () {
      usesDatabase(this)

      return populate({ userOriented: true }, [
        {body: 'wrong 1', subject: 'you'},
        {body: 'wrong 2', subject: 'you'},
        {body: 'correct', subject: 'me'},
        {body: 'wrong 3', subject: 'other'},
        {body: 'wrong 4', subject: 'person-four'}
      ])
      .then(() => room.user.say('me', '@hubot blarf'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarf'],
          ['hubot', 'correct']
        ])
      })
    })

    it('generates default help text', function () {
      return loadHelp(room.robot)
      .then(() => createDocumentSet(room.robot, 'blarf', {query: true}))
      .then(() => room.user.say('me', '@hubot help blarf'))
      .then(delay())
      .then(() => {
        const messages = helpLines()

        expect(messages).to.include('hubot blarf - Return a blarf at random.')
        expect(messages).to.include('hubot blarf <query> - Return a blarf that matches <query>.')
      })
    })

    it('accepts custom help text', function () {
      return loadHelp(room.robot)
      .then(() => createDocumentSet(room.robot, 'blarf', {
        query: {
          helpText: [
            'hubot blarf 1 - line one',
            'hubot blarf 2 - line two'
          ]
        }
      }))
      .then(() => room.user.say('me', '@hubot help blarf'))
      .then(delay())
      .then(() => {
        const messages = helpLines()

        expect(messages).to.include('hubot blarf 1 - line one')
        expect(messages).to.include('hubot blarf 2 - line two')
      })
    })
  })

  describe('count', function () {
    function populate (commandOpts = true, docs = []) {
      documentSet = createDocumentSet(room.robot, 'blarf', {
        count: commandOpts
      })

      return Promise.all(
        docs.map(doc => documentSet.add('me', doc, []))
      )
    }

    it('counts all documents', function () {
      usesDatabase(this)

      return populate(true, ['111', '222', '333', '444', '555'])
      .then(() => room.user.say('me', '@hubot blarfcount'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarfcount'],
          ['hubot', '@me there are 5 blarfs.']
        ])
      })
    })

    it('uses a singular noun for single results', function () {
      return populate(true, ['111'])
      .then(() => room.user.say('me', '@hubot blarfcount'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarfcount'],
          ['hubot', '@me there is 1 blarf.']
        ])
      })
    })

    it('counts documents matching all query terms', function () {
      usesDatabase(this)

      return populate(true, ['aaa zzz 1', 'aaa zzz 2', 'aaa bbb 0', 'bbb zzz 0', 'xxx yyy 0'])
      .then(() => room.user.say('me', '@hubot blarfcount zzz aaa'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarfcount zzz aaa'],
          ['hubot', '@me there are 2 blarfs matching `zzz aaa`.']
        ])
      })
    })

    it('counts documents matching quoted query terms', function () {
      usesDatabase(this)

      return populate(true, ['aaa zzz 1', 'aaa zzz 2', 'aaa bbb 0', 'bbb zzz 0', 'xxx yyy 0', 'zzz aaa 0'])
      .then(() => room.user.say('me', '@hubot blarfcount "aaa zzz"'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarfcount "aaa zzz"'],
          ['hubot', '@me there are 2 blarfs matching `"aaa zzz"`.']
        ])
      })
    })

    it('uses a singular noun for single results matching a query', function () {
      return populate(true, ['111', '222'])
      .then(() => room.user.say('me', '@hubot blarfcount 11'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarfcount 11'],
          ['hubot', '@me there is 1 blarf matching `11`.']
        ])
      })
    })

    it("permits access based on the caller's role", function () {
      usesDatabase(this)

      return populate({ role: OnlyMe }, ['aaa zzz 1', 'aaa zzz 2', 'aaa zzz 3', 'bbb zzz 0', 'xxx yyy 0'])
      .then(() => room.user.say('me', '@hubot blarfcount aaa zzz'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarfcount aaa zzz'],
          ['hubot', '@me there are 3 blarfs matching `aaa zzz`.']
        ])
      })
    })

    it("prohibits access based on the caller's role", function () {
      usesDatabase(this)

      return populate({ role: OnlyMe }, ['aaa zzz 1', 'aaa zzz 2'])
      .then(() => room.user.say('you', '@hubot blarfcount aaa zzz'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['you', '@hubot blarfcount aaa zzz'],
          ['hubot', '@you NOPE']
        ])
      })
    })

    it('generates default help text', function () {
      return loadHelp(room.robot)
      .then(() => createDocumentSet(room.robot, 'blarf', {count: true}))
      .then(() => room.user.say('me', '@hubot help blarfcount'))
      .then(delay())
      .then(() => {
        const messages = helpLines()

        expect(messages).to.include('hubot blarfcount - Total number of blarfs.')
        expect(messages).to.include('hubot blarfcount <query> - Number of blarfs matching <query>.')
      })
    })

    it('accepts custom help text', function () {
      return loadHelp(room.robot)
      .then(() => createDocumentSet(room.robot, 'blarf', {
        count: {
          helpText: [
            'hubot blarfcount 1 - line one',
            'hubot blarfcount 2 - line two'
          ]
        }
      }))
      .then(() => room.user.say('me', '@hubot help blarfcount'))
      .then(delay())
      .then(() => {
        const messages = helpLines()

        expect(messages).to.include('hubot blarfcount 1 - line one')
        expect(messages).to.include('hubot blarfcount 2 - line two')
      })
    })
  })

  describe('stats', function () {
    function populate (commandOpts, docs) {
      documentSet = createDocumentSet(room.robot, 'blarf', {
        stats: commandOpts
      })

      return Promise.all(docs.map(doc => {
        const attributes = []
        for (const kind in doc.attrs) {
          for (const value of doc.attrs[kind]) {
            attributes.push({kind, value})
          }
        }

        return documentSet.add('me', doc.body, attributes)
      }))
    }

    it('summarizes all known speaker and mention credits', function () {
      usesDatabase(this)

      return populate(true, [
        {body: '0', attrs: {speaker: ['person-one', 'person-two'], mention: ['person-two']}},
        {body: '1', attrs: {speaker: ['person-one'], mention: ['person-three']}},
        {body: '2', attrs: {speaker: ['person-two'], mention: ['person-one', 'person-two']}},
        {body: '3', attrs: {speaker: ['person-one'], mention: ['person-three']}}
      ])
      .then(() => room.user.say('me', '@hubot blarfstats'))
      .then(delay())
      .then(() => {
        const expected = '```\n' +
          'Username     | Spoke | Mentioned\n' +
          '--------------------------------\n' +
          'person-one   | 3     | 1\n' +
          'person-two   | 2     | 2\n' +
          'person-three | 0     | 2\n' +
          '```\n'

        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarfstats'],
          ['hubot', expected]
        ])
      })
    })

    it("summarizes a user's speaker and mention counts", function () {
      usesDatabase(this)

      return populate(true, [
        {body: '0', attrs: {speaker: ['person-one'], mention: ['person-two']}},
        {body: '1', attrs: {speaker: ['person-one'], mention: ['person-three']}},
        {body: '2', attrs: {speaker: ['person-two'], mention: ['person-one', 'person-two']}},
        {body: '3', attrs: {speaker: ['person-one'], mention: []}}
      ])
      .then(() => room.user.say('me', '@hubot blarfstats @person-two'))
      .then(delay())
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot blarfstats @person-two'],
          ['hubot', 'person-two is *#2*, having spoken in *1* blarf and being mentioned in *2*.']
        ])
      })
    })

    it('generates default help text', function () {
      usesDatabase(this)

      return loadHelp(room.robot)
      .then(() => createDocumentSet(room.robot, 'blarf', {stats: true}))
      .then(() => room.user.say('me', '@hubot help blarfstats'))
      .then(delay())
      .then(() => {
        const messages = helpLines()

        expect(messages).to.include('hubot blarfstats - See who has the most blarfs.')
        expect(messages).to.include('hubot blarfstats <user> - See the number of blarfs attributed to <user>.')
      })
    })

    it('accepts custom help text', function () {
      usesDatabase(this)

      return loadHelp(room.robot)
      .then(() => createDocumentSet(room.robot, 'blarf', {
        stats: {
          helpText: [
            'hubot blarfstats 1 - First line',
            'hubot blarfstats 2 - Second line'
          ]
        }
      }))
      .then(() => room.user.say('me', '@hubot help blarfstats'))
      .then(delay())
      .then(() => {
        const messages = helpLines()

        expect(messages).to.include('hubot blarfstats 1 - First line')
        expect(messages).to.include('hubot blarfstats 2 - Second line')
      })
    })
  })

  function generateAttributeQueryTests (commandName, attributeName) {
    return function () {
      function populate (commandOpts = true, docs = []) {
        documentSet = createDocumentSet(room.robot, 'blarf', {
          [commandName]: commandOpts
        })

        return Promise.all(
          docs.map(doc => {
            const attributes = doc.attrs.map(value => ({kind: attributeName, value}))
            return documentSet.add('me', doc.body, attributes)
          })
        )
      }

      it(`returns a random document ${commandName} the requested speaker`, function () {
        usesDatabase(this)

        return populate(true, [
          {body: 'yes 1', attrs: ['aaa', 'bbb']},
          {body: 'no 1', attrs: ['bbb']},
          {body: 'yes 2', attrs: ['zzz', 'aaa']},
          {body: 'no 2', attrs: ['yyy', 'ccc', 'bbb']},
          {body: 'no 3', attrs: ['qqq']}
        ])
        .then(() => room.user.say('me', `@hubot blarf${commandName} aaa`))
        .then(delay())
        .then(() => {
          expect(room.messages).to.have.length(2)
          expect(room.messages[0]).to.deep.equal(['me', `@hubot blarf${commandName} aaa`])

          const [speaker, text] = room.messages[1]
          expect(speaker).to.equal('hubot')
          expect(text).to.be.oneOf(['yes 1', 'yes 2'])
        })
      })

      it(`returns a random document with the requested ${attributeName} matching a query`, function () {
        usesDatabase(this)

        return populate(true, [
          {body: 'no 1', attrs: ['aaa', 'bbb']},
          {body: 'no 2', attrs: ['bbb']},
          {body: 'yes 1', attrs: ['zzz', 'aaa']},
          {body: 'no 3', attrs: ['yyy', 'ccc', 'bbb']},
          {body: 'no 4', attrs: ['aaa']}
        ])
        .then(() => room.user.say('me', `@hubot blarf${commandName} @aaa yes`))
        .then(delay())
        .then(() => {
          expect(room.messages).to.deep.equal([
            ['me', `@hubot blarf${commandName} @aaa yes`],
            ['hubot', 'yes 1']
          ])
        })
      })

      it(`returns a random document with multiple ${attributeName}s`, function () {
        usesDatabase(this)

        return populate(true, [
          {body: 'no 1', attrs: ['aaa', 'bbb']},
          {body: 'no 2', attrs: ['bbb']},
          {body: 'no 3', attrs: ['zzz', 'aaa']},
          {body: 'yes 1', attrs: ['yyy', 'ccc', 'bbb']},
          {body: 'no 4', attrs: ['aaa']}
        ])
        .then(() => room.user.say('me', `@hubot blarf${commandName} @ccc+yyy`))
        .then(delay())
        .then(() => {
          expect(room.messages).to.deep.equal([
            ['me', `@hubot blarf${commandName} @ccc+yyy`],
            ['hubot', 'yes 1']
          ])
        })
      })

      it(`returns a random document with multiple ${attributeName}s matching a query`, function () {
        usesDatabase(this)

        return populate(true, [
          {body: 'no 1', attrs: ['aaa', 'bbb']},
          {body: 'no 2', attrs: ['bbb']},
          {body: 'no 3', attrs: ['zzz', 'aaa']},
          {body: 'no 4', attrs: ['yyy', 'ccc', 'bbb']},
          {body: 'yes 1', attrs: ['aaa', 'bbb']}
        ])
        .then(() => room.user.say('me', `@hubot blarf${commandName} @aaa+bbb yes`))
        .then(delay())
        .then(() => {
          expect(room.messages).to.deep.equal([
            ['me', `@hubot blarf${commandName} @aaa+bbb yes`],
            ['hubot', 'yes 1']
          ])
        })
      })

      it("permits access based on the caller's role", function () {
        usesDatabase(this)

        return populate({role: OnlyMe}, [
          {body: 'yes 1', attrs: ['aaa', 'bbb']}
        ])
        .then(() => room.user.say('me', `@hubot blarf${commandName} bbb`))
        .then(delay())
        .then(() => {
          expect(room.messages).to.deep.equal([
            ['me', `@hubot blarf${commandName} bbb`],
            ['hubot', 'yes 1']
          ])
        })
      })

      it("prohibits access based on the caller's role", function () {
        usesDatabase(this)

        return populate({role: OnlyMe}, [
          {body: 'yes 1', attrs: ['aaa', 'bbb']}
        ])
        .then(() => room.user.say('you', `@hubot blarf${commandName} bbb`))
        .then(delay())
        .then(() => {
          expect(room.messages).to.deep.equal([
            ['you', `@hubot blarf${commandName} bbb`],
            ['hubot', '@you NOPE']
          ])
        })
      })

      it('generates default help text', function () {
        return loadHelp(room.robot)
        .then(() => createDocumentSet(room.robot, 'blarf', {[commandName]: true}))
        .then(() => room.user.say('me', `@hubot help blarf${commandName}`))
        .then(delay())
        .then(() => {
          const messages = helpLines().filter(line => line.startsWith(`hubot blarf${commandName}`))
          expect(messages).to.have.length(3)
        })
      })

      it('accepts custom help text', function () {
        return loadHelp(room.robot)
        .then(() => createDocumentSet(room.robot, 'blarf', {
          [commandName]: {
            helpText: [
              `hubot blarf${commandName} 1 - line one`,
              `hubot blarf${commandName} 2 - line two`
            ]
          }
        }))
        .then(() => room.user.say('me', `@hubot help blarf${commandName}`))
        .then(delay())
        .then(() => {
          const messages = helpLines()

          expect(messages).to.include(`hubot blarf${commandName} 1 - line one`)
          expect(messages).to.include(`hubot blarf${commandName} 2 - line two`)
        })
      })
    }
  };

  describe('by', generateAttributeQueryTests('by', 'speaker'))

  describe('about', generateAttributeQueryTests('about', 'mention'))
})
