#!/bin/bash

wait_for_postgres()
{
  TRIES=120
  while [ ${TRIES} -gt 0 ]; do
    printf '[%03d] Attempting PostgreSQL connection: ' ${TRIES}
    if psql --quiet --command='SELECT 1;' --no-password "${PUSHBOT_DATABASE_URL}" >/dev/null 2>/dev/null ; then
      printf "<hacker voice> I'm in\n"
      return 0
    fi

    printf 'no\n'
    sleep 0.5
    (( TRIES-- ))
  done
  printf 'Unable to connect to PostgreSQL.\n' >/dev/stderr
  return 1
}
