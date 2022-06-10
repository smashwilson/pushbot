// Description:
//   Patch the msg.message.user model with keys from the user model in storage.

const _ = require("underscore");

module.exports = function (robot) {
  const userChange = function (user) {
    let key, value;
    if (!user) {
      return;
    }
    if (!user.id) {
      return;
    }
    const newUser = {
      name: user.name,
      real_name: user.real_name,
      email_address: user.profile ? user.profile.email : "",
      slack: {},
    };

    for (key in user) {
      value = user[key];
      if (typeof value === "function") {
        continue;
      }
      newUser.slack[key] = value;
    }

    if (user.id in robot.brain.data.users) {
      for (key in robot.brain.data.users[user.id]) {
        value = robot.brain.data.users[user.id][key];
        if (!(key in newUser)) {
          newUser[key] = value;
        }
      }
    }
    delete robot.brain.data.users[user.id];
    robot.brain.userForId(user.id, newUser);
  };

  const reloadUsers = function () {
    if (!robot.adapter.client) {
      return;
    }
    if (!robot.adapter.client.rtm) {
      return;
    }
    if (!robot.adapter.client.rtm.dataStore) {
      return;
    }

    let count = 0;
    for (let id in robot.adapter.client.rtm.dataStore.users) {
      const user = robot.adapter.client.rtm.dataStore.users[id];
      userChange(user);
      count++;
    }
    return count;
  };

  robot.brain.on("loaded", reloadUsers);

  robot.receiveMiddleware(function (context, next, done) {
    const messageUser = context.response.message.user;
    const storedUser = robot.brain.data.users[messageUser.id];
    if (storedUser != null) {
      _.defaults(messageUser, storedUser);
    }

    return next(done);
  });

  return robot.respond(/reload users/i, function (msg) {
    const count = reloadUsers();
    msg.reply(`${count} users reloaded.`);
  });
};
