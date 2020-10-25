// Description:
//   Simple "pick one of these random responses"-style commands.
//
// Commands:
//   hubot hug <user> - express mechanical affection toward a target
//   hubot hi5 <user> - enthusiastically express congratulations
//   hubot magic8 <question> - gaze into your future
//   hubot judge <something> - render a verdict upon... something
//   hubot barf - BAAAAAARRRRRRRFFFFF
//   hubot betray <someone> - Curse your sudden but inevitable betrayal!
//   hubot burritohose <someone> - Doof. Doof. Doof. Splat. Splat. Splat.
//   hubot welcome <someone> - Welcome a newcomer to the channel.
//   hubot poker - A very involved game of skill and chance.
//   hubot sin - return a sin, courtesy of Jack Chick
//   hubot pokemonsay <string> - Translate string into Pokemon Unown Slack emojis.
//   hubot femshep - Express your rage in a healthy fashion
//   hubot nope - Just nope the f out of there
//   hubot fine - Show just how fine it is
//   hubot embiggen - Tickets... to the gun show
//   hubot clap - Give :clap: your :clap: words :clap: some :clap: emphasis
//   hubot honk - Honk. Honk honk. Hoooonk
//   hubot no - When @reostra is about to make another pun
//   hubot ohno - When @reostra is about to make another pun and you can't stop it in time

// Configuration:
//
//   HUBOT_BETRAY_IMMUNE - comma-separated list of users who are immune to betrayal.

const _ = require("underscore");
const {atRandom} = require("./helpers");

const betrayImmune = _.map(
  (process.env.HUBOT_BETRAY_IMMUNE || "").split(/,/),
  (line) => line.trim()
);

const targetFrom = function (msg, matchNo) {
  if (matchNo == null) {
    matchNo = 1;
  }
  if (msg.match[matchNo]) {
    return msg.match[matchNo];
  } else {
    return msg.message.user.name;
  }
};

