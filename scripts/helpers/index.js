// Grab-bag of utility functions.

const yargs = require("yargs/yargs");

function atRandom(list) {
  const max = list.length - 1;
  const index = Math.floor(Math.random() * (max + 1));
  return list[index];
}

const NullDataStore = {
  getChannelGroupOrDMById() {
    return null;
  },

  getChannelByName() {
    return null;
  },
};

function getChannelNameByID(robot, id) {
  const client = robot.adapter.client;
  if (!client) return null;

  const channelData = client.channelData[id];
  if (!channelData) return null;

  return channelData.channel.name;
}

function getChannelIDByName(robot, name) {
  const client = robot.adapter.client;
  if (!client) return null;

  for (const id of Object.keys(client.channelData || {})) {
    if (client.channelData[id].channel.name === name) {
      return id;
    }
  }

  return null;
}

// Parse command options provided with shell-like syntax

function parseArguments(msg, argline, fn) {
  const y = fn(yargs().version(false));
  return new Promise((resolve) => {
    y.parse(argline, (err, argv, output) => {
      if (err) {
        msg.reply(`:boom: You broke it!\n${msg}\n${this.yargs.help()}`);
        resolve(null);
      }

      if (output) {
        msg.reply(output);
      }

      resolve(argv);
    });
  });
}

module.exports = {
  atRandom,
  getChannelIDByName,
  getChannelNameByID,
  parseArguments,
};
