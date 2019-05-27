const {createDocumentSet} = require("../../scripts/documentset");

describe("DocumentSet stats", function() {
  let bot, documentSet;

  beforeEach(function() {
    bot = new BotContext();
  });

  afterEach(function() {
    bot.destroy();
    if (documentSet) {
      return documentSet.destroy();
    }
  });

  function populate(commandOpts, docs) {
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {
      stats: commandOpts,
    });

    return Promise.all(
      docs.map(doc => {
        const attributes = [];
        for (const kind in doc.attrs) {
          for (const value of doc.attrs[kind]) {
            attributes.push({kind, value});
          }
        }

        return documentSet.add("me", doc.body, attributes);
      })
    );
  }

  it("summarizes all known speaker and mention credits", async function() {
    usesDatabase(this);
    await populate(true, [
      {
        body: "0",
        attrs: {speaker: ["person-one", "person-two"], mention: ["person-two"]},
      },
      {body: "1", attrs: {speaker: ["person-one"], mention: ["person-three"]}},
      {
        body: "2",
        attrs: {speaker: ["person-two"], mention: ["person-one", "person-two"]},
      },
      {body: "3", attrs: {speaker: ["person-one"], mention: ["person-three"]}},
    ]);

    await bot.say("me", "@hubot blarfstats");
    const expected =
      "```\n" +
      "Username     | Spoke | Mentioned\n" +
      "--------------------------------\n" +
      "person-one   | 3     | 1\n" +
      "person-two   | 2     | 2\n" +
      "person-three | 0     | 2\n" +
      "```\n";
    await bot.waitForResponse(expected);
  });

  it("summarizes a user's speaker and mention counts", async function() {
    usesDatabase(this);
    await populate(true, [
      {body: "0", attrs: {speaker: ["person-one"], mention: ["person-two"]}},
      {body: "1", attrs: {speaker: ["person-one"], mention: ["person-three"]}},
      {
        body: "2",
        attrs: {speaker: ["person-two"], mention: ["person-one", "person-two"]},
      },
      {body: "3", attrs: {speaker: ["person-one"], mention: []}},
    ]);

    await bot.say("me", "@hubot blarfstats @person-two");
    await bot.waitForResponse(
      "person-two is *#2*, having spoken in *1* blarf and being mentioned in *2*."
    );
  });

  it("generates default help text", async function() {
    usesDatabase(this);

    await bot.loadHelp();
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {stats: true});

    await bot.say("me", "@hubot help blarfstats");
    await bot.waitForResponse(/blarfstats/);

    const messages = bot.helpLines();
    expect(messages).to.include(
      "hubot blarfstats - See who has the most blarfs."
    );
    expect(messages).to.include(
      "hubot blarfstats <user> - See the number of blarfs attributed to <user>."
    );
  });

  it("accepts custom help text", async function() {
    usesDatabase(this);

    await bot.loadHelp();
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {
      stats: {
        helpText: [
          "hubot blarfstats 1 - First line",
          "hubot blarfstats 2 - Second line",
        ],
      },
    });
    await bot.say("me", "@hubot help blarfstats");
    await bot.waitForResponse(/blarfstats/);

    const messages = bot.helpLines();
    expect(messages).to.include("hubot blarfstats 1 - First line");
    expect(messages).to.include("hubot blarfstats 2 - Second line");
  });
});
