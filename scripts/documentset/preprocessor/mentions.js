const never = {
  exec() {
    return undefined;
  },
};

class Detector {
  constructor(robot) {
    const userMap = robot.brain.users();
    const usernames = Object.keys(userMap).map((uid) => userMap[uid].name);

    if (usernames.length > 0) {
      const rxBody = `\\b@?(${usernames.join("|")}):?\\b`;
      this.rx = new RegExp(rxBody, "ig");
    } else {
      this.rx = never;
    }
  }

  scan(text) {
    const mentions = new Set();
    this.rx.lastIndex = 0;

    let match = this.rx.exec(text);
    while (match) {
      mentions.add(match[1]);

      match = this.rx.exec(text);
    }
    return mentions;
  }
}

module.exports = function (robot) {
  return new Detector(robot);
};
