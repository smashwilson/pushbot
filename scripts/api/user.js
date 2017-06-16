class AvatarResolver {
  constructor (profile) {
    this.profile = profile

    this.image24 = profile.image_24
    this.image32 = profile.image_32
    this.image48 = profile.image_48
    this.image72 = profile.image_72
    this.image192 = profile.image_192
    this.image512 = profile.image_512
    this.image1024 = profile.image_1024
  }
}

class StatusResolver {
  constructor (profile) {
    this.message = profile.status_text
    this.emoji = profile.status_emoji
  }
}

class UserResolver {
  constructor (user) {
    this.user = user
    this.slack = this.user.slack || {}
    this.profile = this.slack.profile || {}

    this.id = this.user.id
    this.name = this.user.name
    this.realName = this.user.real_name

    this.timezone = this.slack.tz
    this.presence = (this.slack.presence || 'UNKNOWN').toUpperCase()
  }

  status () {
    return new StatusResolver(this.profile)
  }

  avatar () {
    return new AvatarResolver(this.profile)
  }

  roles () {
    return []
  }
}

module.exports = UserResolver
