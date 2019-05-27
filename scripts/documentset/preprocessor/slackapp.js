// Accept text copied and pasted from the Slack thick-client.

const moment = require("moment-timezone");
const createMentionDetector = require("./mentions");
const Line = require("../../models/line");

// RegExp snippets for re-use
const TS = "\\[(\\d{1,2}:\\d{2}( [aApP][mM])?)\\]"; // [11:22 AM] *or* [16:00]

// RegExps
const rxWs = /^\s*$/;
const rxNickLine = new RegExp(`^\\s*(\\S+)\\s+${TS}\\s*$`);
const rxTsLine = new RegExp(`^\\s*${TS}\\s*$`);
const rxNewMessagesLine = new RegExp(`^\\s*new messages\\s*$`);

function parseTs(ts) {
  const parsed = moment.tz(ts, ["h:mm a", "H:mm"], true, "America/New_York");
  if (!parsed.isValid()) {
    throw new Error(`Invalid date: ${ts}`);
  }
  return parsed;
}

module.exports = function(robot, text) {
  let nick, ts, ampm;
  const mentionDetector = createMentionDetector(robot);

  const result = [];
  const speakers = new Set();
  const mentions = new Set();

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let body = lines[i];

    if (rxWs.test(body)) {
      continue;
    }

    if (rxNewMessagesLine.test(body)) {
      continue;
    }

    const nickMatch = rxNickLine.exec(body);
    if (nickMatch) {
      nick = nickMatch[1].replace(/APP$/, "");
      ts = parseTs(nickMatch[2]);
      ampm = nickMatch[3];
      continue;
    }

    const tsMatch = rxTsLine.exec(body);
    if (tsMatch) {
      ampm = tsMatch[2] || ampm || "";
      ts = parseTs(tsMatch[1] + ampm);
      continue;
    }

    if (!nick && !ts) {
      throw new Error("Expected nick and timestamp line first.");
    }

    body = body.replace(/\s*\(edited\)$/, "");

    for (const mention of mentionDetector.scan(body)) {
      mentions.add(mention);
    }

    speakers.add(nick);

    result.push(new Line(ts, nick, body));
  }

  return {lines: result, speakers, mentions};
};
