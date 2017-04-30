#!/bin/bash

export IMAGE_BASE="quay.io/smashwilson/pushbot"

BRANCH=
if [ "${TRAVIS_PULL_REQUEST:-}" = "false" ]; then
  if [ "${TRAVIS_BRANCH:-}" = "master" ]; then
    BRANCH="latest"
  else
    BRANCH="${TRAVIS_BRANCH:-}"
  fi
else
  BRANCH="pr${TRAVIS_PULL_REQUEST}"
fi

export IMAGE_TAG="${IMAGE_BASE}:${BRANCH}"

wait_for_postgres()
{
  TRIES=120
  while [ ${TRIES} -gt 0 ]; do
    printf '[%03d] Attempting PostgreSQL connection: ' ${TRIES}
    if psql --quiet --command='SELECT 1;' --no-password "${DATABASE_URL}" ; then
      printf "<hacker voice> I'm in\n"
      return 0
    fi

    printf 'no\n'
    sleep 0.5
  done
  printf 'Unable to connect to PostgreSQL.\n' >/dev/stderr
  return 1
}
