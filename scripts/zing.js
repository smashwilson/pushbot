// Description:
//   Let everyone know that you know what you did, and you regret *nothing*
//
// Commands:
//   hubot zing - someone made a terrible joke

const { atRandom } = require('./helpers')

const zings = {
  aschwa2: 'https://user-images.githubusercontent.com/17565/45127811-20bfc300-b148-11e8-930b-0c8be7d0521f.jpg',
  atomicknight: 'https://user-images.githubusercontent.com/17565/27990023-1c97c360-6417-11e7-96b9-aa73761b1a09.jpg',
  femshep: 'https://user-images.githubusercontent.com/17565/27990024-1e83c4f8-6417-11e7-9a49-3292c761110f.jpg',
  fenris: 'https://user-images.githubusercontent.com/17565/27990025-20754778-6417-11e7-992e-377d82831c8c.jpg',
  iguanaditty: 'https://user-images.githubusercontent.com/17565/27990026-23b9d836-6417-11e7-953d-67ff9f1a2953.jpg',
  jrhusel: 'https://user-images.githubusercontent.com/17565/27990027-252fb74e-6417-11e7-9afb-7467fedb7f50.jpg',
  llynmir: 'https://user-images.githubusercontent.com/13645/29254394-afbc7e9e-8062-11e7-9896-c668fdaf1352.jpg',
  'purr-purr': 'https://user-images.githubusercontent.com/17565/27990028-2685c6ec-6417-11e7-8ecb-831b90bad97e.jpg',
  reostra: 'https://user-images.githubusercontent.com/17565/27990029-27c0c318-6417-11e7-9c47-d9b5a6551c26.jpg',
  smashwilson: 'https://user-images.githubusercontent.com/17565/27990125-e5849886-641a-11e7-8ca1-cac9dd731cf4.jpg',
  phbarna: 'https://user-images.githubusercontent.com/17565/28244206-7ec77720-69b1-11e7-8456-dd0aa5055511.png',
  earmuffs: 'https://user-images.githubusercontent.com/17565/32245435-241aedde-be52-11e7-862d-eac1615022c7.jpg',
  frey: 'https://user-images.githubusercontent.com/17565/32245443-2836eb84-be52-11e7-8ef4-6aec7b1af49b.jpg',
  haus: 'https://user-images.githubusercontent.com/17565/32245445-29e0105a-be52-11e7-90bf-1b868bbab590.jpg',
  wrbritt: 'https://user-images.githubusercontent.com/17565/47888710-4c93b800-de1c-11e8-9142-e69bfb582407.jpeg',
  rachel: 'https://user-images.githubusercontent.com/17565/48202207-390fb200-e332-11e8-9168-f7e29b4fac3a.jpg',
  shepard: 'https://user-images.githubusercontent.com/17565/48202235-517fcc80-e332-11e8-80ea-53804ab9c1d8.jpg'
}

module.exports = function (robot) {
  robot.respond(/zing(?:\s+@?(\S+))?/i, msg => {
    let zingReq = msg.match[1]
    if (zingReq === 'me') {
      zingReq = msg.message.user.name
    }

    let zing = `I don't have a zing yet for ${zingReq}.`
    if (zingReq) {
      if (zings[zingReq]) zing = zings[zingReq]
    } else {
      zing = zings[atRandom(Object.keys(zings))]
    }
    msg.send(zing)
  })
}
