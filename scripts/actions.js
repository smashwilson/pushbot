// Description:
//   Respond to "/me text text text" in Slack identically to "_text text text_"

const {SlackTextMessage} = require("hubot-slack/src/message");

module.exports = function (robot) {
  const adapter = robot.adapter;
  const client = adapter.client;

  // Only register when we're using the Slack client
  if (client && client.onEvent) {
    previousHandler = client.eventHandler;
    client.onEvent(function (event) {
      const {user, channel} = event;

      if (event.type === "message" && event.subtype === "me_message") {
        robot.logger.debug(
          `Received /me message in channel: ${channel}, from ${user.id} (human)`
        );

        user.room = channel || "";
        event.text = `_${event.text}_`;

        SlackTextMessage.makeSlackTextMessage(
          user,
          undefined,
          undefined,
          event,
          channel,
          robot.name,
          robot.alias,
          client,
          (error, message) => {
            if (error) {
              robot.logger.error(
                `Dropping message due to error ${error.message}`
              );
            } else {
              adapter.receive(message);
            }
          }
        );

        return;
      }

      previousHandler(event);
    });
  }
};
