FROM node:7.9-alpine
LABEL maintainer "Ash Wilson <smashwilson@gmail.com>"

RUN npm install -g coffee-script
RUN adduser -s /bin/false -D -H pushbot
RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app
ADD package.json /usr/src/app/package.json
RUN npm install .
ADD . /usr/src/app
RUN chown -R pushbot:pushbot /usr/src/app

USER pushbot
ENTRYPOINT ["/usr/src/app/node_modules/.bin/hubot", "-a", "slack"]
