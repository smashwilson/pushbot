// Description:
//   Let everyone know that you know what you did, and you regret *nothing*
//
// Commands:
//   hubot zing - someone made a terrible joke

const zings = {
  atomicknight: 'https://user-images.githubusercontent.com/17565/27990023-1c97c360-6417-11e7-96b9-aa73761b1a09.jpg',
  femshep: 'https://user-images.githubusercontent.com/17565/27990024-1e83c4f8-6417-11e7-9a49-3292c761110f.jpg',
  fenris: 'https://user-images.githubusercontent.com/17565/27990025-20754778-6417-11e7-992e-377d82831c8c.jpg',
  iguanaditty: 'https://user-images.githubusercontent.com/17565/27990026-23b9d836-6417-11e7-953d-67ff9f1a2953.jpg',
  jrhusel: 'https://user-images.githubusercontent.com/17565/27990027-252fb74e-6417-11e7-9afb-7467fedb7f50.jpg',
  'purr-purr': 'https://user-images.githubusercontent.com/17565/27990028-2685c6ec-6417-11e7-8ecb-831b90bad97e.jpg',
  reostra: 'https://user-images.githubusercontent.com/17565/27990029-27c0c318-6417-11e7-9c47-d9b5a6551c26.jpg'
}

module.exports = function (robot) {
  robot.respond(/zing(?:\s+@?(\S+))?/i, msg => {
    let zingReq = msg.match[1]
    if (zingReq === 'me') {
      zingReq = msg.message.user.name
    }

    const zing = zings[zingReq] || zings[msg.atRandom(Object.keys(zings))]
    msg.send(zing)
  })
}
