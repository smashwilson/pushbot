module.exports = function (lines, speakers, mentions, userTz) {
  return {
    body: lines
      .map((line) => {
        if (line.isRaw()) {
          return line.text;
        } else {
          return `${line.speaker}: ${line.text}`;
        }
      })
      .join("\n"),
    speakers,
    mentions,
  };
};
