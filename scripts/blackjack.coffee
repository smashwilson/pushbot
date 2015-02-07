# Description:
#   Play a game of blackjack against the bot
#
# Commands:
#   hubot hitme - Instruct the bot to deal you another card
#   hubot stay - Inform the bot that you are satisfied with your hand.
#   hubot bjstatus - Your hand and the dealer's hand
#   hubot card - deal the channel a random card from the current deck
#   hubot shuffle - shuffle the current deck

_ = require 'underscore'

SUITS = ['Clubs', 'Diamonds', 'Hearts', 'Spades']

class Card

  constructor: (index, @suit, @visible=true) ->
    @ace = false
    @value = index
    @idx = index
    @name = "#{index}"
    if index == 1
      @value = 11
      @ace = true
      @name = "Ace"
    if index > 10
      @value = 10
      @name = ["Jack", "Queen", "King"][index-11]

  @fromObject: (card) -> new @(card.idx, card.suit, card.visible)

  harden: () ->
    if @value == 11
      @value = 1
      return true
    return false

  isObject: () ->
    # Blackjack depends heavily on the cards retrieved from the
    # bot brain being Card objects, but the bot brain just
    # JSONs everything and calls it a day.  This function exists
    # to test if the deck we've got is a real deck of Card
    # objects or if it's just been reconstituted from JSON
    true

  toString: () ->
    if @visible
      "#{@name} of #{@suit}"
    else
      "[hidden]"


class Hand

  constructor: (cards=[]) ->
    @cards = classifyCards(cards)

  @fromObject: (hand) -> new Hand(hand.cards)

  getDealt: (card) ->
    @cards.push(card)

  hardenIfNeeded: () ->
    if @value() > 21
      for card in @cards
        if card.harden()
          if @value() <= 21
            return

  isObject: () ->
    # See Card.isObject, same deal
    true

  show: () ->
    for card in @cards
      card.visible = true

  toString: () ->
    if @cards.length > 0
      @cards.toString()
    else
      "[Empty hand]"

  value: () ->
    # old-school loop because .reduce is for some reason turning
    # everything into strings.
    total = 0
    for card in @cards
      total += card.value
    return total

class Blackjack
  constructor: (oldgame = {}) ->
    @status = oldgame.status or 'playing'
    @deck = classifyCards(oldgame.deck) or randomDeck()
    @dealer = classifyHand(oldgame.dealer) or new Hand()
    @player = classifyHand(oldgame.player) or new Hand()

  deal: (to, who="", msg=null, amount=1, hide=false) ->
    for i in [1..amount]
      if @deck.length == 0
        @deck = randomDeck()
        msg?.send "Dealer shuffles a new deck"
      card = @deck.pop()
      card.visible = not hide
      msg?.send "[#{who}] #{card}"
      to.getDealt(card)

      if to.value() > 21
        to.hardenIfNeeded()
      if to.value() > 21
        @status = 'over'
        msg?.send "#{who} busts!"
        return false
    return true

  initialDeal: (msg=null) ->
    who = msg?.message?.user?.name or "You"
    @deal(@dealer, "Dealer", msg)
    @deal(@dealer, "Dealer", msg, 1, true)
    @deal(@player, who, msg, 2)

    #  Check for instant winners
    if @dealer.value() == 21 and @player.value() == 21
      msg?.send "Blackjacks for EVERYONE!  TIE!"
      @status = 'over'
    else if @dealer.value() == 21
      msg?.send "Dealer blackjack!  You lose!"
      @status = 'over'
    else if @player.value() == 21
      msg?.send "Player blackjack!  You win!"
      @status = 'over'

  playerStay: (who="", msg=null) ->
    @dealer.show()
    msg?.send "Dealer reveals their hand: #{@dealer}"
    while @dealer.value() < 17
      @deal(@dealer, "Dealer", msg)

    if @dealer.value() > 21
      @status = 'over'
    else if @dealer.value() < @player.value()
      @status = 'over'
      msg?.send "Dealer must stay; You win!"
    else if @dealer.value() == @player.value()
      @status = 'over'
      msg?.send "Dealer must stay; tie!"
    else
      @status = 'over'
      msg?.send "Dealer stays; You lose!"

  playing: () ->
    @status == 'playing'


classifyCards = (cards) ->
  if cards and cards.length > 0 and not cards[0].isObject
    return (Card.fromObject(obj) for obj in cards)
  return cards

classifyHand = (hand) ->
  if hand and not hand.isObject
    return Hand.fromObject(hand)
  return hand

fullDeck = () ->
  _.flatten((new Card(i, suit) for i in [1..13]) for suit in SUITS)

randomDeck = () ->
  _.shuffle(fullDeck())

module.exports = (robot) ->

  ensureGame = (game_name) ->
    data = robot.brain.data
    newgame = false
    if not data.blackjack
      data.blackjack = {}
      newgame = true
    if not data.blackjack[game_name]
      newgame = true
    else if data.blackjack[game_name].status == 'over'
        newgame = true

    if newgame
      data.blackjack[game_name] = new Blackjack()
    else
      data.blackjack[game_name] = new Blackjack(data.blackjack[game_name])

    return newgame

  ensureDeck = (deck_name="common", repopulate=false) ->
    data = robot.brain.data
    mutated = false
    if not data.decks
      data.decks = {}
      mutated = true
    if not data.decks[deck_name]
      mutated = true
      data.decks[deck_name] = []
    if data.decks[deck_name].length == 0 and repopulate
      mutated = true
      data.decks[deck_name] = _.shuffle(fullDeck())
    # 'mutated' is just to let the calling function know that we
    # created or shuffled an entirely new deck, so it can report
    # back to the user.  That's why even though we might be
    # mutating the deck here, we don't report true
    data.decks[deck_name] = classifyCards(data.decks[deck_name])
    return mutated

  shuffle = (deck_name = "common") ->
    ensureDeck(deck_name)
    robot.brain.data.decks[deck_name] = _.shuffle(fullDeck())

  robot.respond /shuffle/i, (msg) ->
    shuffle()
    msg.send "You are now playing with a full deck"

  robot.respond /card/i, (msg) ->
    msg.send "Shuffling a new deck" if ensureDeck("common", true)
    common = robot.brain.data.decks.common
    msg.send common.pop()

  robot.respond /hitme/i, (msg) ->
    gid = "blackjack-#{msg.message.user.id}"
    who = msg.message.user.name or "You"

    newgame = ensureGame(gid)
    msg.send "Starting a new game" if newgame

    # This abbreviation never gets old
    bj = robot.brain.data.blackjack[gid]

    if newgame
      bj.initialDeal(msg)
    else
      bj.deal(bj.player, who, msg)

  robot.respond /stay/i, (msg) ->
    gid = "blackjack-#{msg.message.user.id}"
    who = msg.message.user.name or "You"

    newgame = ensureGame(gid)
    bj = robot.brain.data.blackjack[gid]
    if newgame
      bj.status = 'over'
      msg.send "Now sit!  Roll over!"
      return

    bj.playerStay(who, msg)


  robot.respond /bjstatus/i, (msg) ->
    gid = "blackjack-#{msg.message.user.id}"
    who = msg.message.user.name or "You"
    newgame = ensureGame(gid)
    bj = robot.brain.data.blackjack[gid]
    if newgame
      bj.status = 'over'
      msg.send "Blackjack status:  You are not playing blackjack"
      return
    msg.send "[Dealer] #{bj.dealer}"
    msg.send "[#{who}] #{bj.player}"
