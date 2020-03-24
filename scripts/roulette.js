// Description:
//   Play a game of russian roulette!
//
// Commands:
//   hubot roulette - take your chances

module.exports = function (robot) {
  robot.respond(/roulette/i, function (msg) {
    const {data} = robot.brain;
    if (data.roulette == null) {
      data.roulette = 0;
    }
    if (data.roulette <= 0) {
      data.roulette = Math.floor(Math.random() * 6 + 1);
      msg.send("Reloading");
    }
    // Pull the trigger
    data.roulette -= 1;
    if (data.roulette <= 0) {
      msg.send("BANG!");
    } else {
      msg.send("click");
    }
  });
};
