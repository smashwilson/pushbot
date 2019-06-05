const {createDocumentSet} = require("../../scripts/documentset");
const {OnlyMe} = require("./roles");

function generateAttributeQueryTests(commandName, attributeName) {
  return function() {
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

    function populate(commandOpts = true, docs = []) {
      documentSet = createDocumentSet(bot.getRobot(), "blarf", {
        [commandName]: commandOpts,
      });

      return Promise.all(
        docs.map(doc => {
          const attributes = doc.attrs.map(value => ({
            kind: attributeName,
            value,
          }));
          return documentSet.add("me", doc.body, attributes);
        })
      );
    }

    it(`returns a random document ${commandName} the requested speaker`, async function() {
      usesDatabase(this);
      await populate(true, [
        {body: "yes 1", attrs: ["aaa", "bbb"]},
        {body: "no 1", attrs: ["bbb"]},
        {body: "yes 2", attrs: ["zzz", "aaa"]},
        {body: "no 2", attrs: ["yyy", "ccc", "bbb"]},
        {body: "no 3", attrs: ["qqq"]},
      ]);

      await bot.say("me", `@hubot blarf${commandName} aaa`);
      await bot.waitForResponse(/^(yes 1|yes 2)$/);
    });

    it(`returns a random document with the requested ${attributeName} matching a query`, async function() {
      usesDatabase(this);
      await populate(true, [
        {body: "no 1", attrs: ["aaa", "bbb"]},
        {body: "no 2", attrs: ["bbb"]},
        {body: "yes 1", attrs: ["zzz", "aaa"]},
        {body: "no 3", attrs: ["yyy", "ccc", "bbb"]},
        {body: "no 4", attrs: ["aaa"]},
      ]);

      await bot.say("me", `@hubot blarf${commandName} @aaa yes`);
      await bot.waitForResponse("yes 1");
    });

    it(`returns a random document with multiple ${attributeName}s`, async function() {
      usesDatabase(this);
      await populate(true, [
        {body: "no 1", attrs: ["aaa", "bbb"]},
        {body: "no 2", attrs: ["bbb"]},
        {body: "no 3", attrs: ["zzz", "aaa"]},
        {body: "yes 1", attrs: ["yyy", "ccc", "bbb"]},
        {body: "no 4", attrs: ["aaa"]},
      ]);

      await bot.say("me", `@hubot blarf${commandName} @ccc+yyy`);
      await bot.waitForResponse("yes 1");
    });

    it(`returns a random document with multiple ${attributeName}s matching a query`, async function() {
      usesDatabase(this);
      await populate(true, [
        {body: "no 1", attrs: ["aaa", "bbb"]},
        {body: "no 2", attrs: ["bbb"]},
        {body: "no 3", attrs: ["zzz", "aaa"]},
        {body: "no 4", attrs: ["yyy", "ccc", "bbb"]},
        {body: "yes 1", attrs: ["aaa", "bbb"]},
      ]);

      await bot.say("me", `@hubot blarf${commandName} @aaa+bbb yes`);
      await bot.waitForResponse("yes 1");
    });

    it("permits access based on the caller's role", async function() {
      usesDatabase(this);
      await populate({role: OnlyMe}, [{body: "yes 1", attrs: ["aaa", "bbb"]}]);

      await bot.say("me", `@hubot blarf${commandName} bbb`);
      await bot.waitForResponse("yes 1");
    });

    it("prohibits access based on the caller's role", async function() {
      usesDatabase(this);
      await populate({role: OnlyMe}, [{body: "yes 1", attrs: ["aaa", "bbb"]}]);

      await bot.say("you", `@hubot blarf${commandName} bbb`);
      await bot.waitForResponse("@you NOPE");
    });

    it("generates default help text", async function() {
      await bot.loadHelp();
      documentSet = createDocumentSet(bot.getRobot(), "blarf", {
        [commandName]: true,
      });

      await bot.say("me", `@hubot help blarf${commandName}`);
      await bot.waitForResponse(/blarf/);

      const messages = bot
        .helpLines()
        .filter(line => line.startsWith(`hubot blarf${commandName}`));
      expect(messages).to.have.length(3);
    });

    it("accepts custom help text", async function() {
      await bot.loadHelp();
      documentSet = createDocumentSet(bot.getRobot(), "blarf", {
        [commandName]: {
          helpText: [
            `hubot blarf${commandName} 1 - line one`,
            `hubot blarf${commandName} 2 - line two`,
          ],
        },
      });

      await bot.say("me", `@hubot help blarf${commandName}`);
      await bot.waitForResponse(/blarf/);

      const messages = bot.helpLines();
      expect(messages).to.include(`hubot blarf${commandName} 1 - line one`);
      expect(messages).to.include(`hubot blarf${commandName} 2 - line two`);
    });
  };
}

describe("DocumentSet by", generateAttributeQueryTests("by", "speaker"));

describe("DocumentSet about", generateAttributeQueryTests("about", "mention"));
