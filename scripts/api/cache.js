const cache = require("../models/cache");
const {UserSetResolver} = require("./user-set");
const {getChannelNameByID, getChannelIDByName} = require("../helpers");

class CacheResolver {
  knownChannels(options, req) {
    return cache
      .known(req.robot)
      .map((id) => getChannelNameByID(req.robot, id))
      .filter(Boolean);
  }

  linesForChannel({channel}, req) {
    let existing = cache.forChannel(req.robot, channel, false);
    if (!existing) {
      const id = getChannelIDByName(channel);
      if (id) {
        existing = cache.forChannel(req.robot, id, false);
      }
    }

    if (!existing) {
      return null;
    }

    const userSetResolver = new UserSetResolver();
    const lines = existing.lines.slice();
    lines.reverse();

    return lines
      .map((line) => {
        return {
          id: line.id,
          speaker: line.speaker
            ? userSetResolver.withName({name: line.speaker}, req)
            : null,
          timestamp: line.timestamp.valueOf(),
          text: line.text,
        };
      })
      .filter((result) => Boolean(result.speaker));
  }
}

module.exports = {CacheResolver};
