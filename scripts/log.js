// Description:
//   View or change the current log level.

const levels = require("log");
const {Admin} = require("./roles");

const ORDERED_LEVELS = Object.keys(levels).map(levelName => {
  return [levels[levelName], levelName];
});
ORDERED_LEVELS.sort((a, b) => b[0] - a[0]);

module.exports = function(robot) {
  robot.on("brainReady", () => {
    const level = robot.brain.get("logLevel");
    if (level !== null) {
      const levelName = Object.keys(levels).find(
        name => levels[name] === level
      );

      if (levelName === undefined) {
        robot.logger.warning(
          `Unrecognized log level recovered from brain: ${level}.`
        );
        return;
      }

      if (process.env.HUBOT_LOG_LEVEL) {
        robot.logger.info(
          `Overriding brain log level ${levelName} for HUBOT_LOG_LEVEL value ${process.env.HUBOT_LOG_LEVEL}.`
        );
        return;
      }

      robot.logger.level = level;
      robot.logger.info(`Log level initialized to ${levelName}.`);
    }
  });

  robot.respond(/log level(?: (\S+))?/, msg => {
    if (!Admin.verify(robot, msg)) {
      return;
    }

    let knownLevel = false;
    const levelString = ORDERED_LEVELS.map(([levelValue, levelName]) => {
      if (levelValue === robot.logger.level) {
        knownLevel = true;
        return `*${levelName}*`;
      } else {
        return levelName;
      }
    }).join(" ");

    if (!msg.match[1]) {
      if (!knownLevel) {
        msg.reply(`The current log level is _${robot.logger.level}_.`);
        return;
      }

      msg.reply(`The current log level is:\n${levelString}`);
      return;
    }

    const levelName = msg.match[1].toUpperCase();
    const level = levels[levelName];
    if (typeof level !== "number") {
      msg.reply(
        `I don't recognize the log level ${levelName}.\nKnown log levels: ${levelString}`
      );
      return;
    }

    robot.logger.level = level;
    robot.brain.set("logLevel", level);
    msg.reply(`Log level set to ${levelName}.`);
  });
};
