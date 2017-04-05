// Test the database interceptor.

const fs = require('fs-promise');
const path = require('path');

const interceptor = require('./db');

describe.only('Interceptor', function() {
  let db, fixtureRoot;

  beforeEach(function() {
    fixtureRoot = path.join(__dirname, 'fixtures');
  });

  describe('in record mode', function() {
    function clearAllFixtures() {
      return fs.readdir(fixtureRoot)
      .then(entries => {
        return Promise.all(entries
          .filter(entry => /^interceptor_in_record_mode/.test(entry))
          .map(fixtureDir => fs.remove(fixtureDir)));
      })
    }

    beforeEach(function() {
      if (!database) {
        this.skip();
        return;
      }

      db = interceptor(this, global.database, true);

      return clearAllFixtures()
        .then(() => db.none('CREATE TABLE IF NOT EXISTS snarf (number INTEGER, thingy TEXT)'));
    });

    afterEach(function() {
      return db.none('DROP TABLE IF EXISTS snarf');
    });

    it('persists database operations to files', function() {
      const opFile = path.join(
        fixtureRoot,
        'interceptor_in_record_mode_persists_database_operations_to_files',
        '000001.json'
      );

      return db.none('INSERT INTO snarf (number, thingy) VALUES ($1, $2)', [42, 'blarf'])
      .then(() => fs.stat(opFile))
      .then(stats => expect(stats.isFile()).to.be.true);
    });

    it('overwrites existing files', function() {
      const opFile = path.join(
        fixtureRoot,
        'interceptor_in_record_mode_overwrites_existing_files',
        '000001.json'
      );

      return fs.writeFile(opFile, 'HELLO')
      .then(() => db.none('INSERT INTO snarf (number, thingy) VALUES ($1, $2)', [12, 'hork']))
      .then(() => fs.readFile(opFile, {encoding: 'utf8'}))
      .then(content => expect(content).not.to.equal('HELLO'));
    });

    it('passes results through', function() {
      return db.none('INSERT INTO snarf (number, thingy) VALUES ($1, $2), ($3, $4), ($5, $6)', [1, 'blerp', 2, 'snorgle', 3, 'snorf'])
      .then(() => db.one('SELECT number, thingy FROM snarf WHERE thingy = $1', ['blerp']))
      .then(row => expect(row.thingy).to.equal('blerp'));
    });
  });

  describe('in verification mode', function() {
    beforeEach(function() {
      db = interceptor(this, database, false);
    });

    it('passes when the query, parameters, and results match');
    it('is insensitive to query whitespace');
    it('can accept any results for a specific query');
    it('fails with an incompatible query');
    it('fails with incompatible parameters');
    it('fails with unexpected results');
  });

  describe('in offline mode', function() {
    beforeEach(function() {
      db = interceptor(this, null, false);
    });

    it('returns recorded results');
    it('fails with an incompatible query');
    it('fails with incompatible parameters');
    it('fails with no recorded query');
  });
});
