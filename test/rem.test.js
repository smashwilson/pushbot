describe('rem', function () {
  let bot

  beforeEach(async function () {
    bot = new BotContext('../scripts/rem.js')
  })

  afterEach(function () {
    bot.destroy()
  })

  it('stores and recalls a mapping with !rem', async function () {
    usesDatabase(this)

    await bot.say('admin', '@hubot rem some key = a value')
    await bot.waitForResponse(`@admin :ok_hand: I've learned "some key".`)
    await bot.say('admin', '@hubot rem some key')
    await bot.waitForResponse('a value')
  })

  it("reports keys it doesn't know", async function () {
    usesDatabase(this)

    await bot.say('admin', '@hubot rem nope')
    await bot.waitForResponse('nope? Never heard of it.')
  })

  it('forgets a mapping with !forget', async function () {
    usesDatabase(this)

    await bot.say('admin', '@hubot rem some key = a value')
    await bot.say('admin', '@hubot rem some key')
    await bot.waitForResponse('a value')
    await bot.say('admin', '@hubot forget some key')
    await bot.waitForResponse('@admin :dusty_stick: "some key" has been forgotten.')
  })
})
