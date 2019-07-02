describe("rem", function() {
  let bot;

  beforeEach(async function() {
    bot = new BotContext("../scripts/rem.js");
  });

  afterEach(function() {
    bot.destroy();
  });

  it("stores and recalls a mapping with !rem", async function() {
    await bot.say("admin", "@hubot rem some key = a value");
    await bot.waitForResponse(`@admin :ok_hand: I've learned "some key".`);
    await bot.say("admin", "@hubot rem some key");
    await bot.waitForResponse("a value");
  });

  it("reports keys it doesn't know", async function() {
    await bot.say("admin", "@hubot rem nope");
    await bot.waitForResponse("nope? Never heard of it.");
  });

  it("forgets a mapping with !forget", async function() {
    await bot.say("admin", "@hubot rem some key = a value");
    await bot.say("admin", "@hubot rem some key");
    await bot.waitForResponse("a value");
    await bot.say("admin", "@hubot forget some key");
    await bot.waitForResponse(
      '@admin :dusty_stick: "some key" has been forgotten.'
    );
  });

  describe("!remsearch", function() {
    it("lists matching keys in a random order", async function() {
      bot.store("rem:0 aa 0", "A");
      bot.store("rem:1 aa 1", "B");
      bot.store("rem:2 bb 2", "C");

      await bot.say("admin", "@hubot remsearch aa");
      await bot.waitForResponse();

      const lines = bot
        .response()
        .split(/\s*\n\s*/)
        .filter(line => line.length > 0);
      expect(lines).to.have.members(["> 0 aa 0", "> 1 aa 1"]);
    });

    it("lists all keys", async function() {
      bot.store("rem:0 aa 0", "A");
      bot.store("rem:1 aa 1", "B");
      bot.store("rem:2 bb 2", "C");

      await bot.say("admin", "@hubot remsearch");
      await bot.waitForResponse();

      const lines = bot
        .response()
        .split(/\s*\n\s*/)
        .filter(line => line.length > 0);
      expect(lines).to.have.members(["> 0 aa 0", "> 1 aa 1", "> 2 bb 2"]);
    });

    it("shows at most ten results", async function() {
      for (let i = 0; i < 20; i++) {
        bot.store(`rem:key ${i}`, "V");
      }

      await bot.say("admin", "@hubot remsearch");
      await bot.waitForResponse();

      const lines = bot
        .response()
        .split(/\s*\n\s*/)
        .filter(line => line.length > 0);
      expect(lines).to.have.lengthOf(10);
    });

    it("automatically fetches if there is exactly one result", async function() {
      bot.store("rem:0 aa 0", "A");
      bot.store("rem:1 bb 1", "B");

      await bot.say("admin", "@hubot remsearch aa");
      await bot.waitForResponse("showing _0 aa 0_\nA");
    });
  });
});
