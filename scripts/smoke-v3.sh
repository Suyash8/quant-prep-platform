#!/bin/bash
# v3 smoke test: start standalone server, exercise key routes, kill server.
# Everything runs in one invocation because the sandbox recycles background
# processes between commands.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export LD_PRELOAD="$ROOT/scripts/qf-fence.so"
export DATABASE_URL="postgresql://qf@127.0.0.1:5433/quantfoundry?schema=public"
export SESSION_SECRET="test-secret-for-smoke-run"
cd "$ROOT/.next/standalone"

PORT=3004
setsid nohup env PORT=$PORT node server.js > /tmp/smoke-server.log 2>&1 < /dev/null &
SRV=$!
trap 'kill -TERM -$SRV 2>/dev/null' EXIT

for i in $(seq 1 30); do
  curl -s -o /dev/null http://localhost:$PORT/ && break
  sleep 0.5
done

BASE="http://localhost:$PORT"
JAR=/tmp/smoke-cookies.txt
rm -f $JAR
PASS=0; FAIL=0
check() { # name, expected, actual
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "ok   $1";
  else FAIL=$((FAIL+1)); echo "FAIL $1 (expected $2, got $3)"; fi
}

# --- static packs ---
for p in /packs/v3/manifest.json /packs/v3/map.json /packs/v3/lessons/orient-quant-developer-role.json /packs/v3/problems/index.json /packs/v3/assessments/index.json /packs/v3/projects/index.json /packs/v3/companies.json /sw.js /manifest.json; do
  code=$(curl -s -o /dev/null -w '%{http_code}' $BASE$p)
  check "GET $p" 200 "$code"
done

# --- public pages ---
for p in / /login /register /curriculum /methodology /about; do
  code=$(curl -s -o /dev/null -w '%{http_code}' $BASE$p)
  check "page $p" 200 "$code"
done

# --- auth + sync flow ---
email="smoke$(date +%s)@test.dev"
code=$(curl -s -c $JAR -o /tmp/smoke-reg.json -w '%{http_code}' -X POST $BASE/api/auth/register -H 'Content-Type: application/json' -d "{\"name\":\"Smoke Tester\",\"email\":\"$email\",\"password\":\"password123\"}")
check "register" 200 "$code"

code=$(curl -s -b $JAR -o /tmp/smoke-syncg.json -w '%{http_code}' $BASE/api/sync)
check "sync GET" 200 "$code"
python3 -c "import json; d=json.load(open('/tmp/smoke-syncg.json')); assert 'snapshot' in d and 'xp' in d['snapshot']; print('snapshot keys ok')" || echo "FAIL snapshot shape"

# sync POST with lesson pass + exercise
EVT="evt-$(date +%s)"
SYNC_BODY=$(printf '{"events":[{"id":"%s-a1","kind":"lesson_result","at":"2026-11-10T10:00:00Z","lessonId":"orient-quant-developer-role","pct":100},{"id":"%s-a2","kind":"exercise_done","at":"2026-11-10T10:05:00Z","lessonId":"orient-quant-developer-role"},{"id":"%s-a3","kind":"reviews","at":"2026-11-10T10:06:00Z","reviews":[{"cardKey":"orient-quant-developer-role:0","grade":4}]}]}' "$EVT" "$EVT" "$EVT")
code=$(curl -s -b $JAR -o /tmp/smoke-syncp.json -w '%{http_code}' -X POST $BASE/api/sync -H 'Content-Type: application/json' -d "$SYNC_BODY")
check "sync POST" 200 "$code"
python3 - <<'EOF'
import json
d = json.load(open('/tmp/smoke-syncp.json'))
snap = d['snapshot']
assert d['applied'] == 3, f"applied {d['applied']}"
assert snap['xp'] > 0, 'xp should be > 0 after pass+exercise'
lp = snap['lessons'].get('orient-quant-developer-role')
assert lp and lp['status'] in ('passed', 'mastered'), f"status {lp and lp['status']}"
assert lp['kcBestPct'] == 100
assert snap['streakCount'] >= 1
assert len(snap['cards']) >= 1, 'flashcards should be created'
print(f"sync POST ok: xp={snap['xp']} streak={snap['streakCount']} status={lp['status']} cards={len(snap['cards'])}")
EOF

# idempotency: replay same events
REPLAY_BODY=$(printf '{"events":[{"id":"%s-a1","kind":"lesson_result","at":"2026-11-10T10:00:00Z","lessonId":"orient-quant-developer-role","pct":100},{"id":"%s-a2","kind":"exercise_done","at":"2026-11-10T10:05:00Z","lessonId":"orient-quant-developer-role"}]}' "$EVT" "$EVT")
code=$(curl -s -b $JAR -o /tmp/smoke-syncr.json -w '%{http_code}' -X POST $BASE/api/sync -H 'Content-Type: application/json' -d "$REPLAY_BODY")
check "sync replay" 200 "$code"
python3 - <<'EOF'
import json
d1 = json.load(open('/tmp/smoke-syncp.json'))
d2 = json.load(open('/tmp/smoke-syncr.json'))
assert d2['snapshot']['xp'] == d1['snapshot']['xp'], f"xp changed on replay: {d1['snapshot']['xp']} -> {d2['snapshot']['xp']}"
print(f"idempotent replay ok: xp stays {d2['snapshot']['xp']}")
EOF

# --- authed pages ---
for p in /dashboard /learn/orient-quant-developer-role /learn/orient-quant-developer-role?mode=reference /practice /revision /drills /settings /analytics /planner /assessments /projects /lab; do
  code=$(curl -s -b $JAR -o /dev/null -w '%{http_code}' "$BASE$p")
  check "authed $p" 200 "$code"
done

# practice problem page (server-rendered, needs content)
code=$(curl -s -b $JAR -o /dev/null -w '%{http_code}' "$BASE/practice/bst-validate")
if [ "$code" = "000" ]; then
  # find any problem slug from the index
  slug=$(curl -s $BASE/packs/v3/problems/index.json | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['slug'])")
  code=$(curl -s -b $JAR -o /dev/null -w '%{http_code}' "$BASE/practice/$slug")
fi
check "problem page" 200 "$code"

# offline manager page contains download section
curl -s -b $JAR $BASE/settings | grep -qi "<h2>Offline</h2>" && echo "ok   offline manager present" || echo "FAIL offline manager missing"

echo
echo "RESULT: $PASS passed, $FAIL failed"
exit $FAIL
