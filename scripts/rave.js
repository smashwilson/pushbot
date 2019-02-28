// Description:
//   When the bass drops, it's time to rave
// Commands:
//   Drop the bass - party time

module.exports = function(robot) {
  robot.hear(/Drop the bass/i, msg =>
    msg.send(":rave: :rave_shuffle: :rave: :rave_shuffle: :rave:")
  );
};
