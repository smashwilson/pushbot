const Helper = require('hubot-test-helper')
const helper = new Helper([])

const {UserSetResolver} = require('../../scripts/api/user-set')

describe('UserSetResolver', function () {
  let room, self, req, resolver

  beforeEach(async function () {
    room = helper.createRoom({httpd: false})

    const robot = room.robot
    await loadAuth(robot, '1')

    const brain = robot.brain

    self = brain.userForId('1', {name: 'self', roles: ['role one', 'role two']})
    brain.userForId('2', {name: 'two'})
    brain.userForId('3', {name: 'three'})

    req = {robot, user: self}
    resolver = new UserSetResolver()
  })

  afterEach(function () {
    room.destroy()
  })

  describe('me', function () {
    it('returns a resolver for a user from the request', function () {
      const result = resolver.me({}, req)
      expect(result.user).to.eql(self)
    })
  })

  describe('all', function () {
    it('returns resolvers for all users', function () {
      const results = resolver.all({}, req)
      expect(results.map(each => each.user)).to.have.deep.members([
        {id: '1', name: 'self', roles: ['role one', 'role two']},
        {id: '2', name: 'two'},
        {id: '3', name: 'three'}
      ])
    })
  })

  describe('withName', function () {
    it('returns a resolver for a user by name', function () {
      const result = resolver.withName({name: 'two'}, req)
      expect(result.user.id).to.eql('2')
    })

    it('return null if no such user exists', function () {
      const result = resolver.withName({name: 'snorgle'}, req)
      expect(result).to.eql(null)
    })
  })

  describe('UserResolver', function () {
    it('reports static properties directly from the User model', function () {
      self.real_name = 'Real Name'
      self.slack = {tz: 'America/New_York', presence: 'active'}

      const userResolver = resolver.me({}, req)

      expect(userResolver.id).to.eql('1')
      expect(userResolver.name).to.eql('self')
      expect(userResolver.realName).to.eql('Real Name')
      expect(userResolver.timezone).to.eql('America/New_York')
      expect(userResolver.presence).to.eql('ACTIVE')
    })

    it('defaults missing attributes', function () {
      const userResolver = resolver.me({}, req)

      expect(userResolver.id).to.eql('1')
      expect(userResolver.name).to.eql('self')
      expect(userResolver.realName).to.eql(undefined)
      expect(userResolver.timezone).to.eql(undefined)
      expect(userResolver.presence).to.eql('UNKNOWN')
    })

    it("returns a resolver for the user's status", function () {
      self.slack = {
        profile: {
          status_text: 'here',
          status_emoji: ':coffee:'
        }
      }

      const userResolver = resolver.me({}, req)
      const statusResolver = userResolver.status()

      expect(statusResolver.message).to.eql('here')
      expect(statusResolver.emoji).to.eql(':coffee:')
    })

    it('returns an empty resolver if no status exists', function () {
      const userResolver = resolver.me({}, req)
      const statusResolver = userResolver.status()

      expect(statusResolver.message).to.eql(undefined)
      expect(statusResolver.emoji).to.eql(undefined)
    })

    it("returns a resolver for the user's avatar", function () {
      self.slack = {
        profile: {
          image_24: 'https://localhost/avatar24.jpg',
          image_32: 'https://localhost/avatar32.jpg',
          image_48: 'https://localhost/avatar48.jpg',
          image_72: 'https://localhost/avatar72.jpg',
          image_192: 'https://localhost/avatar192.jpg',
          image_512: 'https://localhost/avatar512.jpg',
          image_1024: 'https://localhost/avatar1024.jpg'
        }
      }

      const userResolver = resolver.me({}, req)
      const avatarResolver = userResolver.avatar()

      expect(avatarResolver.image24).to.eql('https://localhost/avatar24.jpg')
      expect(avatarResolver.image32).to.eql('https://localhost/avatar32.jpg')
      expect(avatarResolver.image48).to.eql('https://localhost/avatar48.jpg')
      expect(avatarResolver.image72).to.eql('https://localhost/avatar72.jpg')
      expect(avatarResolver.image192).to.eql('https://localhost/avatar192.jpg')
      expect(avatarResolver.image512).to.eql('https://localhost/avatar512.jpg')
      expect(avatarResolver.image1024).to.eql('https://localhost/avatar1024.jpg')
    })

    it('returns an empty resolver if no avatar exists', function () {
      const userResolver = resolver.me({}, req)
      const avatarResolver = userResolver.avatar()

      expect(avatarResolver.image24).to.eql(undefined)
      expect(avatarResolver.image32).to.eql(undefined)
      expect(avatarResolver.image48).to.eql(undefined)
      expect(avatarResolver.image72).to.eql(undefined)
      expect(avatarResolver.image192).to.eql(undefined)
      expect(avatarResolver.image512).to.eql(undefined)
      expect(avatarResolver.image1024).to.eql(undefined)
    })

    it('accesses currently assigned roles', function () {
      const userResolver = resolver.me({}, req)
      const roles = userResolver.roles({}, req)
      expect(roles).to.eql([
        {name: 'admin'},
        {name: 'role one'},
        {name: 'role two'}
      ])
    })
  })
})
