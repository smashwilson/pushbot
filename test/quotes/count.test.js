const {createDocumentSet} = require("../../scripts/documentset");
const {OnlyMe} = require("./roles");

describe("DocumentSet count", function () {
  let bot, documentSet;

  beforeEach(function () {
    bot = new BotContext();
  });

  afterEach(function () {
    bot.destroy();
    if (documentSet) {
      return documentSet.destroy();
    }
  });

  function populate(commandOpts = true, docs = []) {
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {
      count: commandOpts,
    });

    return Promise.all(docs.map((doc) => documentSet.add("me", doc, [])));
  }

  it("counts all documents", async function () {
    usesDatabase(this);

    await populate(true, ["111", "222", "333", "444", "555"]);
    await bot.say("me", "@hubot blarfcount");
    await bot.waitForResponse("@me there are 5 blarfs.");
  });

  it("uses a singular noun for single results", async function () {
    await populate(true, ["111"]);
    await bot.say("me", "@hubot blarfcount");
    await bot.waitForResponse("@me there is 1 blarf.");
  });

  it("counts documents matching all query terms", async function () {
    usesDatabase(this);

    await populate(true, [
      "aaa zzz 1",
      "aaa zzz 2",
      "aaa bbb 0",
      "bbb zzz 0",
      "xxx yyy 0",
    ]);
    await bot.say("me", "@hubot blarfcount zzz aaa");
    await bot.waitForResponse("@me there are 2 blarfs matching `zzz aaa`.");
  });

  it("counts documents matching quoted query terms", async function () {
    usesDatabase(this);

    await populate(true, [
      "aaa zzz 1",
      "aaa zzz 2",
      "aaa bbb 0",
      "bbb zzz 0",
      "xxx yyy 0",
      "zzz aaa 0",
    ]);
    await bot.say("me", '@hubot blarfcount "aaa zzz"');
    await bot.waitForResponse('@me there are 2 blarfs matching `"aaa zzz"`.');
  });

  it("uses a singular noun for single results matching a query", async function () {
    await populate(true, ["111", "222"]);
    await bot.say("me", "@hubot blarfcount 11");
    await bot.waitForResponse("@me there is 1 blarf matching `11`.");
  });

  it("permits access based on the caller's role", async function () {
    usesDatabase(this);

    await populate({role: OnlyMe}, [
      "aaa zzz 1",
      "aaa zzz 2",
      "aaa zzz 3",
      "bbb zzz 0",
      "xxx yyy 0",
    ]);
    await bot.say("me", "@hubot blarfcount aaa zzz");
    await bot.waitForResponse("@me there are 3 blarfs matching `aaa zzz`.");
  });

  it("prohibits access based on the caller's role", async function () {
    usesDatabase(this);

    await populate({role: OnlyMe}, ["aaa zzz 1", "aaa zzz 2"]);
    await bot.say("you", "@hubot blarfcount aaa zzz");
    await bot.waitForResponse("@you NOPE");
  });

  it("generates default help text", async function () {
    await bot.loadHelp();
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {count: true});

    await bot.say("me", "@hubot help blarfcount");
    await bot.waitForResponse(/blarfcount/);

    const messages = bot.helpLines();
    expect(messages).to.include("hubot blarfcount - Total number of blarfs.");
    expect(messages).to.include(
      "hubot blarfcount <query> - Number of blarfs matching <query>."
    );
  });

  it("accepts custom help text", async function () {
    await bot.loadHelp();
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {
      count: {
        helpText: [
          "hubot blarfcount 1 - line one",
          "hubot blarfcount 2 - line two",
        ],
      },
    });
    await bot.say("me", "@hubot help blarfcount");
    await bot.waitForResponse(/blarfcount/);

    const messages = bot.helpLines();
    expect(messages).to.include("hubot blarfcount 1 - line one");
    expect(messages).to.include("hubot blarfcount 2 - line two");
  });
});
