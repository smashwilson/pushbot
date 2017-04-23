// Description:
//   Maintain arbitrary sets of username => text mappings.

const {createDocumentSet} = require('./documentset');
const {MapMaker} = require('./roles');

const mappings = new Map();

module.exports = function(robot) {
  function loadMapping(name, options) {
    if (mappings.has(name)) {
      throw new Error(`There's already a mapping called ${name}, silly!`);
    }

    const ds = createDocumentSet(robot, name, {
      set: {
        role: MapMaker,
        userOriented: true,
      },
      query: {
        userOriented: true,
      },
      nullBody: options.nullBody
    });

    mappings.set(name, {
      documentSet: ds,
      options
    });
  }

  function createMapping(name, options) {
    loadMapping(name, options);

    const payload = {};
    for (const [name, {options}] of mappings) {
      payload[name] = options;
    }
    robot.brain.set('mappingMeta', payload);
  }

  robot.on('brainReady', () => {
    const payload = robot.brain.get('mappingMeta') || {};
    for (const name in payload) {
      loadMapping(name, payload[name]);
    }
  });

  robot.respond(/setupmapping\s+(\S+)([^]+)?/, msg => {
    const name = msg.match[1];
    const argList = msg.match[2];

    const options = {};

    const nullBodyMatch = /--null="([^"]+)"/.exec(argList);
    if (nullBodyMatch) {
      options.nullBody = nullBodyMatch[1];
    }

    createMapping(name, options);

    msg.reply(`Mapping ${name} has been created. :sparkles:`);
  });
}
