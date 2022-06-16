#!/bin/bash

set -euo pipefail
source bin/common/all.sh

[ -n "${DATABASE_URL:-}" ] && wait_for_postgres

ADAPTER='-a shellish'
[ -n "${HUBOT_SLACK_TOKEN:-}" ] && ADAPTER='-a slack'

ALIAS="--alias !"
[ "${DISABLE_ALIAS:-}" = "true" ] && ALIAS=

[ -d /usr/src/app/node_modules ] || npm ci

exec /usr/src/app/node_modules/hubot/bin/hubot --name pushbot --disable-httpd ${ALIAS} ${ADAPTER}
