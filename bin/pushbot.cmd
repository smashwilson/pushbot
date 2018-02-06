@echo off

IF "%DEV_USERNAME%" == "" (SET DEV_USERNAME=%USER%)
set HUBOT_AUTH_ADMIN=1

docker-compose run --service-ports pushbot
