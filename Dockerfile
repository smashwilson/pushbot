FROM node:7.9-alpine
LABEL maintainer "Ash Wilson <smashwilson@gmail.com>"

RUN apk add --no-cache bash postgresql-client
RUN npm install -g coffee-script
RUN adduser -s /bin/false -D -H pushbot
RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app
ADD package.json /usr/src/app/package.json
RUN npm install .
ADD . /usr/src/app
RUN chown -R pushbot:pushbot /usr/src/app

USER pushbot
ENTRYPOINT /usr/src/app/bin/container/entrypoint.sh
