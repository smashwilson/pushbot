// Description:
//   Generate random writing prompts.
//
// Commands:
//   hubot prompt me <n> - Generate n writing prompts.

module.exports = function (robot) {
  robot.respond(/prompt\s+me(?:\s+(\d+))?/i, function (msg) {
    const count = msg.match[1] || 1

    let url = 'http://itcamefromwritingprompts.com/api/generate'
    if (count > 1) { url += `/${count}` }

    return msg.http(url).get()(function (err, _res, body) {
      if (err) {
        msg.send(err)
        return
      }

      try {
        const json = JSON.parse(body)
        return Array.from(json.generated).map(msg.send)
      } catch (error) {
        err = error
        msg.send(`Document:\n\`\`\`\n${body}\n\`\`\``)
        msg.send(`Error: *${err}*`)
      }
    })
  })
}
