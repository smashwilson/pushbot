'use strict'

// Dynamically generate message handlers to interact with a document set
// based on a spec.

const util = require('util')
const preprocessors = require('./preprocessor')

exports.generate = function (robot, documentSet, spec) {
  if (spec.features.add !== null) {
    addCommands(robot, documentSet, spec, spec.features.add)
  }

  if (spec.features.set !== null) {
    setCommand(robot, documentSet, spec, spec.features.set)
  }

  if (spec.features.query !== null) {
    queryCommand(robot, documentSet, spec, spec.features.query)
  }

  if (spec.features.all !== null) {
    allCommand(robot, documentSet, spec, spec.features.all)
  }

  if (spec.features.count !== null) {
    countCommand(robot, documentSet, spec, spec.features.count)
  }

  if (spec.features.stats !== null) {
    statsCommand(robot, documentSet, spec, spec.features.stats)
  }

  if (spec.features.by !== null) {
    byQueryCommand(robot, documentSet, spec, spec.features.by)
  }

  if (spec.features.about !== null) {
    aboutQueryCommand(robot, documentSet, spec, spec.features.about)
  }

  if (spec.features.kov !== null) {
    kovCommands(robot.documentSet, spec, spec.features.kov)
  }
}

function errorHandler (msg, error) {
  console.error(error.stack)
  msg.reply(`:boom: Something went wrong!\n\`\`\`\n${error.stack}\n\`\`\`\n`)
}

function addCommands (robot, documentSet, spec, feature) {
  if (feature.helpText) {
    robot.commands.push(...feature.helpText)
  }

  if (!feature.formatter) {
    feature.formatter = (lines, speakers, mentions, userTz) => ({
      body: lines
        .map(line => {
          if (line.isRaw()) {
            return line.text
          } else {
            return `[${line.timestamp.tz('America/New_York').format('h:mm A D MMM YYYY')}] ${line.speaker}: ${line.text}`
          }
        })
        .join('\n'),
      speakers,
      mentions
    })
  }

  const preprocessorNames = Object.keys(preprocessors)
  for (let i = 0; i < preprocessorNames.length; i++) {
    const preprocessorName = preprocessorNames[i]
    const preprocessor = preprocessors[preprocessorName]
    const argumentPattern = preprocessor.argument ? ':\\s*([^]+)' : ''

    if (feature.helpText === undefined) {
      robot.commands.push(
        `hubot ${preprocessorName} ${spec.name}${preprocessor.argument ? ': <source>' : ''} - ` +
        util.format(preprocessor.defaultHelpText, spec.name)
      )
    }

    // "slackapp quote: ..."
    const pattern = new RegExp(`${preprocessorName}\\s+${spec.name}${argumentPattern}\\s*$`)
    robot.respond(pattern, async msg => {
      if (!feature.role.verify(robot, msg)) return

      const submitter = msg.message.user.name
      let body, attributes, processed
      try {
        processed = preprocessor.call(robot, msg)
      } catch (err) {
        msg.reply(`http://sadtrombone.com/\n${err.stack}`)
        return
      }

      try {
        const formatted = feature.formatter(processed.lines, processed.speakers, processed.mentions)

        body = formatted.body
        attributes = []
        for (const value of formatted.speakers) {
          attributes.push({kind: 'speaker', value})
        }
        for (const value of formatted.mentions) {
          attributes.push({kind: 'mention', value})
        }

        const doc = await documentSet.add(submitter, body, attributes)
        preprocessor.echo && msg.send(doc.getBody())

        const count = await documentSet.countMatching([], '')
        const noun = count === 1 ? spec.name : spec.plural
        msg.send(`${count} ${noun} loaded.`)
      } catch (err) {
        errorHandler(msg, err)
      }
    })
  }
}

function setCommand (robot, documentSet, spec, feature) {
  if (feature.helpText) {
    robot.commands.push(...feature.helpText)
  } else {
    robot.commands.push(
      `hubot set${spec.name} <user>: <source> - Set user's ${spec.name} to <source>.`,
      `hubot set${spec.name}: <source> - Set your own ${spec.name} to <source>.`
    )
  }

  const pattern = new RegExp(`set${spec.name}(?:\\s+@?([^:]+))?:\\s*([^]+)$`)
  robot.respond(pattern, async msg => {
    const submitter = msg.message.user.name
    const target = (msg.match[1] || submitter).trim()

    const role = submitter === target ? feature.roleForSelf : feature.roleForOther
    if (!role.verify(robot, msg)) return

    const body = msg.match[2].trim()
    const attribute = {kind: 'subject', value: target}

    try {
      const former = await documentSet.latestMatching({subject: [target]})
      const doc = await documentSet.add(submitter, body, [attribute])
      if (former.wasFound()) {
        msg.send(`${target}'s ${spec.name} has been changed from '${former.getBody()}' to '${doc.getBody()}'.`)
      } else {
        msg.send(`${target}'s ${spec.name} has been set to '${doc.getBody()}'.`)
      }
    } catch (err) {
      errorHandler(msg, err)
    }
  })
}

