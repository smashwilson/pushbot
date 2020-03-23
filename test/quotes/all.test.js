const {createDocumentSet} = require("../../scripts/documentset");

describe("DocumentSet all", function () {
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

  async function populate(commandOpts = true, docs = [], parallel = true) {
    documentSet = createDocumentSet(bot.getRobot(), "blarf", {
      all: commandOpts,
    });

    const args = docs.map((doc) => {
      let body = "";
      const attributes = [];
      if (doc.body && doc.subject) {
        body = doc.body;
        attributes.push({kind: "subject", value: doc.subject});
      } else {
        body = doc;
      }
      return ["me", body, attributes];
    });

    if (parallel) {
      await Promise.all(args.map((arg) => documentSet.add(...arg)));
    } else {
      for (const arg of args) {
        await documentSet.add(...arg);
      }
    }
  }

  it("returns all known documents", async function () {
    await populate(true, ["one", "two", "three"], false);

    await bot.say("me", "@hubot allblarfs");
    await bot.waitForResponse("one, two, three");
  });

  it("returns all documents associated with a user", async function () {
    await populate(
      {userOriented: true},
      [
        {body: "111", subject: "you"},
        {body: "222", subject: "you"},
        {body: "000", subject: "nope"},
        {body: "333", subject: "you"},
      ],
      false
    );

    await bot.say("me", "@hubot allblarfs @you");
    await bot.waitForResponse("111, 222, 333");
  });
});
