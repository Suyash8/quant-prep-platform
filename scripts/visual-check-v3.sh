#!/bin/bash
# v3 visual check: screenshots of key pages + console error scan.
set -u
export LD_PRELOAD=/home/z/my-project/scripts/qf-fence.so
export LD_LIBRARY_PATH="/home/z/my-project/pgdist/pg/lib"
: "${DATABASE_URL:?set DATABASE_URL}"; export DATABASE_URL
export SESSION_SECRET="v3-visual-secret"

AB="agent-browser"
PORT=3008
BASE="http://localhost:$PORT"
OUT=/tmp/v3-shots
mkdir -p $OUT

cd /home/z/my-project/.next/standalone
setsid nohup env PORT=$PORT node server.js > /tmp/vis-server.log 2>&1 < /dev/null &
SRV=$!
trap 'kill -TERM -$SRV 2>/dev/null; $AB close >/dev/null 2>&1' EXIT
for i in $(seq 1 30); do curl -s -o /dev/null $BASE/ && break; sleep 0.5; done

EMAIL="vis$(date +%s)@test.dev"
$AB set viewport 1280 900 >/dev/null 2>&1

$AB open $BASE/register >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB find role textbox fill "Visual Check" --name "Name" >/dev/null 2>&1
$AB find role textbox fill "$EMAIL" --name "Email" >/dev/null 2>&1
$AB find role textbox fill "password123" --name "Password" >/dev/null 2>&1
$AB find role button click --name "Create account" >/dev/null 2>&1
sleep 3

for page in dashboard curriculum "learn/orient-what-is-quant-finance?mode=reference" practice revision drills settings; do
  name=$(echo "$page" | tr '/?=' '___')
  $AB open "$BASE/$page" >/dev/null 2>&1
  sleep 2.5
  $AB screenshot "$OUT/$name.png" >/dev/null 2>&1
  echo "shot: $name"
done

echo "--- console errors ---"
$AB errors 2>&1 | tail -15
echo "--- console warnings (first 10) ---"
$AB console 2>&1 | head -10

ls -la $OUT
