// Description:
//   Inform someone of their new lot in life

module.exports = function (robot) {
  robot.respond(/furry\s+citation\s*$/i, msg => {
    msg.send('https://static1.e621.net/data/54/92/54927df9c2746b6bd28e0db41229f88d.gif')
  })
}
