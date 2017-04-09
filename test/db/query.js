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
    let withinWhitespace = true;
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
        if (/\s/.test(char)) {
          if (!withinWhitespace) {
            withinWhitespace = true;
            normalized += ' ';
          }
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

    return normalized.replace(/\s+$/, '');
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
          const parseSource = src => {
            if (/^\s*anything\s*$/i.test(src)) {
              return [ANYTHING, []];
            }

            if (/^\s*none\s*$/i.test(src)) {
              return [NONE, []];
            }

            const anyMatch = /^\s*any\s*([^\n]+)/i.exec(src);
            if (anyMatch) {
              const anyPaths = anyMatch[1].split(/,/).map(each => each.trim());
              const rest = src.substring(anyMatch[0].length);
              return [JSON.parse(rest), anyPaths];
            }

            return [JSON.parse(src), []];
          };

          const [parameters, parameterPaths] = parseSource(parameterSrc);
          const [results, resultPaths] = parseSource(resultSrc);

          const q = new Query(index, query, parameters, results);
          q.parameterPaths = parameterPaths;
          q.resultPaths = resultPaths;
          resolve(q);
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
    this.parameterPaths = [];
    this.results = results;
    this.resultPaths = [];
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

  asMaskedBy(expectedQuery) {
    const applyMask = (original, expected, attrPaths) => {
      if (expected === ANYTHING) {
        return ANYTHING;
      }

      for (let i = 0; i < attrPaths.length; i++) {
        const attrPath = attrPaths[i];
        original[attrPath] = expected[attrPath];
      }

      return original;
    };

    const maskedParameters = applyMask(this.parameters, expectedQuery.parameters, expectedQuery.parameterPaths);
    const maskedResults = applyMask(this.results, expectedQuery.results, expectedQuery.resultPaths);

    return new Query(this.index, this.query, maskedParameters, maskedResults);
  }

  serialize() {
    const serializeField = value => {
      if (value === NONE) {
        return 'none';
      }

      if (value === ANYTHING) {
        return 'anything';
      }

      return stringify(value, {space: 2});
    }

    const parameterPayload = serializeField(this.parameters);
    const resultPayload = serializeField(this.results);

    return [
      this.query,
      parameterPayload,
      resultPayload
    ].join(SEPARATOR);
  }

  matches(other) {
    const masked = other.asMaskedBy(this);

    expect(masked.serialize(), 'incorrect database query').to.equal(this.serialize());
  }

  matchesCall(query, parameters) {
    const normalizedQuery = Query.normalize(query);
    const maybeParameters = (parameters === undefined || parameters === null) ? NONE : parameters;

    expect(normalizedQuery, 'incorrect query SQL').to.equal(this.query);
    expect(maybeParameters, 'incorrect query parameters').to.deep.equal(this.parameters);
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