function queryCommand (robot, documentSet, spec, feature) {
  const pattern = new RegExp(`${spec.name}(\\s+[^]+)?$`)

  if (feature.helpText) {
    robot.commands.push(...feature.helpText)
  }

  if (feature.userOriented) {
    if (!feature.helpText) {
      if (feature.latest) {
        robot.commands.push(
          `hubot ${spec.name} - Return your current ${spec.name}.`,
          `hubot ${spec.name} @<user> - Return <user>'s current ${spec.name}.`,
          `hubot ${spec.name} <query> - Return your most recent ${spec.name} that matches <query>.`,
          `hubot ${spec.name} @<user> <query> - Return <user>'s most recent ${spec.name} that matches <query>.`
        )
      } else {
        robot.commands.push(
          `hubot ${spec.name} - Return one of your ${spec.plural} at random.`,
          `hubot ${spec.name} @<user> - Return one of <user>'s ${spec.plural} at random.`,
          `hubot ${spec.name} <query> - Return one of your ${spec.plural} that matches <query>.`,
          `hubot ${spec.name} @<user> <query> - Return one of <user>'s ${spec.plural} that matches <query>.`
        )
      }
    }

    robot.respond(pattern, async msg => {
      const requester = msg.message.user.name
      const input = (msg.match[1] || '').trim()

      let query = ''
      let subject = ''

      const usernameMatch = /^@?(\S+)\b/.exec(input)
      if (usernameMatch) {
        subject = usernameMatch[1]
        query = input.substring(usernameMatch[0].length)
      } else {
        subject = msg.message.user.name
        query = input
      }

      const role = requester === subject ? feature.roleForSelf : feature.roleForOther
      if (!role.verify(robot, msg)) return

      try {
        const doc = feature.latest
          ? await documentSet.latestMatching({subject: [subject]}, query)
          : await documentSet.randomMatching({subject: [subject]}, query)
        msg.send(doc.getBody())
      } catch (err) {
        errorHandler(msg, err)
      }
    })
  } else {
    if (!feature.helpText) {
      robot.commands.push(
        `hubot ${spec.name} - Return a ${spec.name} at random.`,
        `hubot ${spec.name} <query> - Return a ${spec.name} that matches <query>.`
      )
    }

    robot.respond(pattern, async msg => {
      if (!feature.role.verify(robot, msg)) return

      const query = msg.match[1] || ''

      try {
        const doc = feature.latest
          ? await documentSet.latestMatching({}, query)
          : await documentSet.randomMatching({}, query)
        msg.send(doc.getBody())
      } catch (err) {
        errorHandler(msg, err)
      }
    })
  }
}

function allCommand (robot, documentSet, spec, feature) {
  const pattern = new RegExp(`all${spec.plural}(\\s+[^]+)?$`)

  if (feature.helpText) {
    robot.commands.push(...feature.helpText)
  }

  if (feature.userOriented) {
    if (!feature.helpText) {
      robot.commands.push(
        `hubot all${spec.plural} - Return all of your ${spec.plural}.`,
        `hubot all${spec.plural} @<user> - Return all of <user>'s ${spec.plural}.`,
        `hubot all${spec.plural} <query> - Return all of your ${spec.plural} that match <query>.`,
        `hubot all${spec.plural} @<user> <query> - Return <user>'s ${spec.plural} that match <query>.`
      )
    }

    robot.respond(pattern, async msg => {
      const requester = msg.message.user.name
      const input = (msg.match[1] || '').trim()

      let query = ''
      let subject = ''

      const usernameMatch = /^@?(\S+)\b/.exec(input)
      if (usernameMatch) {
        subject = usernameMatch[1]
        query = input.substring(usernameMatch[0].length)
      } else {
        subject = msg.message.user.name
        query = input
      }

      const role = requester === subject ? feature.roleForSelf : feature.roleForOther
      if (!role.verify(robot, msg)) return

      try {
        const {documents} = await documentSet.allMatching({subject: [subject]}, query)
        msg.send(documents.map(doc => doc.getBody()).join(feature.separator || ', '))
      } catch (err) {
        errorHandler(msg, err)
      }
    })
  } else {
    if (!feature.helpText) {
      robot.commands.push(
        `hubot all${spec.plural} - Return all ${spec.plural}.`,
        `hubot all${spec.plural} <query> - Return all ${spec.plural} that match <query>.`
      )
    }

    robot.respond(pattern, async msg => {
      if (!feature.role.verify(robot, msg)) return

      const query = msg.match[1] || ''

      try {
        const {documents} = await documentSet.allMatching({}, query)
        msg.send(documents.map(doc => doc.getBody()).join(feature.separator || ', '))
      } catch (err) {
        errorHandler(msg, err)
      }
    })
  }
}

