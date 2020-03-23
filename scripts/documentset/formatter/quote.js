module.exports = function (lines, speakers, mentions, userTz) {
  return {
    body: lines
      .map((line) => {
        if (line.isRaw()) {
          return line.text;
        } else {
          return `[${line.timestamp
            .tz("America/New_York")
            .format("h:mm A D MMM YYYY")}] ${line.speaker}: ${line.text}`;
        }
      })
      .join("\n"),
    speakers,
    mentions,
  };
};
