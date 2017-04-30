#!/bin/bash

set -euo pipefail
source bin/common/all.sh

[ -n "${DATABASE_URL:-}" ] && wait_for_postgres

ADAPTER=
[ -n "${HUBOT_SLACK_TOKEN:-}" ] && ADAPTER='-a slack'

exec /usr/src/app/node_modules/.bin/hubot --name pushbot --alias '!' ${ADAPTER}
