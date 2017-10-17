// Specific roles that Do Something.

class Role {
  constructor (name) {
    this.name = name
  }

  isAllowed (robot, user) {
    return robot.auth.hasRole(user, this.name)
  }

  verify (robot, msg) {
    if (!this.isAllowed(msg.message.user, this.name)) {
      msg.reply([
        `You can't do that! You're not a *${this.name}*.`,
        `Ask an admin to run \`${robot.name} grant ${msg.message.user.name} the ${this.name} role\`.`
      ].join('\n'))
      return false
    }

    return true
  }
}

exports.Anyone = {
  isAllowed: () => true,
  verify: () => true
}

exports.Admin = {
  isAllowed (robot, user) {
    return robot.auth.isAdmin(user)
  },

  verify (robot, msg) {
    if (!exports.Admin.isAllowed(msg.message.user)) {
      msg.reply('Only an admin can do that.')
      return false
    }
    return true
  }
}

exports.QuotePontiff = new Role('quote pontiff')

exports.PoetLaureate = new Role('poet laureate')

exports.MapMaker = new Role('mapmaker')
