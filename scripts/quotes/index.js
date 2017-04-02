'use strict';

// Entry point for the database-backed "quotefile" management API.

const {DocumentSet} = require('./model');
const Storage = require('./storage');
const commands = require('./commands');
const {Anyone} = require('../roles');

function populateCommand(name, command) {
  if (command === undefined || command === null) {
    return null;
  }

  const populated = Object.assign({}, command);

  if (populated.nullBody === undefined) {
    populated.nullBody = `I don't know any ${name}s that contain that!`;
  }

  if (populated.role === undefined) {
    populated.role = Anyone;
  }

  if (populated.defaultToSelf === undefined) {
    populated.defaultToSelf = false;
  }

  return populated;
}

// Initialize command related to a set of documents based on a spec.
exports.defineDocumentSet = function createDocumentSet(robot, name, commands) {
  const spec = {
    name,
    features: {
      add: populateCommand(name, commands.add),
      set: populateCommand(name, command.set),
      count: populateCommand(name, commands.count),
      stats: populateCommand(name, commands.stat),
      by: populateCommand(name, commands.by),
      about: populateCommand(name, commands.about),
      kov: populateCommand(name, commands.kov)
    }
  };
}
