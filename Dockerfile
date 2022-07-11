FROM node:18.5.0-alpine
LABEL maintainer "Ash Wilson <smashwilson@gmail.com>"

ENV NPM_CONFIG_LOGLEVEL warn

RUN apk add --no-cache bash postgresql-client
RUN npm install -g coffee-script
RUN mkdir -p /usr/src/app
RUN adduser -s /bin/false -D pushbot

WORKDIR /usr/src/app
ADD package.json /usr/src/app/package.json
ADD package-lock.json /usr/src/app/package-lock.json
RUN npm ci .
ADD . /usr/src/app
RUN chown -R pushbot:pushbot /usr/src/app

USER pushbot
ENTRYPOINT ["/usr/src/app/bin/container/entrypoint.sh"]
