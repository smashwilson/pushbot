// Description:
//   Play a game of blackjack against the bot
//
// Commands:
//   hubot hitme - Instruct the bot to deal you another card
//   hubot stay - Inform the bot that you are satisfied with your hand.
//   hubot bjstatus - Your hand and the dealer's hand
//   hubot card - deal the channel a random card from the current deck
//   hubot shuffle - shuffle the current deck

const _ = require("underscore");

const SUITS = ["Clubs", "Diamonds", "Hearts", "Spades"];

const nullMsg = {
  send: () => {},
  reply: () => {},
  message: {user: {name: "You"}},
};

class Card {
  constructor(index, suit, visible = true) {
    this.suit = suit;
    this.visible = visible;
    this.idx = index;

    if (index === 1) {
      this.value = 11;
      this.ace = true;
      this.name = "Ace";
    } else if (index > 10) {
      this.value = 10;
      this.ace = false;
      this.name = ["Jack", "Queen", "King"][index - 11];
    } else {
      this.value = index;
      this.ace = false;
      this.name = `${index}`;
    }
  }

  static fromObject(card) {
    return new this(card.idx, card.suit, card.visible);
  }

  harden() {
    if (this.value === 11) {
      this.value = 1;
      return true;
    }
    return false;
  }

  isObject() {
    // Blackjack depends heavily on the cards retrieved from the
    // bot brain being Card objects, but the bot brain just
    // JSONs everything and calls it a day.  This function exists
    // to test if the deck we've got is a real deck of Card
    // objects or if it's just been reconstituted from JSON
    return true;
  }

  toString() {
    if (this.visible) {
      return `${this.name} of ${this.suit}`;
    } else {
      return "[hidden]";
    }
  }
}

class Hand {
  constructor(cards = []) {
    this.cards = classifyCards(cards);
  }

  static fromObject(hand) {
    return new Hand(hand.cards);
  }

  getDealt(card) {
    this.cards.push(card);
  }

  hardenIfNeeded() {
    if (this.value() > 21) {
      for (const card of this.cards) {
        if (card.harden()) {
          if (this.value() <= 21) {
            return;
          }
        }
      }
    }
  }

  isObject() {
    // See Card.isObject, same deal
    return true;
  }

  show() {
    for (const card of this.cards) {
      card.visible = true;
    }
  }

  toString() {
    if (this.cards.length > 0) {
      return this.cards.map((c) => c.toString()).join(", ");
    } else {
      return "[Empty hand]";
    }
  }

  value() {
    // old-school loop because .reduce is for some reason turning
    // everything into strings.
    let total = 0;
    for (const card of this.cards) {
      total += card.value;
    }
    return total;
  }
}

class Blackjack {
  constructor(oldgame = {}) {
    this.status = oldgame.status || "playing";
    this.deck = classifyCards(oldgame.deck) || randomDeck();
    this.dealer = classifyHand(oldgame.dealer) || new Hand();
    this.player = classifyHand(oldgame.player) || new Hand();
  }

  deal(to, who = "", msg = nullMsg, amount = 1, hide = false) {
    for (let i = 1; i <= amount; i++) {
      if (this.deck.length === 0) {
        this.deck = randomDeck();
        msg.send("Dealer shuffles a new deck");
      }

      const card = this.deck.pop();
      card.visible = !hide;
      msg.send(`[${who}] ${card}`);
      to.getDealt(card);

      if (to.value() > 21) {
        to.hardenIfNeeded();
      }

      if (to.value() > 21) {
        this.status = "over";
        msg.send(`${who} busts!`);
        return false;
      }
    }

    return true;
  }

  initialDeal(msg = nullMsg) {
    const who = msg.message.user.name;

    this.deal(this.dealer, "Dealer", msg);
    this.deal(this.dealer, "Dealer", msg, 1, true);
    this.deal(this.player, who, msg, 2);

    // Check for instant winners
    if (this.dealer.value() === 21 && this.player.value() === 21) {
      msg.send("Blackjacks for EVERYONE!  TIE!");
      this.status = "over";
    } else if (this.dealer.value() === 21) {
      msg.send("Dealer blackjack!  You lose!");
      this.status = "over";
    } else if (this.player.value() === 21) {
      msg.send("Player blackjack!  You win!");
      this.status = "over";
    }
  }

