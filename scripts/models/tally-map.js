
class TallyMap {
  constructor (brain, key) {
    this.brain = brain
    this.key = key
  }

  forUser (uid) {
    const userMap = this.brain.get(this.key) || {}
    return userMap[uid] || {}
  }

  modifyTally (uid, key, delta) {
    const userMap = this.brain.get(this.key) || {}
    const userTally = userMap[uid] || {}

    userTally[key] = (userTally[key] || 0) + delta
    if (userTally[key] <= 0) {
      delete userTally[key]
    }

    userMap[uid] = userTally
    this.brain.set(this.key, userMap)
  }

  topForUser (uid, n, callback) {
    const userMap = this.forUser(uid)

    const pairs = []
    for (const k in userMap) {
      pairs.push([k, userMap[k]])
    }
    pairs.sort((a, b) => b[1] - a[1])

    let count = 0
    for (const pair of pairs) {
      if (count >= n) {
        return
      }

      callback(null, ...pair)
      count++
    }
  }

  topForKey (key, n, callback) {
    const userMap = this.brain.get(this.key) || {}
    const perUserPairs = []
    for (const uid in userMap) {
      const tally = userMap[uid][key] || 0
      perUserPairs.push([uid, tally])
    }
    perUserPairs.sort((a, b) => b[1] - a[1])

    let count = 0
    for (const pair of perUserPairs) {
      if (count >= n) {
        return
      }

      callback(null, ...pair)
      count++
    }
  }

  static reactionsReceived (robot) {
    return new TallyMap(robot.brain, 'reactionsReceived')
  }

  static reactionsGiven (robot) {
    return new TallyMap(robot.brain, 'reactionsGiven')
  }
}

module.exports = { TallyMap }
