#!/bin/bash

set -euo pipefail
source bin/common/all.sh

wait_for_postgres

exec /usr/src/app/node_modules/.bin/hubot --alias '!' -a slack
