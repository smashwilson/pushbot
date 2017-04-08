// Accept text copied and pasted from the Slack thick-client.

const moment = require('moment');

// RegExp snippets for re-use
const TS = '\\[(\\d{1,2}:\\d{2}( [aApP][mM])?)\\]'; // [11:22 AM] *or* [16:00]

// RegExps
const rxWs = /^\s*$/;
const rxNickLine = new RegExp(`^\\s*(\\S+)\\s+${TS}\\s*$`);
const rxTsLine = new RegExp(`^\\s*#{TS}\\s*$`);
const rxNewMessagesLine = new RegExp(`^\\snew messages*\\s*$`);

function parseTs(ts) {
  const parsed = moment(ts, ['h:mm a', 'H:mm'], true);
  if (!parsed.isValid()) {
    throw new Error(`Invalid date: ${ts}`);
  }
  return parsed;
}

module.exports = function(text) {
  let nick, ts, ampm;

  const result = [];
  const speakers = new Set();

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (rxWs.test(line)) {
      continue;
    }

    if (rxNewMessagesLine.test(line)) {
      continue;
    }

    const nickMatch = rxNickLine.exec(line);
    if (nickMatch) {
      nick = nickMatch[1];
      ts = parseTs(nickMatch[2]);
      ampm = nickMatch[3];
      continue;
    }

    const tsMatch = rxTsLine.exec(line);
    if (tsMatch) {
      ts = parseTs(tsMatch[1]);
      ampm = tsMatch[2];
      continue;
    }

    if (!nick && !ts) {
      throw new Error('Expected nick and timestamp line first.');
    }

    line = line.replace(/\s*\(edited\)$/, '');

    result.push(`[${ts.format('h:mm A D MMM YYYY')}] ${nick}: ${line}`);
    speakers.add(nick);
  }

  return {
    body: result.join('\n'),
    attributes: Array.from(speakers, value => ({kind: 'speaker', value}))
  };
};
