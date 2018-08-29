const Helper = require('hubot-test-helper')
const helper = new Helper([])

const Cache = require('../../scripts/models/cache')
const Pattern = require('../../scripts/models/pattern')

describe('Pattern', function () {
  describe('parses', function () {
    it('exact "-delimited patterns', function () {
      const parsed = Pattern.parse('"this is one pattern"')
      expect(parsed).to.have.length(1)
      expect(parsed[0].source).to.equal('this is one pattern')
    })

    it('exact \'-delimited patterns', function () {
      const parsed = Pattern.parse("'also a single pattern'")
      expect(parsed).to.have.length(1)
      expect(parsed[0].source).to.equal('also a single pattern')
    })

    it('allows \\ escaping', function () {
      const parsed = Pattern.parse('"still a \\" single pattern" "and \\\\ this"')
      expect(parsed).to.have.length(2)
      expect(parsed[0].source).to.equal('still a " single pattern')
      expect(parsed[1].source).to.equal('and \\ this')
    })

    it('regexp /-delimited patterns', function () {
      const parsed = Pattern.parse('/foo\\\\s+bar/')
      expect(parsed).to.have.length(1)
      expect(parsed[0].rx.test('foo   bar')).to.be.true
      expect(parsed[0].rx.test('foo bar')).to.be.true
      expect(parsed[0].rx.test('nope')).to.be.false
    })

    it('between patterns', function () {
      const parsed = Pattern.parse('"start" ... /end/')
      expect(parsed).to.have.length(1)
      expect(parsed[0].start.source).to.equal('start')
      expect(parsed[0].end.rx.test('end')).to.be.true
    })

    it('without a space between patterns', function () {
      const parsed = Pattern.parse('"start"...\'end\'')
      expect(parsed).to.have.length(1)
      expect(parsed[0].start.source).to.equal('start')
      expect(parsed[0].end.source).to.equal('end')
    })

    it('fails on unexpected characters outside of delimiters', function () {
      expect(() => Pattern.parse('oops')).to.throw(/You need to quote patterns/)
    })

    it('fails on an unterminated delimiter', function () {
      expect(() => Pattern.parse('"hold that thought')).to.throw(/Unbalanced/)
    })

    it('fails on a between pattern with no start', function () {
      expect(() => Pattern.parse('... "huh"')).to.throw(/without a start/)
    })

    it('fails on a between pattern with no end', function () {
      expect(() => Pattern.parse('"what" ...')).to.throw(/without an end/)
    })

    it('disallows nested between patterns', function () {
      expect(() => Pattern.parse('"er" ... ... "?"')).to.throw(/cannot be/)
    })

    it('returns all matched patterns in sequence', function () {
      const parsed = Pattern.parse('"one" "two three" /four/ ... /five/ "last"')
      expect(parsed).to.have.length(4)
      expect(parsed[0].source).to.equal('one')
      expect(parsed[1].source).to.equal('two three')
      expect(parsed[2].start.rx.test('four')).to.be.true
      expect(parsed[2].end.rx.test('five')).to.be.true
      expect(parsed[3].source).to.equal('last')
    })
  })

  describe('matches', function () {
    let room, cache

    beforeEach(async function () {
      room = helper.createRoom({ httpd: false })

      cache = Cache.forChannel(room.robot, 'C12345678')
      const lines = [
        'aaa 000', 'bbb 000', 'ccc 000', 'ddd 000', 'eee 000',
        'aaa 111', 'bbb 111', 'ccc 111', 'ddd 111', 'eee 111'
      ]
      for (const line of lines) {
        cache.append({ message: {
          text: line,
          user: { name: 'someone' }
        } })
      }
    })

    afterEach(function () {
      room.destroy()
      Cache.clear()
    })

    it('the most recent exact', function () {
      const pattern = Pattern.parse('"ccc"')[0]
      const matches = pattern.matchesIn(cache)

      expect(matches).to.have.length(1)
      expect(matches[0].text).to.equal('ccc 111')
    })

    it('the most recent regular expression match', function () {
      const pattern = Pattern.parse('/b+/')[0]
      const matches = pattern.matchesIn(cache)

      expect(matches).to.have.length(1)
      expect(matches[0].text).to.equal('bbb 111')
    })

    it('captures between patterns', function () {
      const pattern = Pattern.parse('"111" ... "ccc"')[0]
      const matches = pattern.matchesIn(cache)

      expect(matches).to.have.length(2)
      expect(matches[0].text).to.equal('bbb 111')
      expect(matches[1].text).to.equal('ccc 111')
    })

    it('returns an empty array if no matches are found', function () {
      const pattern = Pattern.parse('"nope"')[0]
      const matches = pattern.matchesIn(cache)

      expect(matches).to.have.length(0)
    })
  })
})
