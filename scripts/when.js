// Description:
//   What day is it?
//
// Commands:
//   hubot when - what day is it?

const moment = require('moment-timezone')

const DAYS = [
  'https://user-images.githubusercontent.com/13645/35175032-cea2a374-fd3f-11e7-8009-9217789c6a4a.png',
  'https://user-images.githubusercontent.com/13645/35175030-ce7b6034-fd3f-11e7-851b-39b28602ff89.png',
  'https://user-images.githubusercontent.com/13645/35175034-cec9c116-fd3f-11e7-8988-f31587cd8058.png',
  'https://user-images.githubusercontent.com/13645/35175035-cedeeca8-fd3f-11e7-81af-713f00b09671.png',
  'https://user-images.githubusercontent.com/13645/35175033-cebaa672-fd3f-11e7-89a8-5b24ebd40c40.png',
  'https://user-images.githubusercontent.com/13645/35175029-ce6be492-fd3f-11e7-9dba-ea3ffc6982c4.png',
  'https://user-images.githubusercontent.com/13645/35175031-ce8d88e0-fd3f-11e7-8f85-64e4fcd04b91.png'
]

const ALIASES = {
  'sunday': 0,
  'sun': 0,
  'monday': 1,
  'mon': 1,
  'tuesday': 2, // It's 2sday!
  'tue': 2,
  'wednesday': 3,
  'wed': 3,
  'thursday': 4,
  'thu': 4,
  'friday': 5,
  'fri': 5,
  'saturday': 6,
  'sat': 6
}

module.exports = function (robot) {
  robot.respond(/when(?:\s+(.+))*/i, msg => {
    const when = msg.match[1]
    const userTz = msg.message.user.tz

    let now = moment.tz(userTz)
    if (when) {
      const parsed = moment.tz(when, moment.ISO_8601, true, userTz)
      if (parsed.isValid()) {
        now = parsed
      } else {
        const alias = ALIASES[when.toLowerCase()]
        if (alias !== undefined) {
          msg.send(DAYS[alias])
          return
        }
      }
    }

    msg.send(DAYS[now.day()])
  })
}
