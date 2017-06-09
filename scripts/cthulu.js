// Description:
//   Summon a Great Old One
// Commands:
//   Ia! Ia! Cthulhu fhtagn! - Awaken the Great Old One

module.exports = function (robot) {
  robot.hear(/Ia! Ia! Cthulhu fhtagn!/i, msg => {
    msg.send(
      ':tentacle2: :tentacle2: :tentacle2: :tentacle2: :cthulhuul::cthulhuur: :tentacle: :tentacle: :tentacle: :tentacle:\n' +
      ':tentacle2: :tentacle2: :tentacle2: :tentacle2: :cthulhull::cthulhulr: :tentacle: :tentacle: :tentacle: :tentacle:'
    )
  })
}
