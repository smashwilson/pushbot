#!/bin/bash

set -euo pipefail
source bin/common/all.sh

[ -n "${DATABASE_URL:-}" ] && wait_for_postgres

ADAPTER=
[ -n "${HUBOT_SLACK_TOKEN:-}" ] && ADAPTER='-a slack'

ALIAS=
[ "${DISABLE_ALIAS:-}" = "true" ] || ALIAS="--alias '!'"

exec /usr/src/app/node_modules/.bin/hubot --name pushbot --disable-httpd ${ALIAS} ${ADAPTER}
