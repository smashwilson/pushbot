// Description:
//   Entrypoint for the web API.

const fs = require("fs");
const path = require("path");
const express = require("express");
const cookieSession = require("cookie-session");
const {graphqlHTTP} = require("express-graphql");
const {buildSchema} = require("graphql");
const passport = require("passport");
const cors = require("cors");
const SlackStrategy = require("passport-slack-oauth2").Strategy;
const BasicStrategy = require("passport-http").BasicStrategy;

const root = require("./api/root");
const {CalendarMap} = require("./models/calendar");

const PORT = 8080;

const SESSION_SECRET = process.env.SESSION_SECRET || "shhh";
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_TEAM_ID = process.env.SLACK_TEAM_ID;
const DEV_USERNAME = process.env.DEV_USERNAME;
const COOKIE_AGE = 30 * 24 * 60 * 60 * 1000;

const CORS_OPTIONS = {
  origin: process.env.WEB_BASE_URL,
  credentials: true,
};

class Status {
  constructor() {
    this.database = "pending";

    this.killed = false;

    this.databasePromise = new Promise((resolve, reject) => {
      this.databaseCallbacks = {resolve, reject};
    });
  }

  databaseReady() {
    this.database = "ok";
    this.databaseCallbacks.resolve();
  }

  databaseFailed() {
    this.database = "error";
    this.databaseCallbacks.reject();
  }

  onlinePromise() {
    return Promise.all([this.databasePromise]);
  }

  kill() {
    this.killed = true;
  }

  summarize() {
    let overall = "pending";

    if (this.killed) {
      overall = "killed";
    } else if (this.database === "ok") {
      overall = "ok";
    }

    return {
      database: this.database,
      status: overall,
    };
  }
}

