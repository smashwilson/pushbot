const Helper = require('hubot-test-helper')
const helper = new Helper('../scripts/mapping.js')

describe('mappings', function () {
  let room

  beforeEach(async function () {
    room = helper.createRoom({httpd: false})
    room.robot.postgres = global.database
    await loadAuth(room)

    const brain = room.robot.brain
    brain.userForId('admin', {name: 'admin', roles: ['mapmaker']})
    brain.userForId('fancy', {name: 'fancy', roles: ['fancy lad']})
    brain.userForId('dandy', {name: 'dandy', roles: ['dandy lad']})
  })

  afterEach(async function () {
    await room.user.say('admin', '@hubot destroymapping foo')
    await delay(400)()
    await room.destroy()
  })

  function responses () {
    return room.messages.filter(pair => pair[0] === 'hubot').map(pair => pair[1])
  }

  function response (expected) {
    return new Promise((resolve, reject) => {
      let count = 0

      const check = () => {
        if (responses().indexOf(expected) !== -1) {
          resolve()
        } else if (count > 20) {
          console.log(room.messages)
          return reject(new Error(`"${expected}" response not seen.`))
        } else {
          count++
          setTimeout(check, 50)
        }
      }

      check()
    })
  }

  it('creates a new mapping with !createmapping', async function () {
    usesDatabase(this)

    await room.user.say('admin', '@hubot createmapping foo')
    await response('@admin mapping foo has been created. :sparkles:')
    await delay(200)()
    await room.user.say('admin', '@hubot setfoo @admin: words words words')
    await response("admin's foo has been set to 'words words words'.")
    await room.user.say('admin', '@hubot foo')
    await response('words words words')
  })

  it('specifies the null message with --null', async function () {
    usesDatabase(this)

    await room.user.say('admin', '@hubot createmapping foo --null="Nothing here."')
    await response('@admin mapping foo has been created. :sparkles:')
    await delay(500)()
    await room.user.say('admin', '@hubot foo')
    await response('Nothing here.')
  })

  it('configures the role required to set your own with --role-own', async function () {
    usesDatabase(this)

    await room.user.say('admin', '@hubot createmapping foo --role-own "fancy lad"')
    await response('@admin mapping foo has been created. :sparkles:')
    await delay(500)()

    await room.user.say('dandy', '@hubot setfoo: nope')
    await response("@dandy You can't do that! You're not a *fancy lad*.\n" +
            'Ask an admin to run `hubot grant dandy the fancy lad role`.')

    await room.user.say('fancy', '@hubot setfoo: yep')
    await response("fancy's foo has been set to 'yep'.")

    await room.user.say('dandy', '@hubot foo')
    await response("I don't know any foos that contain that!")

    await room.user.say('fancy', '@hubot foo')
    await response('yep')
  })

  it('configures the role required to set others with --role-other', async function () {
    usesDatabase(this)

    await room.user.say('admin', '@hubot createmapping foo --role-other "fancy lad"')
    await response('@admin mapping foo has been created. :sparkles:')
    await delay(500)()

    await room.user.say('dandy', '@hubot setfoo @fancy: nope')
    await response("@dandy You can't do that! You're not a *fancy lad*.\n" +
            'Ask an admin to run `hubot grant dandy the fancy lad role`.')

    await room.user.say('fancy', '@hubot setfoo @dandy: yep')
    await response("dandy's foo has been set to 'yep'.")

    await room.user.say('dandy', '@hubot foo')
    await response('yep')

    await room.user.say('fancy', '@hubot foo')
    await response("I don't know any foos that contain that!")
  })

  it('fails if the mapping already exists', async function () {
    usesDatabase(this)

    await room.user.say('admin', '@hubot createmapping foo')
    await delay(200)
    await room.user.say('admin', '@hubot createmapping foo')
    await response("There's already a mapping called foo, silly!")
  })

  it('changes an existing mapping with !changemapping', async function () {
    await room.user.say('admin', '@hubot createmapping foo')
    await response('@admin mapping foo has been created. :sparkles:')

    await room.user.say('dandy', '@hubot foo')
    await response("I don't know any foos that contain that!")

    await room.user.say('admin', '@hubot changemapping foo --null stuff')
    await response('Mapping foo changed. :party-corgi:')

    await room.user.say('dandy', '@hubot foo')
    await response('stuff')
  })

  it('destroys a mapping with !destroymapping', async function () {
    usesDatabase(this)

    await room.user.say('admin', '@hubot createmapping foo')
    await delay(200)()
    await room.user.say('admin', '@hubot destroymapping foo')
    await response('@admin mapping foo has been destroyed. :fire:')
  })

  it('is okay to destroy a nonexistent mapping', async function () {
    usesDatabase(this)

    await room.user.say('admin', '@hubot destroymapping blerp')
    await response('@admin mapping blerp does not exist.')
  })
})
