const {UserSetResolver} = require("./user-set");
const {DocumentSetResolver, DocumentResolver} = require("./document-set");
const {CacheResolver} = require("./cache");
const {BrainResolver, BrainMutator} = require("./brain");
const {RemResolver} = require("./rem");

const bufferPreprocessor = require("../documentset/preprocessor/buffer");
const briefFormatter = require("../documentset/formatter").brief;
const {getChannelIDByName} = require("../helpers");
const cache = require("../models/cache");
const {CalendarMap} = require("../models/calendar");

module.exports = {
  me(args, req) {
    return new UserSetResolver().me(args, req);
  },

  users() {
    return new UserSetResolver();
  },

  documentSets(args, req) {
    return Object.keys(req.robot.documentSets || {});
  },

  documents({set}, req) {
    const sets = req.robot.documentSets || {};
    const documentSet = sets[set];

    return documentSet && new DocumentSetResolver(set, documentSet);
  },

  cache() {
    return new CacheResolver();
  },

  brain() {
    return new BrainResolver();
  },

  calendarURL(args, req) {
    const calendarId = CalendarMap.inRobot(req.robot).getCalendar(
      req.user.id,
      req.user.tz || "America/New_York"
    );
    return `${process.env.API_BASE_URL}/ical/${calendarId}`;
  },

  rem() {
    return new RemResolver();
  },

  async createDocument({set, channel, lines}, req) {
    const sets = req.robot.documentSets || {};
    const documentSet = sets[set];

    if (!documentSet) throw new Error(`Unknown document set ${set}`);
    const addSpec = documentSet.spec.features.add;
    if (!addSpec) throw new Error(`Cannot add to document set ${set}`);
    if (addSpec.userOriented)
      throw new Error(`Document set ${set} requires a subject`);

    const role = addSpec.role;
    if (!role.isAllowed(req.robot, req.user))
      throw new Error(`You are not authorized to add to document set ${set}`);

    let existing = cache.forChannel(req.robot, channel, false);
    if (!existing) {
      const id = getChannelIDByName(req.robot, channel);
      if (id) {
        existing = cache.forChannel(req.robot, id, false);
      }
    }
    if (!existing) throw new Error(`No lines available in channel ${channel}`);

    const ids = new Set(lines);
    if (ids.size === 0) throw new Error("You must provide at least one line");
    const chosen = existing.lines.filter((line) => ids.delete(line.id));
    if (ids.size > 0)
      throw new Error(
        `Unable to find lines with IDs: ${Array.from(ids).join(", ")}`
      );
    chosen.reverse();

    const processed = bufferPreprocessor.fromLines(req.robot, chosen);
    const formatted = addSpec.formatter(
      processed.lines,
      processed.speakers,
      processed.mentions
    );

    const announcement =
      `_<@${req.user.id}> quoted_\n` +
      briefFormatter(processed.lines, processed.speakers, processed.mentions)
        .body;
    req.robot.messageRoom(channel, announcement);

    const body = formatted.body;
    const attributes = [];
    for (const value of formatted.speakers) {
      attributes.push({kind: "speaker", value});
    }
    for (const value of formatted.mentions) {
      attributes.push({kind: "mention", value});
    }

    const doc = await documentSet.add(req.user.name, body, attributes);
    return new DocumentResolver(doc);
  },

  setBrainKey: BrainMutator.set,
};
