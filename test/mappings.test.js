describe('mappings', function () {
  let bot

  beforeEach(async function () {
    bot = new BotContext('../scripts/mapping.js')
    await bot.loadAuth('1')

    bot.createUser('1', 'admin', { roles: ['mapmaker'] })
    bot.createUser('2', 'fancy', { roles: ['fancy lad'] })
    bot.createUser('3', 'dandy', { roles: ['dandy lad'] })
  })

  afterEach(async function () {
    await bot.say('admin', '@hubot destroymapping foo')
    await bot.waitForResponse(/mapping foo/).catch(() => {})
    bot.destroy()
  })

  it('creates a new mapping with !createmapping', async function () {
    usesDatabase(this)

    await bot.say('admin', '@hubot createmapping foo')
    await bot.waitForResponse('@admin mapping foo has been created. :sparkles:')
    await bot.say('admin', '@hubot setfoo @admin: words words words')
    await bot.waitForResponse("admin's foo has been set to 'words words words'.")
    await bot.say('admin', '@hubot foo')
    await bot.waitForResponse('words words words')
  })

  it('specifies the null message with --null', async function () {
    usesDatabase(this)

    await bot.say('admin', '@hubot createmapping foo --null="Nothing here."')
    await bot.waitForResponse('@admin mapping foo has been created. :sparkles:')
    await bot.say('admin', '@hubot foo')
    await bot.waitForResponse('Nothing here.')
  })

  it('configures the role required to set your own with --role-own', async function () {
    usesDatabase(this)

    await bot.say('admin', '@hubot createmapping foo --role-own "fancy lad"')
    await bot.waitForResponse('@admin mapping foo has been created. :sparkles:')

    await bot.say('dandy', '@hubot setfoo: nope')
    await bot.waitForResponse("@dandy You can't do that! You're not a *fancy lad*.\n" +
            'Ask an admin to run `hubot grant dandy the fancy lad role`.')

    await bot.say('fancy', '@hubot setfoo: yep')
    await bot.waitForResponse("fancy's foo has been set to 'yep'.")

    await bot.say('dandy', '@hubot foo')
    await bot.waitForResponse("I don't know any foos that contain that!")

    await bot.say('fancy', '@hubot foo')
    await bot.waitForResponse('yep')
  })

  it('configures the role required to set others with --role-other', async function () {
    usesDatabase(this)

    await bot.say('admin', '@hubot createmapping foo --role-other "fancy lad"')
    await bot.waitForResponse('@admin mapping foo has been created. :sparkles:')

    await bot.say('dandy', '@hubot setfoo @fancy: nope')
    await bot.waitForResponse("@dandy You can't do that! You're not a *fancy lad*.\n" +
            'Ask an admin to run `hubot grant dandy the fancy lad role`.')

    await bot.say('fancy', '@hubot setfoo @dandy: yep')
    await bot.waitForResponse("dandy's foo has been set to 'yep'.")

    await bot.say('dandy', '@hubot foo')
    await bot.waitForResponse('yep')

    await bot.say('fancy', '@hubot foo')
    await bot.waitForResponse("I don't know any foos that contain that!")
  })

  it('fails if the mapping already exists', async function () {
    usesDatabase(this)

    await bot.say('admin', '@hubot createmapping foo')
    await bot.waitForResponse('@admin mapping foo has been created. :sparkles:')
    await bot.say('admin', '@hubot createmapping foo')
    await bot.waitForResponse("There's already a mapping called foo, silly!")
  })

  it('changes an existing mapping with !changemapping', async function () {
    await bot.say('admin', '@hubot createmapping foo')
    await bot.waitForResponse('@admin mapping foo has been created. :sparkles:')

    await bot.say('dandy', '@hubot foo')
    await bot.waitForResponse("I don't know any foos that contain that!")

    await bot.say('admin', '@hubot changemapping foo --null stuff')
    await bot.waitForResponse('Mapping foo changed. :party-corgi:')

    await bot.say('dandy', '@hubot foo')
    await bot.waitForResponse('stuff')
  })

  it('destroys a mapping with !destroymapping', async function () {
    usesDatabase(this)

    await bot.say('admin', '@hubot createmapping foo')
    await bot.waitForResponse('@admin mapping foo has been created. :sparkles:')

    await bot.say('admin', '@hubot destroymapping foo')
    await bot.waitForResponse('@admin mapping foo has been destroyed. :fire:')
  })

  it('is okay to destroy a nonexistent mapping', async function () {
    usesDatabase(this)

    await bot.say('admin', '@hubot destroymapping blerp')
    await bot.waitForResponse('@admin mapping blerp does not exist.')
  })
})
