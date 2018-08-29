const moment = require('moment-timezone')

const Helper = require('hubot-test-helper')
const helper = new Helper([])

const Buffer = require('../../scripts/models/buffer')
const Line = require('../../scripts/models/line')

describe('Buffer', function () {
  let room, buffer

  beforeEach(function () {
    room = helper.createRoom({ httpd: false })
    buffer = Buffer.forUser(room.robot, 'U123')
  })

  afterEach(function () {
    room.destroy()
    Buffer.clear()
  })

  function makeLine (text, minute, speaker = 'me') {
    return new Line(
      moment.tz({ year: 2017, month: 5, day: 10, hour: 9, minute }, 'America/New_York'),
      speaker,
      text
    )
  }

  function makeLines (texts, speaker = 'me') {
    return texts.map((text, i) => makeLine(text, i, speaker))
  }

  it('appends new lines', function () {
    buffer.append(makeLines(['one one one', 'two two two']))

    expect(buffer.contents).to.have.length(2)
    expect(buffer.contents[0].text).to.equal('one one one')
    expect(buffer.contents[1].text).to.equal('two two two')
  })

  it('removes lines by index', function () {
    buffer.append(makeLines(['zero', 'one', 'two', 'three']))

    buffer.remove(2)

    expect(buffer.contents.map(each => each.text)).to.deep.equal([
      'zero', 'one', 'three'
    ])
  })

  it('replaces lines by index', function () {
    buffer.append(makeLines(['zero', 'one', 'two', 'three']))

    buffer.replace(1, makeLines(['new']))

    expect(buffer.contents.map(each => each.text)).to.deep.equal([
      'zero', 'new', 'two', 'three'
    ])
  })

  it('clears all lines', function () {
    buffer.append(makeLines(['zero', 'one', 'two', 'three']))

    buffer.clear()

    expect(buffer.contents).to.have.length(0)
  })

  it('returns and clears lines', function () {
    buffer.append(makeLines(['zero', 'one', 'two', 'three']))

    const committed = buffer.commit()

    expect(buffer.contents).to.have.length(0)
    expect(committed.map(each => each.text)).to.deep.equal([
      'zero', 'one', 'two', 'three'
    ])
  })

  describe('show', function () {
    it('reports an empty buffer', function () {
      expect(buffer.contents).to.have.length(0)
      expect(buffer.show()).to.equal('Your buffer is currently empty.')
    })

    it('shows current lines', function () {
      buffer.append(makeLines(['zero', 'one', 'two', 'three']))
      expect(buffer.show()).to.equal(
        '_(0)_ me: zero\n' +
        '_(1)_ me: one\n' +
        '_(2)_ me: two\n' +
        '_(3)_ me: three'
      )
    })
  })

  describe('persistance', function () {
    it('restores contents', function () {
      const buffer0a = Buffer.forUser(room.robot, 'U0')
      const buffer1a = Buffer.forUser(room.robot, 'U1')

      buffer0a.append(makeLines(['0', '1', '2', '3', '4']))
      buffer1a.append(makeLines(['5', '4', '3']))

      Buffer.clear()

      const buffer0b = Buffer.forUser(room.robot, 'U0')
      const buffer1b = Buffer.forUser(room.robot, 'U1')

      expect(buffer0b.contents.map(each => each.text)).to.deep.equal([
        '0', '1', '2', '3', '4'
      ])
      expect(buffer1b.contents.map(each => each.text)).to.deep.equal([
        '5', '4', '3'
      ])
    })
  })
})
