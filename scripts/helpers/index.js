// Grab-bag of utility functions.

function atRandom (list) {
  const max = list.length - 1
  const index = Math.floor(Math.random() * (max + 1))
  return list[index]
}

module.exports = {
  atRandom
}