  playerStay(msg = nullMsg) {
    this.dealer.show();
    msg.send(`Dealer reveals their hand: ${this.dealer}`);

    while (this.dealer.value() < 17) {
      this.deal(this.dealer, "Dealer", msg);
    }

    if (this.dealer.value() > 21) {
      this.status = "over";
    } else if (this.dealer.value() < this.player.value()) {
      msg.send("Dealer must stay; You win!");
      this.status = "over";
    } else if (this.dealer.value() === this.player.value()) {
      msg.send("Dealer must stay; tie!");
      this.status = "over";
    } else {
      msg.send("Dealer stays; You lose!");
      this.status = "over";
    }
  }

  playing() {
    return this.status === "playing";
  }
}

function classifyCards(cards) {
  if (cards && cards.length > 0 && !cards[0].isObject) {
    return Array.from(cards, (obj) => Card.fromObject(obj));
  } else {
    return cards;
  }
}

function classifyHand(hand) {
  if (hand && !hand.isObject) {
    return Hand.fromObject(hand);
  } else {
    return hand;
  }
}

function fullDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let i = 1; i <= 13; i++) {
      deck.push(new Card(i, suit));
    }
  }
  return deck;
}

function randomDeck() {
  return _.shuffle(fullDeck());
}

module.exports = function (robot) {
  function ensureGame(gameName) {
    const {data} = robot.brain;
    let newGame = false;

    if (!data.blackjack) {
      data.blackjack = {};
      newGame = true;
    }

    if (!data.blackjack[gameName]) {
      newGame = true;
    } else if (data.blackjack[gameName].status === "over") {
      newGame = true;
    }

    if (newGame) {
      data.blackjack[gameName] = new Blackjack();
    } else {
      data.blackjack[gameName] = new Blackjack(data.blackjack[gameName]);
    }

    return newGame;
  }

  function ensureDeck(deckName = "common", repopulate = false) {
    const {data} = robot.brain;

    let mutated = false;
    if (!data.decks) {
      data.decks = {};
      mutated = true;
    }

    if (!data.decks[deckName]) {
      data.decks[deckName] = [];
      mutated = true;
    }

    if (data.decks[deckName].length === 0 && repopulate) {
      data.decks[deckName] = randomDeck();
      mutated = true;
    }

    // 'mutated' is just to let the calling function know that we
    // created or shuffled an entirely new deck, so it can report
    // back to the user.  That's why even though we might be
    // mutating the deck here, we don't report true
    data.decks[deckName] = classifyCards(data.decks[deckName]);

    return mutated;
  }

  function shuffle(deckName = "common") {
    ensureDeck(deckName);
    robot.brain.data.decks[deckName] = randomDeck();
  }

  robot.respond(/shuffle/i, function (msg) {
    shuffle();
    msg.send("You are now playing with a full deck");
  });

  robot.respond(/card/i, function (msg) {
    if (ensureDeck("common", true)) {
      msg.send("Shuffling a new deck");
    }

    const {common} = robot.brain.data.decks;
    msg.send(common.pop());
  });

  robot.respond(/hitme/i, function (msg) {
    const gid = `blackjack-${msg.message.user.id}`;
    const who = msg.message.user.name || "You";

    const newGame = ensureGame(gid);
    if (newGame) {
      msg.send("Starting a new game");
    }

    // This abbreviation never gets old
    const bj = robot.brain.data.blackjack[gid];

    if (newGame) {
      bj.initialDeal(msg);
    } else {
      bj.deal(bj.player, who, msg);
    }
  });

  robot.respond(/stay/i, function (msg) {
    const gid = `blackjack-${msg.message.user.id}`;

    const newGame = ensureGame(gid);
    const bj = robot.brain.data.blackjack[gid];
    if (newGame) {
      bj.status = "over";
      msg.send("Now sit!  Roll over!");
    } else {
      bj.playerStay(msg);
    }
  });

  robot.respond(/bjstatus/i, function (msg) {
    const gid = `blackjack-${msg.message.user.id}`;
    const who = msg.message.user.name || "You";
    const newGame = ensureGame(gid);

    const bj = robot.brain.data.blackjack[gid];
    if (newGame) {
      bj.status = "over";
      msg.send("Blackjack status:  You are not playing blackjack");
    } else {
      msg.send(`[Dealer] ${bj.dealer}`);
      msg.send(`[${who}] ${bj.player}`);
    }
  });
};
