#!/usr/bin/env bash
# Portable embedded PostgreSQL starter (no Docker, no system postgres needed).
# Usage: bash scripts/pg-embedded.sh start|stop|status
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="$ROOT/node_modules/@embedded-postgres/linux-x64/native/bin"
DATA="$ROOT/.pgdata/pg"
PORT="${QF_PG_PORT:-5433}"

case "${1:-start}" in
  start)
    if "$PGBIN/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then
      echo "postgres: already running on port $PORT"
    else
      "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp" \
        -l "$ROOT/.pgdata/logfile" start >/dev/null
      sleep 1
      "$PGBIN/pg_ctl" -D "$DATA" status | head -2
    fi
    "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U qf -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='quantfoundry'" | grep -q 1 || \
      "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U qf -d postgres -c "CREATE DATABASE quantfoundry OWNER qf;"
    echo "ready: postgresql://qf@127.0.0.1:$PORT/quantfoundry"
    ;;
  stop)
    "$PGBIN/pg_ctl" -D "$DATA" -m fast stop || true
    echo "postgres: stopped"
    ;;
  status)
    "$PGBIN/pg_ctl" -D "$DATA" status || true
    ;;
esac
