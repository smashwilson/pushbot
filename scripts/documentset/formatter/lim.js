module.exports = function(lines, speakers, mentions) {
  let body = lines.map(line => `> ${line.text}`).join("\n");

  const atSpeakers = Array.from(speakers, speaker => "@" + speaker);

  switch (atSpeakers.length) {
    case 0:
      body += "\n\n  - _anonymous_";
      break;
    case 1:
      body += `\n\n  - by @${atSpeakers[0]}`;
      break;
    case 2:
      body += `\n\n  - a collaboration by ${atSpeakers.join(" and ")}`;
      break;
    default:
      const allButLast = atSpeakers.slice(0, atSpeakers.length - 1);
      const last = atSpeakers[atSpeakers.length - 1];

      body += `\n\n - by ${allButLast.join(", ")} and ${last}`;
      break;
  }

  return {body, speakers, mentions: []};
};
