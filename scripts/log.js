// Description:
//   View or change the current log level.

const levels = require("log");
const {Admin} = require("./roles");

module.exports = function(robot) {
  robot.respond(/log level(?: (\S+))?/, msg => {
    if (!Admin.verify(robot, msg)) {
      return;
    }

    if (!msg.match[1]) {
      for (const levelName of Object.keys(levels)) {
        if (levels[levelName] === robot.logger.level) {
          msg.reply(`The current log level is *${levelName}*.`);
          return;
        }
      }
      msg.reply(`The current log level is _${robot.logger.level}_.`);
      return;
    }

    const levelName = msg.match[1].toUpperCase();
    const level = levels[levelName];
    if (typeof level !== "number") {
      msg.reply(`I don't recognize the log level ${levelName}.`);
      return;
    }

    robot.logger.level = level;
    msg.reply(`Log level set to ${levelName}.`);
  });
};
