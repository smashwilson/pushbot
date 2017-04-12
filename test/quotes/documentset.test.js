// Unit tests for the manipulations of arbitrary DocumentSets.

const interceptor = require('../db');
const path = require('path');
const moment = require('moment');

const Helper = require('hubot-test-helper');
const helper = new Helper([]);

const {createDocumentSet} = require('../../scripts/quotes');

const OnlyMe = {
  verify: (robot, msg) => {
    if (msg.message.user.name === 'me') {
      return true;
    }

    msg.reply('NOPE');
    return false;
  }
};

describe('createDocumentSet', function() {
  let room, documentSet;
  let realNow;

  beforeEach(function() {
    room = helper.createRoom();
    realNow = moment.now;
    moment.now = () => 1491766054971; // Sunday, April 9th 2017, 3:28:30 pm

    room.robot.postgres = interceptor(this, global.database, false);
  });

  afterEach(function() {
    room.destroy();
    moment.now = realNow;

    return documentSet && documentSet.destroy();
  });

  describe('add', function() {
    beforeEach(function() {
      documentSet = createDocumentSet(room.robot, 'blarf',
        { add: { role: OnlyMe } }
      );
      return documentSet.connected;
    });

    it('creates "slackapp blarf:"', function() {
      usesDatabase(this);

      const blarfToAdd = 'person-one [2:00 PM] \n' +
        'foo bar baz\n' +
        '\n' +
        '[2:01]  \n' +
        'aaa bbb ccc\n';

      const expectedBlarf = '[2:00 PM 9 Apr 2017] person-one: foo bar baz\n' +
        '[2:01 PM 9 Apr 2017] person-one: aaa bbb ccc';

      return room.user.say('me', `@hubot slackapp blarf: ${blarfToAdd}`)
      .then(delay)
      .then(() => {
        expect(room.messages).to.eql([
          ['me', `@hubot slackapp blarf: ${blarfToAdd}`],
          ['hubot', '1 blarf loaded.']
        ]);

        return documentSet.randomMatching([], '"foo bar baz"');
      })
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf));
    });

    it('removes "new messages" from "slackapp blarf:"', function() {
      usesDatabase(this);

      const blarfToAdd = 'person-one [2:00 PM] \n' +
        'one one one' +
        '\n' +
        '[2:01]  \n' +
        'two two two\n' +
        '\n' +
        'new messages\n' +
        '\n' +
        'person-two [9:09 AM] \n' +
        'three three three';

      const expectedBlarf = '[2:00 PM 9 Apr 2017] person-one: one one one\n' +
        '[2:01 PM 9 Apr 2017] person-one: two two two\n' +
        '[9:09 AM 9 Apr 2017] person-two: three three three';

      return room.user.say('me', `@hubot slackapp blarf: ${blarfToAdd}`)
      .then(delay)
      .then(() => {
        expect(room.messages).to.eql([
          ['me', `@hubot slackapp blarf: ${blarfToAdd}`],
          ['hubot', '1 blarf loaded.']
        ]);

        return documentSet.randomMatching([], '"two two two"');
      })
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf));
    });

    it('removes "edited" from "slackapp blarf:"', function() {
      usesDatabase(this);

      const blarfToAdd = 'person-one [8:53 PM] \n' +
        'one one one' +
        '\n' +
        '[8:53]  \n' +
        'whatever (edited)\n' +
        '\n' +
        '[8:53]  \n' +
        '\n' +
        'three three three';

      const expectedBlarf = '[8:53 PM 9 Apr 2017] person-one: one one one\n' +
        '[8:53 PM 9 Apr 2017] person-one: whatever\n' +
        '[8:53 PM 9 Apr 2017] person-one: three three three';

      return room.user.say('me', `@hubot slackapp blarf: ${blarfToAdd}`)
      .then(delay)
      .then(() => {
        expect(room.messages).to.eql([
          ['me', `@hubot slackapp blarf: ${blarfToAdd}`],
          ['hubot', '1 blarf loaded.']
        ]);

        return documentSet.randomMatching([], 'whatever');
      })
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf));
    });

    it('removes APP from integration output in "slackapp blarf:"', function() {
      usesDatabase(this);

      const blarfToAdd = 'me [1:10 PM]\n' +
        '!quote\n' +
        '\n' +
        'pushbotAPP [1:10 PM]\n' +
        'some response\n' +
        '\n' +
        'someone-else [1:20 PM]\n' +
        'more text' +
        '\n';

      const expectedBlarf = '[1:10 PM 9 Apr 2017] me: !quote\n' +
        '[1:10 PM 9 Apr 2017] pushbot: some response\n' +
        '[1:20 PM 9 Apr 2017] someone-else: more text';

      return room.user.say('me', `@hubot slackapp blarf: ${blarfToAdd}`)
      .then(delay)
      .then(() => {
        expect(room.messages).to.eql([
          ['me', `@hubot slackapp blarf: ${blarfToAdd}`],
          ['hubot', '1 blarf loaded.']
        ]);

        return documentSet.randomMatching([], 'response');
      })
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf));
    });

    it('rejects malformed "slackapp blarf:" input', function() {
      usesDatabase(this);

      const malformedBlarf = '!quote\n' +
        '\n' +
        'person [1:10 PM]\n' +
        'some response\n';

      return room.user.say('me', `@hubot slackapp blarf: ${malformedBlarf}`)
      .then(delay)
      .then(() => {
        expect(room.messages).to.have.length(2);
        expect(room.messages[0]).to.deep.equal(['me', `@hubot slackapp blarf: ${malformedBlarf}`]);
        expect(room.messages[1][1]).to.match(/sadtrombone\.com/);
      });
    });

    it('creates "verbatim blarf:"', function() {
      usesDatabase(this);

      const verbatimBlarf = 'look ma\n' +
        'no formatting';

      return room.user.say('me', `@hubot verbatim blarf: ${verbatimBlarf}`)
      .then(delay)
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', `@hubot verbatim blarf: ${verbatimBlarf}`],
          ['hubot', '1 blarf loaded.']
        ]);

        return documentSet.randomMatching([], 'formatting');
      }).then(doc => expect(doc.getBody()).to.equal(verbatimBlarf));
    });

    it('creates "buffer blarf"', function() {
      usesDatabase(this);

      room.robot.loadFile(path.join(__dirname, '..', '..', 'scripts'), 'buffer.coffee');

      const ts = hhmm => moment(`2017-04-01 ${hhmm}`, 'YYYY-MM-DD HH:mm');
      const makeLine = obj => {
        obj.isRaw = () => false;
        return obj;
      };

      const buffer = room.robot.bufferForUserName('me')
      buffer.append(makeLine({timestamp: ts('9:30'), speaker: 'person-one', text: 'one one one'}));
      buffer.append(makeLine({timestamp: ts('9:31'), speaker: 'person-two', text: 'two two two'}));
      buffer.append(makeLine({timestamp: ts('9:32'), speaker: 'person-three', text: 'three three three'}));

      const expectedBlarf = '[9:30 AM 1 Apr 2017] person-one: one one one\n' +
        '[9:31 AM 1 Apr 2017] person-two: two two two\n' +
        '[9:32 AM 1 Apr 2017] person-three: three three three';

      return room.user.say('me', '@hubot buffer blarf')
      .then(delay)
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['me', '@hubot buffer blarf'],
          ['hubot', expectedBlarf],
          ['hubot', '1 blarf loaded.']
        ]);

        return documentSet.randomMatching([], 'two');
      })
      .then(doc => expect(doc.getBody()).to.equal(expectedBlarf));
    });

    it('validates a required role', function() {
      return room.user.say('you', '@hubot verbatim blarf: nope')
      .then(() => {
        expect(room.messages).to.deep.equal([
          ['you', '@hubot verbatim blarf: nope'],
          ['hubot', '@you NOPE']
        ]);

        return documentSet.countMatching([], '');
      })
      .then(count => expect(count).to.equal(0));
    });
  });

  describe('set', function() {
    it('creates "setblarf:"');
  });

  describe('query', function() {
    it('creates "blarf <query>"');
  });

  describe('count', function() {
    it('creates "blarfcount"');
  });

  describe('stats', function() {
    it('creates "blarfstats"');
  });

  describe('by', function() {
    it('creates "blarfby"');
  });

  describe('about', function() {
    it('creates "blarfabout"');
  });

  describe('kov', function() {
    it('creates "blarfkov"');
  });
});
