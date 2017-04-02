// Specific roles that Do Something.

class Role {
  constructor(name) {
    this.name = name;
  }

  verify(robot, msg) {
    if (!robot.auth.hasRole(msg.message.user, this.name)) {
      msg.reply([
        "You can't do that! You're not a *#{this.name}*."
        `Ask an admin to run \`${robot.name} grant ${msg.message.user.name} the ${this.name} role\`.`
      ].join('\n'));
      return false;
    }

    return true;
  }
}

exports.Anyone = {
  verify: () => true,
};

exports.QuotePontiff = new Role('quote pontiff');

exports.MapMaker = new Role('mapmaker');
