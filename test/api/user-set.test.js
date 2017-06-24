const Helper = require('hubot-test-helper')
const helper = new Helper([])

const UserSetResolver = require('../../scripts/api/user-set')

describe('UserSetResolver', function () {
  let room, self, req, resolver

  beforeEach(function () {
    room = helper.createRoom({httpd: false})

    const robot = room.robot
    const brain = robot.brain

    self = brain.userForId('1', {name: 'self'})
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
      const result = resolver.me([], req)
      expect(result.user).to.eql(self)
    })
  })

  describe('all', function () {
    it('returns resolvers for all users')
  })

  describe('withName', function () {
    it('returns a resolver for a user by name')
    it('return null if no such user exists')
  })
})

describe('UserResolver', function () {
  it('reports static properties directly from the User model')
  it("returns a resolver for the user's status")
  it('returns an empty resolver if no status exists')
  it("returns a resolver for the user's avatar")
  it('returns an empty resolver if no avatar exists')
})

describe('StatusResolver', function () {
  it('reports static properties directly')
})

describe('AvatarResolver', function () {
  it('reports image URLs in various dimensions')
})
