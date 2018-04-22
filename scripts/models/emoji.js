// 1 hour
const MAX_AGE = 60 * 60 * 1000

class EmojiCache {
  constructor (robot) {
    this.robot = robot
    this.refreshPromise = null
    this.resolveRefreshPromise = () => {}
  }

  async get (emojiName) {
    let payload = this.robot.brain.get('slack:emoji')

    if (!payload) {
      await this.refresh()
      payload = this.robot.brain.get('slack:emoji')
    }

    if (payload && Date.now() - payload.age >= MAX_AGE) {
      this.refresh()
    }

    if (!payload) {
      payload = {emoji: {}}
    }

    return payload.emoji[emojiName] || null
  }

  async refresh () {
    const client = this.robot.adapter.client
    if (!client || !client.web || !client.web.emoji || !client.web.emoji.list) {
      return
    }

    if (this.refreshPromise) {
      await this.refreshPromise
      return
    }

    this.refreshPromise = new Promise(resolve => {
      this.resolveRefreshPromise = resolve
    })

    const payload = await client.web.emoji.list()
    payload.age = Date.now()
    this.robot.brain.set('slack:emoji', payload)
    this.resolveRefreshPromise()
  }
}

function emojiCacheFor (robot) {
  return new EmojiCache(robot)
}

module.exports = {emojiCacheFor}
