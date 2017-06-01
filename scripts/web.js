// Description:
//   Entrypoint for the web API.

const express = require('express');
const request = require('request');

const PORT = 8080;
const MAGICAL_WEAK_SPOT_TOKEN = process.env.MAGICAL_WEAK_SPOT_TOKEN || 'ni';
const PRIOR_IP_ADDRESSES = (process.env.PRIOR_IP_ADDRESSES || '')
  .split(/,/)
  .filter(address => address.length > 0);

module.exports = function (robot) {
  const app = express();

  let accepting = PRIOR_IP_ADDRESSES.length === 0;
  let killed = false;

  robot.receiveMiddleware((context, next, done) => {
    if (!accepting) {
      done();
      return;
    }

    next(done);
  });

  const subsystems = {
    slack: false,
    database: false,
    stonith: PRIOR_IP_ADDRESSES.length === 0
  };

  robot.on('connected', () => {
    robot.logger.debug('Connected to Slack.');
    subsystems.slack = true;

    robot.getDatabase().none('SELECT 1;').then(() => {
      subsystems.database = true;
      robot.logger.debug('Connected to database.');
    });
  });

  Promise.all(
    PRIOR_IP_ADDRESSES.map(addr => new Promise(resolve => {
      robot.logger.debug(`Terminating prior instance at ${addr}.`);
      request({
        url: `https://${addr}:${PORT}/magical-weak-spot`,
        method: 'DELETE',
        agentOptions: {
          checkServerIdentity(servername, cert) {
            const altNames = cert.subjectaltname;
            if (!altNames) {
              return new Error(`Invalid certificate for ${addr}: certificate contains not SANs`);
            }

            for (const name of altNames.split(', ')) {
              if (name === 'DNS:api.pushbot.party') {
                return undefined;
              }
            }

            return new Error(`Invalid certificate for ${addr}: ${altNames}`);
          }
        },
        headers: {'x-token': MAGICAL_WEAK_SPOT_TOKEN},
        timeout: 30
      }, (error, response, body) => {
        if (error || response.statusCode !== 200) {
          robot.logger.error(`Unable to terminate pre-existing bot at ${addr}:\n${body}`);
        }

        resolve();
      })
    }))
  ).then(() => {
    robot.logger.debug('All prior instances terminated.');
    subsystems.stonith = true;
  });

  app.get('/healthz', (req, res) => {
    const result = {};

    let allOk = true;
    for (const subsystem of Object.keys(subsystems)) {
      allOk = allOk && subsystems[subsystem];
      result[subsystem] = subsystems[subsystem] ? 'ok' : 'pending';
    }

    if (killed) {
      result.status = 'killed';
    } else if (allOk) {
      result.status = 'ok';
    } else {
      result.status = 'pending';
    }

    res.json(result);
  });

  app.delete('/magical-weak-spot', (req, res) => {
    res.set('Content-Type', 'text/plain');

    if (req.headers['x-token'] !== MAGICAL_WEAK_SPOT_TOKEN) {
      robot.logger.debug('Rejecting magical weak spot trigger with incorrect token.');
      res.status(403).send('no');
      return;
    }

    accepting = false;
    killed = true;

    robot.logger.info('Magical weak spot triggered. Entering quiet mode.');
    res.send('ok');
  });

  app.listen(PORT, () => {
    robot.logger.debug(`Web API is listening on port ${PORT}.`);
  });
}
