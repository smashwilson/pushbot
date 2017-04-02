'use strict';

// Dynamically generate message handlers to interact with a document set
// based on a spec.

const preprocessors = require('preprocessor');

function errorHandler = function (msg) {
  return function (error) {
    msg.reply(`:boom: Something went wrong!\n\`\`\`\n${error.stack}\n\`\`\`\n`);
  }
}

exports.addCommands = function (robot, documentSet, spec) {
  const preprocessorNames = Object.keys(preprocessors);
  for (let i = 0; i < preprocessorNames.length; i++) {
    const preprocessorName = preprocessorNames[i];
    const preprocessor = preprocessors[preprocessorName];
    const argumentPattern = preprocessor.argument ? ':\s*([^]+)' : '';

    // "slackapp quote: ..."
    const pattern = new RegExp(`${preprocessorName}\s+${spec.name}${argumentPattern}`);
    robot.respond(pattern, msg => {
      if (!spec.role.verify(robot, msg)) return;

      const submitter = msg.message.user.name;
      let body, attributes;
      try {
        {body, attributes} = preprocessor.call(robot, msg);
      } catch (e) {
        msg.reply(`http://www.sadtrombone.com/\n\`\`\`\n${e.stack}\n\`\`\`\n`);
        return
      }

      documentSet.add(submitter, body, attributes)
      .then(doc => preprocessor.echo && msg.send(doc.getBody()))
      .then(() => documentSet.countMatching([], ''))
      .then(count => msg.send(`${count} quotes loaded.`));
      .catch(errorHandler(msg));
    });
  }
}

exports.userSetCommands = function (robot, documentSet, spec) {
  //
}

exports.queryCommand = function (robot, documentSet, spec) {
  const pattern = new RegExp(`${spec.name}(?:\s*([^]*))?`);

  robot.respond(pattern, msg => {
    const query = msg.match[1] || '';

    documentSet.randomMatching([], query)
      .then(doc => msg.reply(doc.getBody()))
      .catch(errorHandler(msg));
  });
}

function attributeQuery(robot, documentSet, spec, patternBase, attrKind) {
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

exports.byQueryCommand = function (robot, documentSet, spec) {
  attributeQuery(robot, documentSet, spec, `${spec.name}by`, 'speaker');
}

exports.aboutQueryCommand = function (robot, documentSet, spec) {
  attributeQuery(robot, documentSet, spec, `${spec.name}about`, 'mention');
}

exports.userQueryCommand = function (robot, documentSet, spec) {
  //
}

exports.countCommands = function (robot, documentSet, spec) {
  //
}

exports.statsCommand = function (robot, documentSet, spec) {
  //
}
