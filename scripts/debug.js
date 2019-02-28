// Description:
//   Diagnostic commands.
//
// Commands:
//   hubot debug_user <username> - dump everything from someone's user object.

const {inspect} = require("util");

const OPTS = {depth: 3, maxArrayLength: 10, breakLength: 120};

module.exports = function(robot) {
  robot.respond(/debug_user(?: (.+))?/i, function(msg) {
    let header, u;
    if (msg.match[1]) {
      u = robot.brain.userForName(msg.match[1]);
      header = `user named ${msg.match[1]}`;
    } else {
      u = msg.message.user;
      header = "your user object";
    }

    if (!u) {
      msg.reply(`I don't know anyone named ${msg.match[1]}.`);
      return;
    }

    msg.reply(`${header}\n\`\`\`\n${inspect(u, OPTS)}\n\`\`\`\n`);
  });

  robot.respond(/debug_message/i, function(msg) {
    msg.reply(`msg.message\n\`\`\`\n${inspect(msg.message, OPTS)}\n\`\`\`\n`);
  });

  return robot.respond(/debug_role/i, function(msg) {
    const u = msg.message.user;

    const brainUser = robot.brain.data.users[u.id];

    msg.reply(
      [
        `u.roles = \`${inspect(u.roles, OPTS)}\``,
        `robot.auth.userRoles u = \`${robot.auth.userRoles(u)}\``,
        `robot.auth.isAdmin u = \`${robot.auth.isAdmin(u)}\``,
        `robot.auth.hasRole u, 'quote pontiff' = \`${robot.auth.hasRole(
          u,
          "quote pontiff"
        )}\``,
        `robot.auth.hasRole u, ['quote pontiff'] = \`${robot.auth.hasRole(u, [
          "quote pontiff",
        ])}\``,
        `brainUser.roles = \`${inspect(brainUser.roles, OPTS)}\``,
        `robot.auth.userRoles brainUser = \`${robot.auth.userRoles(
          brainUser
        )}\``,
        `robot.auth.isAdmin brainUser = \`${robot.auth.isAdmin(brainUser)}\``,
        `robot.auth.hasRole brainUser, 'quote pontiff' = \`${robot.auth.hasRole(
          brainUser,
          "quote pontiff"
        )}\``,
        `robot.auth.hasRole brainUser, ['quote pontiff'] = \`${robot.auth.hasRole(
          brainUser,
          ["quote pontiff"]
        )}\``,
      ].join("\n")
    );
  });
};
