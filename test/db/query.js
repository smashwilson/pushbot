// Model, save, load, and compare database queries.

const path = require('path');
const fs = require('fs-extra');
const {expect} = require('chai');
const stringify = require('json-stable-stringify');

const SEPARATOR = '\n---\n';
const ANYTHING = {};
const NONE = {};

class Query {
  static normalize(text) {
    let index = 0;
    let withinQuote = false;
    let withinWhitespace = false;
    let normalized = '';

    while (index < text.length) {
      const char = text.charAt(index);
      const next = text.charAt(index + 1);

      if (char === "\\") {
        normalized += char;
        normalized += next;
        index++;
        continue;
      }

      if (withinQuote) {
        if (char === "'") {
          normalized += char;
          if (next === "'") {
            normalized += next;
            index++;
          } else {
            withinQuote = false;
          }
        } else {
          normalized += char;
        }
      } else {
        // Unquoted
        if (/\s/.test(char) && !withinWhitespace) {
          withinWhitespace = true;
          normalized += ' ';
        } else {
          withinWhitespace = false;
          normalized += char;
          if (char === "'") {
            withinQuote = true;
          }
        }
      }

      index++;
    }

    return normalized;
  }

  static pathFor(index, fixtureDirectory) {
    const fileName = ('000000' + index.toString(10)).substr(-6) + '.json';
    return path.join(fixtureDirectory, fileName);
  }

  static load(index, fixtureDirectory) {
    const sourcePath = Query.pathFor(index, fixtureDirectory);

    return new Promise((resolve, reject) => {
      fs.readFile(sourcePath, {encoding: 'utf8'}, (err, contents) => {
        if (err) {
          if (err.code === 'ENOENT') {
            return resolve(new NullQuery());
          }

          return reject(err);
        }

        const [query, parameterSrc, resultSrc] = contents.split(SEPARATOR);
        try {
          let parameters, results;

          if (/^none$/i.test(parameterSrc)) {
            parameters = NONE;
          } else {
            parameters = JSON.parse(parameterSrc);
          }

          if (/^anything$/i.test(resultSrc)) {
            results = ANYTHING;
          } else if (/^none$/i.test(resultSrc)) {
            results = NONE;
          } else {
            results = JSON.parse(resultSrc);
          }

          resolve(new Query(index, query, parameters, results));
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  static observe(index, query, parameters, results) {
    const normalizedQuery = Query.normalize(query);
    const maybeParameters = (parameters === undefined || parameters === null) ? NONE : parameters;
    const maybeResults = (results === undefined || results === null) ? NONE : results;

    return new Query(index, normalizedQuery, maybeParameters, maybeResults);
  }

  constructor(index, query, parameters, results) {
    this.index = index;
    this.query = query;
    this.parameters = parameters;
    this.results = results;
  }

  save(fixtureDirectory) {
    const destPath = Query.pathFor(this.index, fixtureDirectory);
    const payload = this.serialize();

    return new Promise((resolve, reject) => {
      fs.ensureDir(fixtureDirectory, err => {
        if (err) {
          reject(err);
          return;
        }

        fs.writeFile(destPath, payload, {encoding: 'utf8'}, err => err ? reject(err) : resolve(this));
      });
    });
  }

  isAnything() {
    return this.results === ANYTHING;
  }

  withResultsMasked() {
    return new Query(this.index, this.query, this.parameters, ANYTHING);
  }

  serialize() {
    let parameterPayload, resultPayload;

    if (this.parameters === NONE) {
      parameterPayload = 'none';
    } else {
      parameterPayload = stringify(this.parameters, {space: 2});
    }

    if (this.results === ANYTHING) {
      resultPayload = 'anything';
    } else if (this.results === NONE) {
      resultPayload = 'none';
    } else {
      resultPayload = stringify(this.results, {space: 2});
    }

    return [
      this.query,
      parameterPayload,
      resultPayload
    ].join(SEPARATOR);
  }

  matches(other) {
    const masked = this.isAnything() ? other.withResultsMasked() : other;

    expect(this.serialize()).to.equal(masked.serialize());
  }

  matchesCall(query, parameters) {
    const normalizedQuery = Query.normalize(query);

    expect(normalizedQuery).to.equal(this.query);
    expect(parameters).to.deep.equal(this.parameters);
  }
}

class NullQuery {
  serialize() {
    return 'query not found';
  }

  matches(other) {
    expect(this.serialize()).to.equal(other.serialize());
  }

  matchesCall(query, parameters) {
    const parameterStr = parameters === undefined ? '' : '\n' + stringify(parameters, {space: 2});
    expect.fail('', '', `Unexpected query:\n${query}${parameterStr}`);
  }
}

exports.Query = Query;
