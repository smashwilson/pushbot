// Description:
//   Maintain arbitrary sets of username => text mappings.

const { parseArguments } = require('./helpers')

const { createDocumentSet } = require('./documentset')
const { MapMaker, withName } = require('./roles')

const mappings = new Map()

module.exports = function (robot) {
  function persistMappings () {
    const payload = {}
    for (const [name, { options }] of mappings) {
      payload[name] = options
    }
    robot.brain.set('mappingMeta', payload)
  }

  function loadMapping (name, options) {
    if (mappings.has(name)) {
      throw new Error(`There's already a mapping called ${name}, silly!`)
    }

    const ds = createDocumentSet(robot, name, {
      set: {
        roleForSelf: withName(options.roleOwn),
        roleForOther: withName(options.roleOther),
        userOriented: true
      },
      query: {
        userOriented: true
      },
      nullBody: options.null
    })

    mappings.set(name, {
      documentSet: ds,
      options
    })
  }

  function createMapping (name, options) {
    loadMapping(name, options)
    persistMappings()
  }

  robot.on('brainReady', () => {
    const payload = robot.brain.get('mappingMeta') || {}
    for (const name in payload) {
      loadMapping(name, payload[name])
    }
  })

  robot.respond(/createmapping\s+([^]+)/, async msg => {
    if (!MapMaker.verify(robot, msg)) { return }

    const args = await parseArguments(msg, msg.match[1], yargs => {
      return yargs.usage('!createmapping <name> [options]')
        .option('null', {
          describe: 'Response when no <name> has been set',
          type: 'string'
        })
        .option('role-own', {
          describe: 'Role required to set your own <name>',
          type: 'string'
        })
        .option('role-other', {
          describe: 'Role required to set a <name> for others',
          type: 'string'
        })
        .help()
    })
    const name = args._[0]
    if (!name) {
      msg.reply('You must specify a <name> for the mapping.')
      return
    }

    try {
      createMapping(name, args)
      msg.reply(`mapping ${name} has been created. :sparkles:`)
    } catch (e) {
      msg.send(e.message)
    }
  })

  robot.respond(/changemapping\s+([^]+)/, async msg => {
    if (!MapMaker.verify(robot, msg)) { return }

    const args = await parseArguments(msg, msg.match[1], yargs => {
      return yargs.usage('!changemapping <name> [options]')
        .option('null', {
          describe: 'Response when no <name> has been set',
          type: 'string'
        })
        .option('role-own', {
          describe: 'Role required to set your own <name>',
          type: 'string'
        })
        .option('role-other', {
          describe: 'Role required to set a <name> for others',
          type: 'string'
        })
        .help()
    })
    const name = args._[0]
    if (!name) {
      msg.reply('You must specify the name of an existing mapping.')
      return
    }

    if (!mappings.has(name)) {
      msg.reply(`I don't know of a mapping called "${name}".`)
      return
    }

    const { documentSet, options } = mappings.get(name)

    if (args.null) {
      documentSet.change({ nullBody: args.null })
      options.null = args.null
    }

    if (args.roleOwn) {
      options.roleOwn = args.roleOwn
      documentSet.spec.features.set.roleForSelf = withName(args.roleOwn)
    }

    if (args.roleOther) {
      options.roleOther = args.roleOther
      documentSet.spec.features.set.roleForOther = withName(args.roleOther)
    }
    persistMappings()
    msg.send(`Mapping ${name} changed. :party-corgi:`)
  })

  robot.respond(/destroymapping\s+(\S+)/, msg => {
    if (!MapMaker.verify(robot, msg)) { return }

    const name = msg.match[1]
    const data = mappings.get(name)
    if (!data) {
      msg.reply(`mapping ${name} does not exist.`)
      return
    }

    return data.documentSet.destroy()
      .then(() => mappings.delete(name))
      .then(() => msg.reply(`mapping ${name} has been destroyed. :fire:`))
  })
}