module.exports = function (robot) {
  const useSlackAuth = Boolean(SLACK_CLIENT_ID) && Boolean(SLACK_CLIENT_SECRET);
  const useHttpAuth = !useSlackAuth && Boolean(DEV_USERNAME);

  // Passport

  if (useSlackAuth) {
    passport.use(
      new SlackStrategy(
        {
          clientID: SLACK_CLIENT_ID,
          clientSecret: SLACK_CLIENT_SECRET,
          callbackURL: `${process.env.API_BASE_URL}/auth/slack/callback`,
        },
        (accessToken, refreshToken, profile, done) => {
          robot.logger.debug(
            `Log-in attempt with profile: ${JSON.stringify(profile)}.`
          );

          if (profile.team.id !== SLACK_TEAM_ID) {
            robot.logger.debug(`Incorrect team: ${profile.team.id}.`);
            return done(null, false, {
              message: `Please log in with the correct team.`,
            });
          }

          const uid = profile.id;
          const existing = robot.brain.users()[uid];
          if (!existing) {
            robot.logger.debug(`No user with id ${uid}.`);
            return done(null, false, {
              message: "Senpai @pushbot hasn't noticed you yet.",
            });
          }

          robot.logger.info(
            `User authenticated: ${existing.id} ${existing.name}`
          );
          done(null, existing);
        }
      )
    );
  } else if (useHttpAuth) {
    robot.logger.warning("Hosting API in developer mode.");
    robot.logger.warning(
      `Authenticate with the username "${DEV_USERNAME}" and any non-empty password.`
    );

    passport.use(
      new BasicStrategy((username, password, done) => {
        if (username !== DEV_USERNAME) {
          return done(null, false, {message: "Incorrect username."});
        }

        const existing = robot.brain.userForName(username);
        if (existing) {
          return done(null, existing);
        }

        const uid = require("crypto").randomBytes(32).toString("hex");
        const created = robot.brain.userForId(uid, {
          name: username,
          room: username,
        });
        done(null, created);
      })
    );
  } else {
    robot.logger.warning("API disabled.");
    robot.logger.warning(
      " * For local development, set DEV_USERNAME to the account username to"
    );
    robot.logger.warning(
      "   authenticate all requests. Use any non-empty password."
    );
    robot.logger.warning(
      " * In production, set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to the"
    );
    robot.logger.warning("   OAuth configuration values.");
    return;
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => done(null, robot.brain.users()[id]));

  // Express app

  const app = express();

  app.use(
    cookieSession({
      secret: SESSION_SECRET,
      cookie: {
        maxAge: COOKIE_AGE,
      },
    })
  );

  app.use((req, res, next) => {
    req.sessionOptions.expires = new Date(Date.now() + COOKIE_AGE);
    return next();
  });

  app.use(passport.initialize());
  app.use(passport.session());

  app.use((req, res, next) => {
    req.robot = robot;
    return next();
  });

  if (useSlackAuth) {
    app.get(
      "/auth/slack",
      (req, res, next) => {
        if (req.query.backTo) {
          req.session.backTo = req.query.backTo;
        }
        return next();
      },
      passport.authenticate("Slack")
    );

    app.get(
      "/auth/slack/callback",
      passport.authenticate("Slack"),
      (req, res) => {
        req.session.save();
        const backTo = req.session.backTo;
        if (backTo) {
          delete req.session.backTo;
          res.redirect(`${process.env.WEB_BASE_URL}${backTo}`);
        } else {
          res.send("Authenticated successfully");
        }
      }
    );
  } else if (useHttpAuth) {
    app.get("/auth/http", passport.authenticate("basic"), (req, res, next) => {
      req.session.save();
      if (req.query.backTo) {
        res.redirect(`${process.env.WEB_BASE_URL}${req.query.backTo}`);
      } else {
        res.send("Authenticated successfully");
      }
    });
  }

  app.get("/logout", (req, res) => {
    req.logout();
    if (req.query.backTo) {
      res.redirect(`${process.env.WEB_BASE_URL}`);
    } else {
      res.send("Logged out successfully");
    }
  });

  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      robot.logger.debug("Request authenticated");
      return next();
    }

    const authUrl = useSlackAuth ? "/auth/slack" : "/auth/http";

    robot.logger.debug("Request not authenticated");
    res
      .status(401)
      .send(
        `Please visit ${process.env.API_BASE_URL}${authUrl} to authenticate.`
      );
  }

  // GraphQL

  const schemaPath = path.join(__dirname, "api", "schema.graphql");
  const schema = buildSchema(fs.readFileSync(schemaPath, {encoding: "utf8"}));

  app.options("/graphql", cors(CORS_OPTIONS));
  app.use(
    "/graphql",
    cors(CORS_OPTIONS),
    ensureAuthenticated,
    graphqlHTTP({
      schema,
      rootValue: root,
      graphiql: true,
      formatError: (err) => {
        robot.logger.error(`GraphQL exception:\n${err.stack}`);
        return {
          message: err.message,
          locations: err.locations,
          path: err.path,
        };
      },
    })
  );

  const status = new Status();

  status.onlinePromise().then(
    () => {
      accepting = true;
      robot.logger.debug("All system operational.");
    },
    (err) => {
      robot.logger.error(`Oh no unable to launch properly:\n${err}`);
      process.exit(1);
    }
  );

  const databaseCheck = () => {
    robot.postgres.any("SELECT 1;").then(
      () => {
        status.databaseReady();
        robot.logger.debug("Connected to database.");
      },
      (err) => {
        status.databaseFailed();
        robot.logger.error(`Unable to connect to database:\n${err}`);
      }
    );
  };

  if (robot.postgres) {
    databaseCheck();
  } else {
    robot.on("database-up", databaseCheck);
  }

  // iCal feeds

  app.get("/ical/:id", (req, res) => {
    if (!CalendarMap.inRobot(robot).isValid(req.params.id)) {
      res.sendStatus(404);
      return;
    }

    const store = robot["hubot-events"].getStore();
    const events = store.search({});
    const feed = events.renderICal({
      calendarName: "#~s events",
      userTz: "America/New_York",
    });

    res.type("text/calendar");
    res.send(feed);
  });

  // Health monitoring

  app.get("/healthz", (req, res) => {
    res.json(status.summarize());
  });

  app.listen(PORT, () => {
    robot.logger.debug(`Web API is listening on port ${PORT}.`);
  });
};
