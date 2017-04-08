// pg-promise recording layer.

'use strict';

const path = require('path');

const {Verifying, Recording, Offline} = require('./mode');
const {Query} = require('./query');

const fixtureRoot = path.join(__dirname, '..', 'fixtures');

class Interceptor {
  constructor(context, connection, record) {
    if (connection === null || connection === undefined) {
      this.mode = Offline;
    } else if (record) {
      this.mode = Recording;
    } else {
      this.mode = Verifying;
    }

    this.real = connection;
    this.queryIndex = 0;

    const fixtureName = context.currentTest.fullTitle().replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
    this.fixtureDirectory = path.join(fixtureRoot, fixtureName);

    ['none', 'one', 'many', 'any', 'oneOrNone', 'one'].forEach(method => {
      this[method] = this.delegateQuery.bind(this, method);
    });
  }

  delegateQuery(method, query, parameters) {
    const index = this.queryIndex;
    this.queryIndex++;

    return this.mode.when({
      recording: () => {
        return this.real[method](query, parameters)
          .then(results => Query.observe(index, query, parameters, results).save(this.fixtureDirectory))
          .then(q => q.results);
      },
      verifying: () => {
        return Promise.all([
          this.real[method](query, parameters),
          Query.load(index, this.fixtureDirectory)
        ]).then(([results, expected]) => {
          const actual = Query.observe(index, query, parameters, results);

          // Asserts with chai
          expected.matches(actual);

          return results;
        });
      },
      offline: () => {
        return Query.load(index, this.fixtureDirectory)
          .then(expected => {
            // Asserts with chai
            expected.matchesCall(query, parameters);

            return expected.results;
          });
      }
    });
  }
};

module.exports = function(...args) {
  return new Interceptor(...args);
}
