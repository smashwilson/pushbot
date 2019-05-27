const {OnlyMe, Nobody} = require("./roles");

const {createDocumentSet} = require("../../scripts/documentset");

describe("DocumentSet set", function() {
  let bot, time, documentSet;

  beforeEach(function() {
    bot = new BotContext();
    time = new TimeContext();
  });

  afterEach(function() {
    bot.destroy();
    time.destroy();
    if (documentSet) {
      return documentSet.destroy();
    }
  });

  it('adds a new document with "setblarf:"', async function() {
    usesDatabase(this);
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {set: true});

    await documentSet.whenConnected();
    await bot.say("me", "@hubot setblarf: something embarassing");
    await bot.waitForResponse(
      "me's blarf has been set to 'something embarassing'."
    );

    const doc = await documentSet.latestMatching({subject: ["me"]}, "");
    expect(doc.getBody()).to.equal("something embarassing");
  });

  it('adds a new document for a different user with "setblarf @<username>:"', async function() {
    usesDatabase(this);
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {set: true});

    await documentSet.whenConnected();
    await bot.say("me", "@hubot setblarf @other: something embarassing");
    await bot.waitForResponse(
      "other's blarf has been set to 'something embarassing'."
    );

    const doc = await documentSet.latestMatching({subject: ["other"]}, "");
    expect(doc.getBody()).to.equal("something embarassing");
  });

  it('replaces an existing document with "setblarf:"', async function() {
    usesDatabase(this);
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {set: true});

    await documentSet.add("admin", "blah", [{kind: "subject", value: "me"}]);
    await bot.say("me", "@hubot setblarf: something better");
    await bot.waitForResponse(
      "me's blarf has been changed from 'blah' to 'something better'."
    );

    const [count, doc] = await Promise.all([
      documentSet.countMatching({subject: ["me"]}, ""),
      documentSet.latestMatching({subject: ["me"]}, ""),
    ]);

    expect(count).to.equal(2);
    expect(doc.getBody()).to.equal("something better");
  });

  it('replaces an existing document for a different user with "setblarf @<username>:"', async function() {
    usesDatabase(this);
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {set: true});

    await documentSet.add("admin", "blah", [{kind: "subject", value: "other"}]);

    await bot.say("me", "@hubot setblarf other: something better");
    await bot.waitForResponse(
      "other's blarf has been changed from 'blah' to 'something better'."
    );

    const [count, doc] = await Promise.all([
      documentSet.countMatching({subject: ["other"]}, ""),
      documentSet.latestMatching({subject: ["other"]}, ""),
    ]);
    expect(count).to.equal(2);
    expect(doc.getBody()).to.equal("something better");
  });

  it("validates a required role for setting your own", async function() {
    usesDatabase(this);
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {
      set: {roleForSelf: OnlyMe},
    });

    await documentSet.whenConnected();

    await bot.say("you", "@hubot setblarf: nice try");
    await bot.waitForResponse("@you NOPE");

    await bot.say("you", "@hubot setblarf @me: this works");
    await bot.waitForResponse("me's blarf has been set to 'this works'.");

    const [meCount, youCount] = await Promise.all([
      documentSet.countMatching({subject: ["me"]}, ""),
      documentSet.countMatching({subject: ["you"]}, ""),
    ]);

    expect(meCount).to.equal(1);
    expect(youCount).to.equal(0);
  });

  it("validates a required role for setting another", async function() {
    usesDatabase(this);
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {
      set: {roleForOther: OnlyMe},
    });

    await documentSet.whenConnected();

    await bot.say("you", "@hubot setblarf me: nice try");
    await bot.waitForResponse("@you NOPE");

    await bot.say("you", "@hubot setblarf: this works");
    await bot.waitForResponse("you's blarf has been set to 'this works'.");

    const [meCount, youCount] = await Promise.all([
      documentSet.countMatching({subject: ["me"]}, ""),
      documentSet.countMatching({subject: ["you"]}, ""),
    ]);

    expect(meCount).to.equal(0);
    expect(youCount).to.equal(1);
  });

  it("validates the correct role for explicitly setting your own", async function() {
    usesDatabase(this);
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {
      set: {roleForSelf: OnlyMe, roleForOther: Nobody},
    });

    await documentSet.whenConnected();
    await bot.say("me", "@hubot setblarf me: this works");
    await bot.waitForResponse("me's blarf has been set to 'this works'.");

    const count = await documentSet.countMatching({subject: ["me"]}, "");
    expect(count).to.equal(1);
  });

  it("generates default help text", async function() {
    usesDatabase(this);
    await bot.loadHelp();
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {set: true});

    await bot.say("me", "@hubot help");
    await bot.waitForResponse(/hubot setblarf/);
    const messages = bot.helpLines();

    expect(messages).to.include(
      "hubot setblarf <user>: <source> - Set user's blarf to <source>."
    );
    expect(messages).to.include(
      "hubot setblarf: <source> - Set your own blarf to <source>."
    );
  });

  it("accepts custom help text", async function() {
    usesDatabase(this);
    await bot.loadHelp();
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {
      set: {
        helpText: [
          "hubot setblarf 1 - First line",
          "hubot setblarf 2 - Second line",
        ],
      },
    });

    await bot.say("me", "@hubot help setblarf");
    await bot.waitForResponse(/setblarf 1/);
    const messages = bot.helpLines();

    expect(messages).to.include("hubot setblarf 1 - First line");
    expect(messages).to.include("hubot setblarf 2 - Second line");
  });
});
