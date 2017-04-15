// Required first.

const pg = require('pg-promise')();

global.expect = require('chai').expect;
global.database = process.env.DATABASE_URL ? pg(process.env.DATABASE_URL) : null;

global.delay = function(timeoutMs) {
  const timeout = timeoutMs || (database ? 100 : 10);
  return new Promise(resolve => setTimeout(resolve, timeout));
}

global.usesDatabase = function(context, timeoutMs) {
  if (database) {
    const timeout = timeoutMs || 5000;
    context.timeout(timeout);
  } else {
    context.skip();
  }
}
