// Unit tests for the manipulations of arbitrary DocumentSets.

const interceptor = require('../db');
const moment = require('moment');

const Helper = require('hubot-test-helper');
const helper = new Helper([]);

const {createDocumentSet} = require('../../scripts/quotes');

describe.only('createDocumentSet', function() {
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
      documentSet = createDocumentSet(room.robot, 'blarf', { add: true });
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

    it('rejects malformed "slackapp blarf:" input');

    it('creates "verbatim blarf:"');

    it('creates "buffer blarf"');

    it('validates a required role');
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
