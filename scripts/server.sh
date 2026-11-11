#!/usr/bin/env bash
# Start (or restart) the production standalone server on :3002 with the right env.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# kill anything on the port
PID=$(ss -ltnp 2>/dev/null | grep ":3002 " | grep -oP 'pid=\K[0-9]+' | head -1 || true)
[ -n "$PID" ] && kill "$PID" 2>/dev/null && sleep 1 || true

cd "$ROOT"
set -a; [ -f .env ] && . "$ROOT/.env"; set +a
export PORT=3002 HOSTNAME=127.0.0.1 NODE_ENV=production
nohup node .next/standalone/server.js > /tmp/qf-server.log 2>&1 &
sleep 4
curl -s -o /dev/null -w "server on :3002 -> %{http_code}\n" http://127.0.0.1:3002/
