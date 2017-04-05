// Required first.

const pg = require('pg-promise')();

global.expect = require('chai').expect;
global.database = process.env.DATABASE_URL ? pg(process.env.DATABASE_URL) : null;
