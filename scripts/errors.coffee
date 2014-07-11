# Description:
#   Handle errors in development.
#
# Configuration:
#   HUBOT_DEBUG - Set to something truthy to die on errors.

module.exports = (robot) ->

  robot.error (err, msg) ->
    robot.logger.error err.stack
    process.exit 1 if process.env.HUBOT_DEBUG
