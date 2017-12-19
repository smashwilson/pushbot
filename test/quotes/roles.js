const OnlyMe = {
  verify: (robot, msg) => {
    if (msg.message.user.name === 'me') {
      return true
    }

    msg.reply('NOPE')
    return false
  }
}

const Nobody = {
  verify: (robot, msg) => {
    return false
  }
}

module.exports = {OnlyMe, Nobody}
