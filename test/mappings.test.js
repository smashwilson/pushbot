const Helper = require('hubot-test-helper');
const helper = new Helper('../scripts/mapping.js');

describe('mappings', function() {
  let room;

  beforeEach(function() {
    room = helper.createRoom();

    room.robot.postgres = global.database;

    room.robot.auth = {
      isAdmin: user => user.name === 'me',
      hasRole: user => user.name === 'me'
    };
  });

  afterEach(function() {
    return room.user.say('me', '@hubot destroymapping foo')
    .then(delay(200))
    .then(() => room.destroy());
  });

  function responses() {
    return room.messages.filter(pair => pair[0] === 'hubot').map(pair => pair[1]);
  }

  function response(expected) {
    return delay()().then(() => {
      if (responses().indexOf(expected) === -1) {
        console.log(room.messages);
        expect.fail('', '', `"${expected}" response not seen.`);
      }
    });
  }

  it('creates a new mapping with !createmapping', function() {
    usesDatabase(this);

    return room.user.say('me', '@hubot createmapping foo')
    .then(() => response('@me mapping foo has been created. :sparkles:'))
    .then(delay(200))
    .then(() => room.user.say('me', '@hubot setfoo @me: words words words'))
    .then(() => response("me's foo has been set to 'words words words'."))
    .then(() => room.user.say('me', '@hubot foo'))
    .then(() => response('words words words'));
  });

  it('specifies the null message with --null', function() {
    usesDatabase(this);

    return room.user.say('me', '@hubot createmapping foo --null="Nothing here."')
    .then(() => response('@me mapping foo has been created. :sparkles:'))
    .then(delay(500))
    .then(() => room.user.say('me', '@hubot foo'))
    .then(() => response('Nothing here.'));
  });

  it('fails if the mapping already exists', function() {
    usesDatabase(this);

    return room.user.say('me', '@hubot createmapping foo')
    .then(delay(200))
    .then(() => room.user.say('me', '@hubot createmapping foo'))
    .then(() => response("There's already a mapping called foo, silly!"))
  });

  it('destroys a mapping with !destroymapping', function() {
    usesDatabase(this);

    return room.user.say('me', '@hubot createmapping foo')
    .then(delay(200))
    .then(() => room.user.say('me', '@hubot destroymapping foo'))
    .then(() => response('@me mapping foo has been destroyed. :fire:'));
  });

  it('is okay to destroy a nonexistent mapping', function() {
    usesDatabase(this);

    return room.user.say('me', '@hubot destroymapping blerp')
    .then(() => response('@me mapping blerp does not exist.'))
  });
});
