// Parse and model regular expression and exact-match patterns.

class Pattern {
  canBeEndpoint() {
    return true;
  }

  matches(line) {
    return false;
  }

  matchesIn(cache) {
    const match = cache.mostRecentMatch(this);
    return match ? [match] : [];
  }
}

class ExactPattern extends Pattern {
  constructor(source) {
    super();
    this.source = source;
  }

  matches(line) {
    return line.text.indexOf(this.source) !== -1;
  }

  toString() {
    return `"${this.source}"`;
  }
}

class RegexpPattern extends Pattern {
  constructor(source) {
    super();
    this.rx = new RegExp(source);
  }

  matches(line) {
    return this.rx.test(line.text);
  }

  toString() {
    return this.rx.toString();
  }
}

class BetweenPattern extends Pattern {
  endpoints(start, end) {
    if (!start) throw new Error("Range without a start pattern");
    if (!end) throw new Error("Range without an end pattern");

    if (!start.canBeEndpoint())
      throw new Error(`${start} cannot be a range endpoint`);
    if (!end.canBeEndpoint())
      throw new Error(`${end} cannot be a range endpoint`);

    this.start = start;
    this.end = end;
  }

  matchesIn(cache) {
    return cache.between(this.start, this.end);
  }

  canBeEndpoint() {
    return false;
  }

  toString() {
    return `${this.start} ... ${this.end}`;
  }
}

function parse(source) {
  const patterns = [];
  let patternSource = "";
  let PatternConstructor = null;
  let patternDelimiter = null;

  let startPattern = null;
  let betweenPattern = null;

  let i = 0;
  while (i < source.length) {
    let ch = source[i];

    if (patternDelimiter !== null && PatternConstructor !== null) {
      // Within a pattern
      if (ch === "\\") {
        // Escape sequence. Unconditionally add the next character.
        i++;
        patternSource += source[i];
      } else if (ch === patternDelimiter) {
        // Pattern delimiter. Instantiate the current pattern.
        const pattern = new PatternConstructor(patternSource);

        if (betweenPattern) {
          betweenPattern.endpoints(startPattern, pattern);

          startPattern = null;
          betweenPattern = null;
        } else {
          patterns.push(pattern);
        }

        patternSource = "";
        patternDelimiter = null;
        PatternConstructor = null;
      } else {
        patternSource += ch;
      }
    } else {
      if (ch === '"') {
        PatternConstructor = ExactPattern;
        patternDelimiter = '"';
      } else if (ch === "'") {
        PatternConstructor = ExactPattern;
        patternDelimiter = "'";
      } else if (ch === "/") {
        PatternConstructor = RegexpPattern;
        patternDelimiter = "/";
      } else if (ch === ".") {
        while (source[i + 1] === ".") {
          i++;
        }

        startPattern = patterns.pop();
        betweenPattern = new BetweenPattern();
        patterns.push(betweenPattern);
      } else if (/\s/.test(ch)) {
        // Skip whitespace
      } else {
        throw new Error(
          "You need to quote patterns with ' or \" for this command."
        );
      }
    }

    i++;
  }

  if (patternDelimiter) {
    throw new Error(`Unbalanced pattern delimiter: ${patternDelimiter}`);
  }

  if (betweenPattern) {
    throw new Error("Range without an end pattern");
  }

  return patterns;
}

exports.parse = parse;
