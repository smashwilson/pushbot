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

function getDataStore(robot) {
  const adapter = robot.adapter;
  const client = adapter.client;
  if (!client) return NullDataStore;
  const rtm = client.rtm;
  if (!rtm) return NullDataStore;
  const dataStore = rtm.dataStore;
  if (!dataStore) return NullDataStore;
  return dataStore;
}

// Parse command options provided with shell-like syntax

function parseArguments(msg, argline, fn) {
  const y = fn(yargs().version(false));
  return new Promise(resolve => {
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
  getDataStore,
  parseArguments,
};
