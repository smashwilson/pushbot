@echo off

docker-compose --project-name pushbot-tests run --entrypoint /usr/src/app/bin/ci/test --rm pushbot