module.exports = function (robot) {
  const allUsers = function () {
    const userMap = robot.brain.users();
    const ids = Object.keys(userMap);
    return Array.from(ids, (id) => userMap[id]);
  };

  robot.respond(/hug(?: (.*))?/i, function (msg) {
    const target = targetFrom(msg);
    msg.emote(`compresses ${target} in a cold, metallic embrace`);
  });

  robot.respond(/hi5(?: (.*))?/i, function (msg) {
    const target = targetFrom(msg);
    return msg.emote(
      atRandom([
        `high-fives ${target} with cold, unfeeling metal`,
        `high-fives ${target} with enthusiasm!`,
        `high-fives ${target} with glee!`,
        `rocket-jumps off of an exploding helicopter to high-five ${target} in midair!`,
        `high-fives ${target}... with dire consequences`,
        "http://www.survivingcollege.com/wp-content/uploads/2014/04/stephen-colbert-high-five-gif.gif",
        "http://giphy.com/gifs/just-hooray-PCBJRuJbMYzLi#.gif",
        "http://media.giphy.com/media/dLuI7v4QXx5SM/giphy.gif",
        "http://giphy.com/gifs/cheezburger-high-five-tutle-2FazevvcDdyrf1E7C#.gif",
        "http://media3.giphy.com/media/HzSK6zrsNl3UY/giphy.gif",
        "http://media.giphy.com/media/ujGfBmVppmgEg/giphy.gif",
        "http://media2.giphy.com/media/fm4WhPMzu9hRK/giphy.gif",
        "http://media.giphy.com/media/VuwYcvElLOnuw/giphy.gif",
        "http://i.imgur.com/KZEsyv0.gif",
        "https://i.imgur.com/vUDUN5k.gif",
        "https://static1.e621.net/data/54/92/54927df9c2746b6bd28e0db41229f88d.gif",
        "http://sixprizes.com/wp-content/uploads/2014/01/vulpix-misty-flamethrower-fire-1.jpg",
        "http://mlb.mlb.com/images/0/7/2/177185072/050916_jose_helmet_med_a3yfultb.gif",
        "https://media.giphy.com/media/OIoQ9FzLel1qo/giphy.gif",
        "https://media.giphy.com/media/l4FGzzKKoxuv7AaL6/giphy.gif",
        "https://i.imgur.com/MAiIwW8.gifv",
        "https://i.imgur.com/mGXdpdp.gif",
        "https://user-images.githubusercontent.com/17565/97096802-4b7a7780-163f-11eb-9a37-8c147f97162e.gif",
      ])
    );
  });

  robot.respond(/magic8/i, function (msg) {
    const positive = [
      "Definitely.",
      "Absolutely.",
      "Yep.",
      "SO IT HAS BEEN FORETOLD",
      "Yes, sure. Why not.",
      "The stars say... YES.",
      "Just this once.",
      "Confirm.",
      "100%",
      "It is established fact.",
      "We're doing this, we're making this happen!",
    ];

    const negative = [
      "Nooooope.",
      "Not a chance.",
      "Never!",
      "http://media.giphy.com/media/d0QLPgh4VGiA0/giphy.gif",
      "http://media.giphy.com/media/DGiZfWmc0HWms/giphy.gif",
      "The stars say... NO.",
      "Curl up and die.",
      "I slept with your mother!",
      "When pigs fly!",
      "0%",
      "I will explode in your face.",
      "The frustration with this stool is enormous. Terrible, just terrible.",
    ];

    const neutral = [
      "Maybe",
      "Perhaps",
      "It could happen",
      "Can't really say",
      "My own 8-ball is broken",
      "50%",
      "That's what SHE asked!",
      "As sure as my name is.... wait, who am I?",
      "The stars say... MAYBE.",
      "http://i.imgur.com/rl2o77j.jpg",
      "INSUFFICIENT DATA FOR MEANINGFUL ANSWER",
    ];

    const all = [...positive, ...negative, ...neutral];
    msg.reply(atRandom(all));
  });

  robot.respond(/judge/i, function (msg) {
    const chance = _.random(100);
    msg.reply(chance < 80 ? "HARSH" : "Lenient.");
  });

  robot.respond(/win/i, (msg) => msg.reply("You win!"));

  robot.respond(/barf\s*([^]*)/i, function (msg) {
    const text = (!msg.match[1] ? "barf" : msg.match[1]).toUpperCase();

    const barfify = function (letter) {
      if ("AEFHIJKLMNORSUVWYZ".includes(letter)) {
        let expanded = "";
        for (let i = 0; i < 5; i++) {
          expanded += letter;
        }
        return expanded;
      } else {
        return letter;
      }
    };

    let line = "";
    for (let i = 0; i < text.length; i++) {
      line += barfify(text[i]);
    }

    const lines = [];
    for (let i = 0; i < 5; i++) {
      lines.push(line);
    }
    msg.send(lines.join("\n"));
  });

  robot.respond(/sde\s*([^]*)/i, async function (msg) {
    const text = msg.match[1] || "shut down everything";
    const lines = text.split(/\s+/);
    if (lines.length > 10) {
      msg.send("Ain't nobody got time for that!");
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      msg.send(i === lines.length - 1 ? `${line.toUpperCase()}!` : `${line}.`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });

  robot.respond(/(?:harm|betray)(?: (\S+))?/i, function (msg) {
    const backfire =
      betrayImmune.includes(msg.message.user.id) || _.random(100) < 10;

    let target;
    if (backfire) {
      target = msg.message.user.name;
    } else if (msg.match[1]) {
      target = targetFrom(msg);
      const tname = target.replace(/^@/, "");
      const tu = robot.brain.userForName(tname);
      if (tu && betrayImmune.includes(tu.id)) {
        target = msg.message.user.name;
      }
    } else {
      const potential = allUsers()
        .filter((u) => !betrayImmune.includes(u.id))
        .map((u) => u.name);
      if (potential.length > 0) {
        target = atRandom(potential);
      } else {
        msg.reply("There's nobody left to betray!");
        return;
      }
    }

    msg.emote(
      atRandom([
        `stabs @${target} in the back!`,
        `stabs @${target} in the front!`,
        `stabs @${target} in the spleen!`,
        `stabs @${target} in the face!`,
        `knocks out @${target} and hides the body in an air vent`,
        "http://31.media.tumblr.com/14b87d0a25ee3f2e9b9caac550752e0f/tumblr_n0huzr2xVO1si4awpo3_250.gif",
      ])
    );
  });

  robot.respond(/\S+hose(?: (@?\w+))?/i, function (msg) {
    msg.send("_doof doof doof_");
    const prefix = msg.match[1] ? `${msg.match[1]}: ` : "";

    const fn = () => msg.send(`${prefix}_splat splat splat_`);
    setTimeout(fn, _.random(3000, 5000));
  });

  robot.respond(/welcome(?: +(@?\w+))?/i, function (msg) {
    const target = msg.match[1] ? `, ${msg.match[1]}` : "";
    msg.send(`\
Welcome to #~s${target}! Here's a quick intro to Slack and me:
https://gist.github.com/smashwilson/325d444e7a080906f8b9\
`);
  });

  robot.respond(/poker.*/i, (msg) => msg.send("I barely know her!"));

  robot.respond(/sin/i, (msg) =>
    msg.send(
      atRandom([
        "Murder",
        "Having an affair",
        "Witchcraft",
        "Pride",
        "Hate",
        "Homosexuality",
        "Wanting something that belongs to someone else!",
        "Envy",
        "Stubbornness",
        "Cheating",
        "Unbelief",
        "Filthy talk",
        "Incest",
        "Shacking",
        "Swearing",
        "Stealing",
        "Worshipping false gods",
        "Drunkenness",
        "Playing with the occult",
        "Hating parents",
        "Lying",
        "Lust",
        "Ignoring God",
        "Selfishness",
      ])
    )
  );

  robot.respond(/pokemonsay ([^]*)/i, function (msg) {
    const unownify = function (c) {
      if ("abcdefghijklmnopqrstuvwxyz".includes(c)) {
        return `:unown-${c}:`;
      } else if (c === "!") {
        return ":unown-ex:";
      } else if (c === "?") {
        return ":unown-qu:";
      } else {
        return c;
      }
    };
    const lowerString = msg.match[1].toLowerCase();
    const unownString = lowerString.split("").map(unownify).join("");
    return msg.send(unownString);
  });

  robot.hear(/(^|[^0-9])69([^0-9]|$)/, (msg) =>
    msg.send("https://thats.thesexnumber.fyi/")
  );

  robot.respond(/femshep/i, (msg) =>
    msg.send(
      atRandom([
        "http://media.tumblr.com/tumblr_lsxdm7yONC1qbplir.gif",
        "http://i.imgur.com/vJL0E6t.gif",
      ])
    )
  );

  robot.respond(/fenris/i, (msg) =>
    msg.send("https://i.imgur.com/oNICSik.gif")
  );

  robot.respond(/nope\s*$/i, (msg) =>
    msg.send("http://www.reactiongifs.com/wp-content/uploads/2013/06/nope.gif")
  );

  robot.respond(/fine/i, (msg) => msg.send(":fire::thisisfine::fire:"));

  robot.hear(/robot\s+body/i, (msg) =>
    msg.send(
      atRandom([
        "http://img.sharetv.com/shows/episodes/standard/345637.jpg",
        "https://68.media.tumblr.com/d6d9c3286d944ef1bdbf3e41e2f99d48/tumblr_omhzugCO4R1tpri36o1_500.png",
      ])
    )
  );

  robot.hear(/\bbee+[s]?\b/i, (msg) =>
    msg.send(
      atRandom([
        "https://media.giphy.com/media/dcubXtnbck0RG/giphy.gif",
        "http://i.imgur.com/hnGNH.gif",
        "http://i.imgur.com/tZ3yQMb.gif",
        "https://user-images.githubusercontent.com/17565/78700559-8c918100-78d3-11ea-8ea0-31368c62e33c.png",
      ])
    )
  );

  robot.hear(/\b(?:tit downwards|breasted boobily)\b/i, (msg) =>
    msg.send("http://imgur.com/TRAPYBX")
  );

  robot.respond(/embiggen\s+([^]+)/i, (msg) =>
    msg.send(`:muscle-left: ${msg.match[1]} :muscle-right:`)
  );

  robot.respond(/quite/i, (msg) => msg.reply("Indeed."));

  robot.respond(/clap\s*([^]+)/i, function (msg) {
    const words = msg.match[1].split(/\s+/).filter((word) => word.length > 0);
    return msg.send(words.join(" :clap: "));
  });

  robot.respond(/honk/i, (msg) => {
    msg.send("Honk. Honk. HOOOOOOOOONK");
  });

  robot.respond(/(oh)?no/i, (msg) => {
    msg.send(
      "https://user-images.githubusercontent.com/17565/82504538-a5dc3e80-9ac9-11ea-8a86-28def5edb6a5.gif"
    );
  });
};
