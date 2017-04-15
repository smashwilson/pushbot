'use strict';

// Dynamically generate message handlers to interact with a document set
// based on a spec.

const preprocessors = require('./preprocessor');

exports.generate = function(robot, documentSet, spec) {
  if (spec.features.add !== null) {
    addCommands(robot, documentSet, spec, spec.features.add);
  }

  if (spec.features.set !== null) {
    setCommand(robot, documentSet, spec, spec.features.set);
  }

  if (spec.features.query !== null) {
    queryCommand(robot, documentSet, spec, spec.features.query);
  }

  if (spec.features.count !== null) {
    countCommand(robot, documentSet, spec, spec.features.count);
  }

  if (spec.features.stats !== null) {
    statsCommand(robot, documentSet, spec, spec.features.stats);
  }

  if (spec.features.by !== null) {
    byQueryCommand(robot, documentSet, spec, spec.features.by);
  }

  if (spec.features.about !== null) {
    aboutQueryCommand(robot, documentSet, spec, spec.features.about);
  }

  if (spec.features.kov !== null) {
    kovCommands(robot.documentSet, spec, spec.features.kov);
  }
}

function errorHandler(msg) {
  return function (error) {
    console.log(error.stack);
    msg.reply(`:boom: Something went wrong!\n\`\`\`\n${error.stack}\n\`\`\`\n`);
  }
}

function addCommands(robot, documentSet, spec, feature) {
  const preprocessorNames = Object.keys(preprocessors);
  for (let i = 0; i < preprocessorNames.length; i++) {
    const preprocessorName = preprocessorNames[i];
    const preprocessor = preprocessors[preprocessorName];
    const argumentPattern = preprocessor.argument ? ':\\s*([^]+)' : '';

    // "slackapp quote: ..."
    const pattern = new RegExp(`${preprocessorName}\\s+${spec.name}${argumentPattern}`);
    robot.respond(pattern, msg => {
      if (!feature.role.verify(robot, msg)) return;

      const submitter = msg.message.user.name;
      let body, attributes;
      try {
        const result = preprocessor.call(robot, msg);
        body = result.body;
        attributes = result.attributes;
      } catch (e) {
        msg.reply(`http://www.sadtrombone.com/\n\`\`\`\n${e.stack}\n\`\`\`\n`);
        return
      }

      documentSet.add(submitter, body, attributes)
      .then(() => { return Promise.reject(new Error('boom')) })
      .then(doc => preprocessor.echo && msg.send(doc.getBody()))
      .then(() => documentSet.countMatching([], ''))
      .then(count => {
        const noun = count === 1 ? spec.name : spec.plural;
        msg.send(`${count} ${noun} loaded.`);
      })
      .catch(errorHandler(msg));
    });
  }
}

function setCommand(robot, documentSet, spec, feature) {
  const pattern = new RegExp(`set${spec.name}(?:\\s+@?([^:]+))?:\\s*([^]+)`);
  robot.respond(pattern, msg => {
    const submitter = msg.message.user.name;
    const target = (msg.match[1] || submitter).trim();

    if (submitter === target) {
      if (!feature.roleForSelf.verify(robot, msg)) return;
    } else {
      if (!feature.roleForOther.verify(robot, msg)) return;
    }

    const body = msg.match[2].trim();
    const attribute = {kind: 'subject', value: target};

    return documentSet.deleteMatching({subject: [target]})
    .then(() => documentSet.add(submitter, body, [attribute]))
    .then(doc => msg.send(`${target}'s ${spec.name} has been set to '${doc.getBody()}'.`))
    .catch(errorHandler(msg));
  });
}

function queryCommand(robot, documentSet, spec, feature) {
  const pattern = new RegExp(`${spec.name}(?:\s*([^]*))?`);

  robot.respond(pattern, msg => {
    if (!feature.role.verify(robot, msg)) return;

    const query = msg.match[1] || '';

    documentSet.randomMatching([], query)
      .then(doc => msg.reply(doc.getBody()))
      .catch(errorHandler(msg));
  });
}

function attributeQuery(robot, documentSet, spec, feature, patternBase, attrKind) {
  const pattern = new RegExp(`${patternBase}\s+(\S+)(?:\s+([^]+))?`);

  robot.respond(pattern, msg => {
    const subjects = msg.match[1]
      .split(/\+/)
      .map(subject => subject.replace(/^@/, ''));
    const attributes = {[attrKind]: subjects};
    const query = msg.match[2] || '';

    documentSet.randomMatching(attributes, query)
      .then(doc => msg.reply(doc.getBody()))
      .catch(errorHandler(msg));
  });
}

function byQueryCommand(robot, documentSet, spec, feature) {
  attributeQuery(robot, documentSet, spec, feature, `${spec.name}by`, 'speaker');
}

function aboutQueryCommand(robot, documentSet, spec, feature) {
  attributeQuery(robot, documentSet, spec, feature, `${spec.name}about`, 'mention');
}

function countCommands(robot, documentSet, spec, feature) {
  //
}

function statsCommand(robot, documentSet, spec, feature) {
  //
}

function kovCommands(robot, documentSet, spec, feature) {
  //
}