function attributeQuery (robot, documentSet, spec, feature, patternBase, attrKind) {
  robot.commands.push(...feature.helpText)

  const pattern = new RegExp(`${patternBase}\\s+(\\S+)\\s*([^]+)?$`, 'i')

  robot.respond(pattern, async msg => {
    if (!feature.role.verify(robot, msg)) return

    const subjects = msg.match[1]
      .split(/\+/)
      .map(subject => subject.replace(/^@/, ''))
    const attributes = {[attrKind]: subjects}
    const query = msg.match[2] || ''

    try {
      const doc = await documentSet.randomMatching(attributes, query)
      msg.send(doc.getBody())
    } catch (err) {
      errorHandler(msg, err)
    }
  })
}

function byQueryCommand (robot, documentSet, spec, feature) {
  if (!feature.helpText) {
    feature.helpText = [
      `hubot ${spec.name}by @<user> - Random ${spec.name} in which <user> speaks.`,
      `hubot ${spec.name}by @<user1+user2...> - A ${spec.name} spoken by all users.`,
      `hubot ${spec.name}by @<user> <query> - A ${spec.name} by <user> that matches <query>.`
    ]
  }

  attributeQuery(robot, documentSet, spec, feature, `${spec.name}by`, 'speaker')
}

function aboutQueryCommand (robot, documentSet, spec, feature) {
  if (!feature.helpText) {
    feature.helpText = [
      `hubot ${spec.name}about @<user> - Random ${spec.name} that mentions <user>.`,
      `hubot ${spec.name}about @<user1+user2...> - A ${spec.name} that mentions by all users.`,
      `hubot ${spec.name}about @<user> <query> - A ${spec.name} mentioning <user> that matches <query>.`
    ]
  }

  attributeQuery(robot, documentSet, spec, feature, `${spec.name}about`, 'mention')
}

function countCommand (robot, documentSet, spec, feature) {
  if (feature.helpText) {
    robot.commands.push(...feature.helpText)
  } else {
    robot.commands.push(
      `hubot ${spec.name}count - Total number of ${spec.plural}.`,
      `hubot ${spec.name}count <query> - Number of ${spec.plural} matching <query>.`
    )
  }

  const pattern = new RegExp(`${spec.name}count(\\s+[^]+)?$`, 'i')

  robot.respond(pattern, async msg => {
    if (!feature.role.verify(robot, msg)) return

    const query = msg.match[1] || ''
    const hasQuery = query.trim().length > 0

    try {
      const count = await documentSet.countMatching({}, query)
      const verb = count === 1 ? 'is' : 'are'
      const noun = count === 1 ? spec.name : spec.plural
      const matching = hasQuery ? ` matching \`${query.trim()}\`` : ''

      msg.reply(`there ${verb} ${count} ${noun}${matching}.`)
    } catch (err) {
      errorHandler(msg, err)
    }
  })
}

function statsCommand (robot, documentSet, spec, feature) {
  if (feature.helpText) {
    robot.commands.push(...feature.helpText)
  } else {
    robot.commands.push(
      `hubot ${spec.name}stats - See who has the most ${spec.plural}.`,
      `hubot ${spec.name}stats <user> - See the number of ${spec.plural} attributed to <user>.`
    )
  }

  const pattern = new RegExp(`${spec.name}stats(?:\\s+@?(\\S+))?\\s*$`, 'i')
  robot.respond(pattern, async msg => {
    if (!feature.role.verify(robot, msg)) return

    const target = msg.match[1] || ''
    const hasTarget = target.trim().length > 0

    try {
      const table = await documentSet.getUserStats(['speaker', 'mention'])
      if (hasTarget) {
        const stat = table.getStats().find(stat => stat.getUsername() === target)
        if (stat === undefined) {
          msg.send(`${target} has no ${spec.plural} at all. The shame!`)
          return
        }

        const plural = countStr => `*${countStr}* ${countStr === '1' ? spec.name : spec.plural}`

        msg.send(`${target} is *#${stat.getRank()}*, having spoken in ${plural(stat.getSpokenCount())} ` +
          `and being mentioned in *${stat.getMentionCount()}*.`)
      } else {
        let output = '```\n'

        const usernameHeader = 'Username'
        const usernameColumnWidth = Math.max(table.longestUsername, usernameHeader.length) + 1

        const spokeHeader = 'Spoke'
        const spokeColumnWidth = Math.max(table.longestSpoken, spokeHeader.length) + 1

        const mentionHeader = 'Mentioned'
        const mentionColumnWidth = Math.max(table.longestMention, mentionHeader.length) + 1

        output += `${table.pad(usernameHeader, usernameColumnWidth)}| `
        output += `${table.pad(spokeHeader, spokeColumnWidth)}| `
        output += `${mentionHeader}\n`
        output += ('-'.repeat(usernameColumnWidth + spokeColumnWidth + mentionColumnWidth + 3)) + '\n'

        for (const stat of table.getStats()) {
          output += `${stat.getUsername(usernameColumnWidth)}| `
          output += `${stat.getSpokenCount(spokeColumnWidth)}| `
          output += `${stat.getMentionCount()}\n`
        }

        output += '```\n'
        msg.send(output)
      }
    } catch (err) {
      errorHandler(msg, err)
    }
  })
}

function kovCommands (robot, documentSet, spec, feature) {
  //
}
