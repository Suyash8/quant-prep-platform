#!/bin/bash
# Start embedded Postgres 17 (Zonky binaries) on :5433 — survives sandbox recycling.
set -u
export LD_PRELOAD=/home/z/my-project/scripts/qf-fence.so
PGDIST=/home/z/my-project/pgdist/pg
PGDATA=/home/z/my-project/pgdist/data
export LD_LIBRARY_PATH="$PGDIST/lib:${LD_LIBRARY_PATH:-}"

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  "$PGDIST/bin/initdb" -D "$PGDATA" -U qf --auth=trust -E UTF8 >/dev/null
fi

if "$PGDIST/bin/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
  echo "postgres: already running"
else
  "$PGDIST/bin/pg_ctl" -D "$PGDATA" -l /home/z/my-project/pgdist/pg.log \
    -o "-p 5433 -c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp" \
    start >/dev/null 2>&1
  sleep 1
fi

# ensure DB exists (no psql in zonky dist — use single-user mode)
if [ ! -f "$PGDATA/.db-created" ]; then
  echo "CREATE DATABASE quantfoundry;" | \
    "$PGDIST/bin/postgres" --single -D "$PGDATA" postgres >/dev/null 2>&1
  touch "$PGDATA/.db-created"
fi
echo "postgres: up on :5433 db=quantfoundry"
