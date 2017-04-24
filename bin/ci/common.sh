#!/bin/sh

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
