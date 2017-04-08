// Unit tests for the manipulations of arbitrary DocumentSets.

const interceptor = require('../db');

const Helper = require('hubot-test-helper');
const helper = new Helper([]);

const {createDocumentSet} = require('../../scripts/quotes');

describe.only('createDocumentSet', function() {
  let room, documentSet;

  beforeEach(function() {
    room = helper.createRoom();

    room.robot.postgres = interceptor(this, global.database, true);
  });

  afterEach(function() {
    room.destroy();
    return documentSet && documentSet.destroy();
  });

  describe('add', function() {
    beforeEach(function() {
      documentSet = createDocumentSet(room.robot, 'blarf', { add: true });
    });

    it('creates "slackapp blarf:"', function() {
      usesDatabase(this);

      const blarfToAdd = 'person-one [2:00 PM] \n' +
        'foo bar baz' +
        '\n' +
        '[2:01]  \n' +
        'aaa bbb ccc\n';

      return room.user.say('me', `@hubot slackapp blarf: ${blarfToAdd}`)
      .then(() => delay(2000))
      .then(() => {
        expect(room.messages).to.eql([
          ['me', `@hubot slackapp blarf: ${blarfToAdd}`],
          ['hubot', '1 blarf loaded.']
        ]);
      })
    });

    it('removes "new messages" from "slackapp blarf:"');

    it('removes "edited" from "slackapp blarf:"');

    it('removes APP from integration output in "slackapp blarf:"');

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
