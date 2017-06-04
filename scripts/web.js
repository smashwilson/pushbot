// Description:
//   Entrypoint for the web API.

const express = require('express')
const request = require('request')

const PORT = 8080
const MAGICAL_WEAK_SPOT_TOKEN = process.env.MAGICAL_WEAK_SPOT_TOKEN || 'ni'
const PRIOR_ADDRESSES = (process.env.PRIOR_ADDRESSES || '')
  .split(/,/)
  .filter(address => address.length > 0)
const PRIOR_SCHEME = process.env.PRIOR_SCHEME || 'https'
const PRIOR_PORT = parseInt(process.env.PRIOR_PORT || '443')

class Status {
  constructor () {
    this.database = 'pending'
    this.stonith = 'pending'

    this.killed = false

    this.databasePromise = new Promise((resolve, reject) => {
      this.databaseCallbacks = {resolve, reject}
    })

    this.stonithPromise = new Promise((resolve, reject) => {
      this.stonithCallbacks = {resolve, reject}
    })
  }

  databaseReady () {
    this.database = 'ok'
    this.databaseCallbacks.resolve()
  }

  databaseFailed () {
    this.database = 'error'
    this.databaseCallbacks.reject()
  }

  stonithReady () {
    this.stonith = 'ok'
    this.stonithCallbacks.resolve()
  }

  stonithFailed () {
    this.stonith = 'failed'
    this.stonithCallbacks.reject()
  }

  onlinePromise () {
    return Promise.all([this.databasePromise, this.stonithPromise])
  }

  kill () {
    this.killed = true
  }

  summarize () {
    let overall = 'pending'

    if (this.killed) {
      overall = 'killed'
    } else if (this.database === 'ok' && this.stonith === 'ok') {
      overall = 'ok'
    }

    return {
      database: this.database,
      stonith: this.stonith,
      status: overall
    }
  }
}

module.exports = function (robot) {
  const app = express()

  let accepting = PRIOR_ADDRESSES.length === 0

  robot.receiveMiddleware((context, next, done) => {
    if (!accepting) {
      done()
      return
    }

    next(done)
  })

  const status = new Status()

  status.onlinePromise().then(() => {
    accepting = true
    robot.logger.debug('All system operational.')
  }, err => {
    robot.logger.error(`Oh no unable to launch properly:\n${err}`)
    process.exit(1)
  })

  const databaseCheck = () => {
    robot.postgres.any('SELECT 1;').then(() => {
      status.databaseReady()
      robot.logger.debug('Connected to database.')
    }, err => {
      status.databaseFailed()
      robot.logger.error(`Unable to connect to database:\n${err}`)
    })
  }

  if (robot.postgres) {
    databaseCheck()
  } else {
    robot.on('database-up', databaseCheck)
  }

  Promise.all(
    PRIOR_ADDRESSES.map(addr => new Promise(resolve => {
      robot.logger.debug(`Terminating prior instance at ${addr}.`)
      request({
        url: `${PRIOR_SCHEME}://${addr}:${PRIOR_PORT}/magical-weak-spot`,
        method: 'DELETE',
        agentOptions: {
          checkServerIdentity (servername, cert) {
            const altNames = cert.subjectaltname
            if (!altNames) {
              return new Error(`Invalid certificate for ${addr}: certificate contains not SANs`)
            }

            for (const name of altNames.split(', ')) {
              if (name === 'DNS:api.pushbot.party') {
                return undefined
              }
            }

            return new Error(`Invalid certificate for ${addr}: ${altNames}`)
          }
        },
        headers: {'x-token': MAGICAL_WEAK_SPOT_TOKEN},
        timeout: 30
      }, (error, response, body) => {
        if (error) {
          robot.logger.warning(`Error when trying to terminate pre-existing bot at ${addr}:\n${error}`)
        }

        if (response && response.statusCode !== 200) {
          robot.logger.warning(`Unable to terminate pre-existing bot at ${addr}:\n${body}`)
        }

        resolve()
      })
    }))
  ).then(() => {
    robot.logger.debug('All prior instances terminated.')
    status.stonithReady()
  }, err => {
    robot.logger.error(`Unable to terminate prior instances.\n${err}`)
    status.stonithFailed()
  })

  app.get('/healthz', (req, res) => {
    res.json(status.summarize())
  })

  app.delete('/magical-weak-spot', (req, res) => {
    res.set('Content-Type', 'text/plain')

    if (req.headers['x-token'] !== MAGICAL_WEAK_SPOT_TOKEN) {
      robot.logger.debug('Rejecting magical weak spot trigger with incorrect token.')
      res.status(403).send('no')
      return
    }

    accepting = false
    status.kill()

    robot.logger.info('Magical weak spot triggered. Entering quiet mode.')
    res.send('ok')
  })

  app.listen(PORT, () => {
    robot.logger.debug(`Web API is listening on port ${PORT}.`)
  })
}
