// Description:
//   Special-case !allswitchcodes.
//
// Commands:
//   hubot allswitchcodes - Dump everyone's Switch friend code.

module.exports = function (robot) {
  robot.respond(/allswitchcodes\b/i, async msg => {
    const ds = robot.documentSets.switchcode
    if (!ds) {
      msg.reply('No switchcode mappings present.')
      return
    }

    const {documents} = await ds.allMatching([], '')

    let longestUsername = 0
    for (const document of documents) {
      const subject = document.getAttributes().find(attr => attr.kind === 'subject')
      if (!subject) continue

      longestUsername = Math.max(longestUsername, subject.value.length)
    }

    let response = ''

    response += ':switch_left: Nintendo Switch Friend Codes :switch_right:\n```\n'
    for (const document of documents) {
      const subject = document.getAttributes().find(attr => attr.kind === 'subject')
      if (!subject) continue

      response += subject.value
      for (let i = 0; i < longestUsername - subject.value.length; i++) response += ' '
      response += ' | '
      response += document.getBody()
      response += '\n'
    }
    response += '\n```\n'

    msg.send(response)
  })
}
