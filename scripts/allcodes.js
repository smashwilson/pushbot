// Description:
//   Special-case !allswitchcodes and !allpsn to return all known codes at once.
//
// Commands:
//   hubot allswitchcodes - Dump everyone's Switch friend code.
//   hubot allpsn - Dump everyone's PSN username.

module.exports = function(robot) {
  async function allCodes(msg, dsName, {missing, header}) {
    const ds = robot.documentSets[dsName];
    if (!ds) {
      msg.reply(missing);
      return;
    }

    const {documents} = await ds.allMatching([], "");

    let longestUsername = 0;
    for (const document of documents) {
      const subject = document
        .getAttributes()
        .find(attr => attr.kind === "subject");
      if (!subject) continue;

      longestUsername = Math.max(longestUsername, subject.value.length);
    }

    let response = "";

    response += header;
    response += "\n```\n";
    for (const document of documents) {
      const subject = document
        .getAttributes()
        .find(attr => attr.kind === "subject");
      if (!subject) continue;

      response += subject.value;
      for (let i = 0; i < longestUsername - subject.value.length; i++)
        response += " ";
      response += " | ";
      response += document.getBody();
      response += "\n";
    }
    response += "```\n";

    msg.send(response);
  }

  robot.respond(/allswitchcodes\b/i, async msg => {
    await allCodes(msg, "switchcode", {
      missing: "No switchcode mappings present.",
      header: ":switch_left: Nintendo Switch Friend Codes :switch_right:",
    });
  });

  robot.respond(/allpsns\b/i, async msg => {
    await allCodes(msg, "psn", {
      missing: "No PSN mappings present.",
      header: ":psn: PlayStation Network usernames :psn:",
    });
  });

  robot.respond(/allxboxes\b/i, async msg => {
    await allCodes(msg, "xbox", {
      missing: "No XBox mappings present.",
      header: ":xbox: XBox gamertags :xbox:",
    });
  });
};
