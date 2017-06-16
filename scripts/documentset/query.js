// Convert a raw query string to a PostgreSQL-compatible regular expression.
module.exports = function (query) {
  const terms = []

  let i = 0
  let currentTerm = ''
  let termTerminator = null

  function appendToTerm (letter) {
    // Escape regular expression metacharacters
    if ('.+*?^$|()[]\\{}'.indexOf(letter) !== -1) {
      currentTerm += '\\' + letter
    } else {
      currentTerm += letter
    }
  }

  while (i < query.length) {
    const letter = query[i]

    // Backslash escapes
    if (letter === '\\') {
      i++
      appendToTerm(query[i])
    } else if (termTerminator !== null) {
      // Within a term
      if (termTerminator.test(letter)) {
        terms.push(currentTerm)
        currentTerm = ''
        termTerminator = null
      } else {
        appendToTerm(letter)
      }
    } else {
      // Outside of a term
      if (letter === '"') {
        termTerminator = /"/
      } else if (letter === "'") {
        termTerminator = /'/
      } else if (/\S/.test(letter)) {
        appendToTerm(letter)
        termTerminator = /\s/
      }
    }

    i++
  }

  if (currentTerm.length > 0) {
    terms.push(currentTerm)
  }

  return terms
}
