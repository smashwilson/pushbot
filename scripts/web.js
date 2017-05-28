// Description:
//   Entrypoint for the web API.

const express = require('express');
const PORT = 8080;

module.exports = function (robot) {
  const app = express();

  app.get('/healthz', (req, res) => {
    res.json({status: 'ok'});
  });

  app.listen(PORT, () => {
    robot.logger.debug(`Web API is listening on port ${PORT}.`);
  });
}
