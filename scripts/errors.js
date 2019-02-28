// Description:
//   Handle errors in development.
//
// Configuration:
//   HUBOT_DEBUG - Set to something truthy to die on errors.

module.exports = function (robot) {
  robot.error(err => {
    robot.logger.error(err.stack)
    if (process.env.HUBOT_DEBUG) {
      process.exit(1)
    }
  })
}
