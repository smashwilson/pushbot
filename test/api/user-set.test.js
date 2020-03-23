const {UserSetResolver} = require("../../scripts/api/user-set");

describe("UserSetResolver", function () {
  let bot, admin, nonAdmin, adminReq, nonAdminReq, resolver;

  beforeEach(async function () {
    bot = new BotContext();
    await bot.loadAuth("1");

    admin = bot.createUser("1", "self", {roles: ["role one", "role two"]});
    nonAdmin = bot.createUser("2", "two");
    bot.createUser("3", "three");

    adminReq = {robot: bot.getRobot(), user: admin};
    nonAdminReq = {robot: bot.getRobot(), user: nonAdmin};
    resolver = new UserSetResolver();
  });

  afterEach(function () {
    bot.destroy();
  });

  describe("me", function () {
    it("returns a resolver for a user from the request", function () {
      const result = resolver.me({}, nonAdminReq);
      expect(result.user).to.eql(nonAdmin);
    });

    it("includes the coordinator auth token if the user is an admin", function () {
      process.env.AZ_COORDINATOR_TOKEN = "shhh";
      const userResolver = resolver.me({}, adminReq);
      expect(userResolver.coordinatorToken({}, adminReq)).to.eql("shhh");
    });

    it("omits the coordinator auth token for non-admins", function () {
      process.env.AZ_COORDINATOR_TOKEN = "shhh";
      const userResolver = resolver.me({}, nonAdminReq);
      expect(userResolver.coordinatorToken({}, nonAdminReq)).to.be.null;
    });
  });

  describe("all", function () {
    it("returns resolvers for all users", function () {
      const results = resolver.all({}, nonAdminReq);
      expect(results.map((each) => each.user.name)).to.have.members([
        "self",
        "two",
        "three",
      ]);
    });
  });

  describe("withName", function () {
    it("returns a resolver for a user by name", function () {
      const result = resolver.withName({name: "two"}, nonAdminReq);
      expect(result.user.id).to.eql("2");
    });

    it("return null if no such user exists", function () {
      const result = resolver.withName({name: "snorgle"}, nonAdminReq);
      expect(result).to.eql(null);
    });
  });

  describe("UserResolver", function () {
    it("reports static properties directly from the User model", function () {
      admin.real_name = "Real Name";
      admin.slack = {tz: "America/New_York", presence: "active"};

      const userResolver = resolver.me({}, adminReq);

      expect(userResolver.id).to.eql("1");
      expect(userResolver.name).to.eql("self");
      expect(userResolver.realName).to.eql("Real Name");
      expect(userResolver.timezone).to.eql("America/New_York");
      expect(userResolver.presence).to.eql("ACTIVE");
    });

    it("defaults missing attributes", function () {
      const userResolver = resolver.me({}, adminReq);

      expect(userResolver.id).to.eql("1");
      expect(userResolver.name).to.eql("self");
      expect(userResolver.realName).to.eql(undefined);
      expect(userResolver.timezone).to.eql(undefined);
      expect(userResolver.presence).to.eql("UNKNOWN");
    });

    it("returns a resolver for the user's status", function () {
      admin.slack = {
        profile: {
          status_text: "here",
          status_emoji: ":coffee:",
        },
      };

      const userResolver = resolver.me({}, adminReq);
      const statusResolver = userResolver.status();

      expect(statusResolver.message).to.eql("here");
      expect(statusResolver.emoji).to.eql(":coffee:");
    });

    it("returns an empty resolver if no status exists", function () {
      const userResolver = resolver.me({}, adminReq);
      const statusResolver = userResolver.status();

      expect(statusResolver.message).to.eql(undefined);
      expect(statusResolver.emoji).to.eql(undefined);
    });

    it("returns a resolver for the user's avatar", function () {
      admin.slack = {
        profile: {
          image_24: "https://localhost/avatar24.jpg",
          image_32: "https://localhost/avatar32.jpg",
          image_48: "https://localhost/avatar48.jpg",
          image_72: "https://localhost/avatar72.jpg",
          image_192: "https://localhost/avatar192.jpg",
          image_512: "https://localhost/avatar512.jpg",
          image_1024: "https://localhost/avatar1024.jpg",
        },
      };

      const userResolver = resolver.me({}, adminReq);
      const avatarResolver = userResolver.avatar();

      expect(avatarResolver.image24).to.eql("https://localhost/avatar24.jpg");
      expect(avatarResolver.image32).to.eql("https://localhost/avatar32.jpg");
      expect(avatarResolver.image48).to.eql("https://localhost/avatar48.jpg");
      expect(avatarResolver.image72).to.eql("https://localhost/avatar72.jpg");
      expect(avatarResolver.image192).to.eql("https://localhost/avatar192.jpg");
      expect(avatarResolver.image512).to.eql("https://localhost/avatar512.jpg");
      expect(avatarResolver.image1024).to.eql(
        "https://localhost/avatar1024.jpg"
      );
    });

    it("returns an empty resolver if no avatar exists", function () {
      const userResolver = resolver.me({}, adminReq);
      const avatarResolver = userResolver.avatar();

      expect(avatarResolver.image24).to.eql(undefined);
      expect(avatarResolver.image32).to.eql(undefined);
      expect(avatarResolver.image48).to.eql(undefined);
      expect(avatarResolver.image72).to.eql(undefined);
      expect(avatarResolver.image192).to.eql(undefined);
      expect(avatarResolver.image512).to.eql(undefined);
      expect(avatarResolver.image1024).to.eql(undefined);
    });

    it("accesses currently assigned roles", function () {
      const userResolver = resolver.me({}, adminReq);
      const roles = userResolver.roles({}, adminReq);
      expect(roles).to.eql([
        {name: "admin"},
        {name: "role one"},
        {name: "role two"},
      ]);
    });

    it("accesses counts of reactions given", async function () {
      bot.store("reactionsGiven", {
        "1": {
          yellow_heart: 10,
          sparkles: 7,
          partyparrot: 5,
        },
      });

      const given = await resolver
        .me({}, adminReq)
        .topReactionsGiven({limit: 2}, adminReq);
      expect(given).to.deep.equal([
        {count: 10, emoji: {name: "yellow_heart", url: null}},
        {count: 7, emoji: {name: "sparkles", url: null}},
      ]);
    });

    it("accesses counts of reactions received", async function () {
      bot.store("reactionsReceived", {
        "1": {
          boom: 50,
          heart: 18,
          partyparrot: 5,
        },
      });

      const received = await resolver
        .me({}, adminReq)
        .topReactionsReceived({limit: 2}, adminReq);
      expect(received).to.deep.equal([
        {count: 50, emoji: {name: "boom", url: null}},
        {count: 18, emoji: {name: "heart", url: null}},
      ]);
    });
  });
});
