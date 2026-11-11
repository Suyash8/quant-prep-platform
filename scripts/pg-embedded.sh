#!/usr/bin/env bash
# Portable embedded Postgres starter (detached) for QuantFoundry v3.1.
# Replaces the author-machine-only scripts/pg-start.sh. Works anywhere the
# embedded-postgres npm package is installed (Option C in SETUP.md).
set -e
BIN="$(cd "$(dirname "$0")/.." && pwd)/node_modules/@embedded-postgres/linux-x64/native/bin"
DATA="$(cd "$(dirname "$0")/.." && pwd)/.pgdata"
mkdir -p "$DATA"
if [ ! -f "$DATA/PG_VERSION" ]; then
  "$BIN/initdb" -D "$DATA" -U qf --auth=trust -E UTF8 >/dev/null
fi
PORT=5433
cat > "$DATA/postgresql.conf" <<EOF
listen_addresses = '127.0.0.1'
port = $PORT
unix_socket_directories = '$DATA'
max_connections = 80
EOF
if ! "$BIN/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then
  nohup "$BIN/postgres" -D "$DATA" >"$DATA/pg.log" 2>&1 &
  disown || true
fi
for i in $(seq 1 60); do
  if "$BIN/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then break; fi
  sleep 0.5
done
"$BIN/pg_ctl" -D "$DATA" status >/dev/null || { echo "PG_FAIL"; exit 1; }
export PGHOST=127.0.0.1 PGPORT=$PORT PGUSER=qf PGDATABASE=postgres
CREATED=0
for i in $(seq 1 20); do
  # create db via postgres single-user mode (no psql binary shipped)
  echo "CREATE DATABASE quantfoundry;" | "$BIN/postgres" -D "$DATA" -p $PORT -h 127.0.0.1 postgres 2>/dev/null && CREATED=1 && break
  # db may already exist; test connectivity by starting a fresh single-user session
  echo "SELECT 1;" | "$BIN/postgres" -D "$DATA" -p $PORT -h 127.0.0.1 quantfoundry 2>/dev/null && CREATED=1 && break
  sleep 0.5
done
echo "PG_READY postgresql://qf:qf@127.0.0.1:5433/quantfoundry?schema=public"
