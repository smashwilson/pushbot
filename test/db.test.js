// Test the database interceptor.

const util = require('util');
const fs = require('fs-promise');
const path = require('path');

const interceptor = require('./db');

describe('Interceptor', function() {
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
      if (!database) {
        this.skip();
        return;
      }

      db = interceptor(this, database, false);

      return db.none('CREATE TABLE IF NOT EXISTS snarf (number INTEGER, thingy TEXT)')
      .then(() => db.none('INSERT INTO snarf (number, thingy) VALUES ($1, $2), ($3, $4)', [12, 'wat', 34, 'eh']));
    });

    afterEach(function() {
      return db.none('DROP TABLE IF EXISTS snarf');
    });

    it('passes when the query, parameters, and results match', function() {
      return db.one('SELECT number, thingy FROM snarf WHERE number = $1', [34])
      .then(row => {
        expect(row.number).to.equal(34);
        expect(row.thingy).to.equal('eh');
      });
    });

    it('is insensitive to query whitespace', function() {
      return db.one(`
        SELECT number, thingy
        FROM snarf WHERE
        number  =  $1
      `, [12])
      .then(row => {
        expect(row.number).to.equal(12);
        expect(row.thingy).to.equal('wat');
      });
    });

    it('can accept any results for a specific query', function() {
      return db.none('INSERT INTO snarf (number, thingy) VALUES ($1, $2), ($3, $4), ($5, $6)',
        [56, 'herp', 78, 'derp', 90, 'blarf'])
      .then(() => db.many('SELECT number, thingy FROM snarf ORDER BY RANDOM()'))
      .then(rows => {
        expect(rows).to.deep.include.members([
          { number: 12, thingy: 'wat' },
          { number: 34, thingy: 'eh' },
          { number: 56, thingy: 'herp' },
          { number: 78, thingy: 'derp' },
          { number: 90, thingy: 'blarf' }
        ]);
      });
    });

    it('can accept any results for a specific JSON path', function() {
      return db.one(`
        INSERT INTO snarf (number, thingy)
        VALUES (TRUNC(RANDOM() * 100), $1)
        RETURNING number, NOW() AS ts
        `, ['wut'])
      .then(row => expect(row.number).to.be.within(0, 100));
    });

    it('fails with an incompatible query', function() {
      return db.one('SELECT number, thingy FROM snarf WHERE number = $1', [34])
      .then(
        row => expect.fail('', '', `expected query to fail but succeeded with ${util.inspect(row)}`),
        err => expect(err.message).to.match(/incorrect database query/)
      );
    });

    it('fails with incompatible parameters', function() {
      return db.one('SELECT number, thingy FROM snarf WHERE number = $1', [12])
      .then(
        row => expect.fail('', '', `expected query to fail but succeeded with ${util.inspect(row)}`),
        err => expect(err.message).to.match(/incorrect database query/)
      );
    });

    it('fails with unexpected results', function() {
      return db.one('SELECT number, thingy FROM snarf WHERE number = $1', [34])
      .then(
        row => expect.fail('', '', `expected query to fail but succeeded with ${util.inspect(row)}`),
        err => expect(err.message).to.match(/incorrect database query/)
      );
    });
  });

  describe('in offline mode', function() {
    beforeEach(function() {
      db = interceptor(this, null, false);
    });

    it('returns recorded results', function() {
      return db.one('SELECT number, thingy FROM snarf WHERE number = $1', [34])
      .then(row => {
        expect(row.number).to.equal(34);
        expect(row.thingy).to.equal('eh');
      })
    });

    it('is insensitive to query whitespace', function() {
      return db.one(`
        SELECT number, thingy
        FROM snarf
        WHERE thingy = $1
      `, ['wat'])
      .then(row => {
        expect(row.number).to.equal(12);
        expect(row.thingy).to.equal('wat');
      })
    });

    it('fails with an incompatible query', function() {
      return db.one('SELECT number, thingy FROM snarf WHERE number = $1', [34])
      .then(
        row => expect.fail('', '', `expected query to fail but succeeded with ${util.inspect(row)}`),
        err => expect(err.message).to.match(/incorrect query SQL/)
      );
    });

    it('fails with incompatible parameters', function() {
      return db.one('SELECT number, thingy FROM snarf WHERE number = $1', [34])
      .then(
        row => expect.fail('', '', `expected query to fail but succeeded with ${util.inspect(row)}`),
        err => expect(err.message).to.match(/incorrect query parameters/)
      );
    });

    it('fails with no recorded query', function() {
      return db.one('SELECT number, thingy FROM snarf WHERE number = $1', [34])
      .then(
        row => expect.fail('', '', `expected query to fail but succeeded with ${util.inspect(row)}`),
        err => expect(err.message).to.match(/Unexpected query/)
      );
    });
  });
});
