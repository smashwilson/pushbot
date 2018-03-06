describe('rem', function () {
  let bot

  beforeEach(async function () {
    bot = new BotContext('../scripts/rem.js')
  })

  afterEach(function () {
    bot.destroy()
  })

  it('stores and recalls a mapping with !rem', async function () {
    await bot.say('admin', '@hubot rem some key = a value')
    await bot.waitForResponse(`@admin :ok_hand: I've learned "some key".`)
    await bot.say('admin', '@hubot rem some key')
    await bot.waitForResponse('a value')
  })

  it("reports keys it doesn't know", async function () {
    await bot.say('admin', '@hubot rem nope')
    await bot.waitForResponse('nope? Never heard of it.')
  })

  it('forgets a mapping with !forget', async function () {
    await bot.say('admin', '@hubot rem some key = a value')
    await bot.say('admin', '@hubot rem some key')
    await bot.waitForResponse('a value')
    await bot.say('admin', '@hubot forget some key')
    await bot.waitForResponse('@admin :dusty_stick: "some key" has been forgotten.')
  })

  describe('!remsearch', function () {
    it('lists matching keys', async function () {
      bot.store('rem:0 aa 0', 'A')
      bot.store('rem:1 aa 1', 'B')
      bot.store('rem:2 bb 2', 'C')

      await bot.say('admin', '@hubot remsearch aa')
      await bot.waitForResponse('> 0 aa 0\n> 1 aa 1\n')
    })

    it('lists all keys', async function () {
      bot.store('rem:0 aa 0', 'A')
      bot.store('rem:1 aa 1', 'B')
      bot.store('rem:2 bb 2', 'C')

      await bot.say('admin', '@hubot remsearch')
      await bot.waitForResponse('> 0 aa 0\n> 1 aa 1\n> 2 bb 2\n')
    })

    it('shows at most ten results', async function () {
      for (let i = 0; i < 20; i++) {
        bot.store(`rem:key ${i}`, 'V')
      }

      await bot.say('admin', '@hubot remsearch')
      await bot.waitForResponse(
        '> key 0\n> key 1\n' +
        '> key 2\n> key 3\n' +
        '> key 4\n> key 5\n' +
        '> key 6\n> key 7\n' +
        '> key 8\n> key 9\n'
      )
    })
  })
})
