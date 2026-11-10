#!/bin/bash
# v3 browser E2E: drive the real quiz in reference mode, verify the local
# state engine (instant local grading, XP award, event queue), then verify
# pages still render with the API blocked (offline).
set -u
export LD_PRELOAD=/home/z/my-project/scripts/qf-fence.so
export LD_LIBRARY_PATH="/home/z/my-project/pgdist/pg/lib"
export DATABASE_URL="postgresql://qf:qf@127.0.0.1:5433/quantfoundry?schema=public"
export SESSION_SECRET="v3-browser-test-secret"

AB="agent-browser"
PORT=3007
BASE="http://localhost:$PORT"
LESSON="orient-what-is-quant-finance"

cd /home/z/my-project/.next/standalone
setsid nohup env PORT=$PORT node server.js > /tmp/bt2-server.log 2>&1 < /dev/null &
SRV=$!
trap 'kill -TERM -$SRV 2>/dev/null; $AB close >/dev/null 2>&1' EXIT

for i in $(seq 1 30); do curl -s -o /dev/null $BASE/ && break; sleep 0.5; done

PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "ok   $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL $1"; }
has() { if echo "$2" | grep -q "$3"; then ok "$1"; else bad "$1 (missing: $3)"; fi }

EMAIL="bt2$(date +%s)@test.dev"

# --- register ---
$AB open $BASE/register >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB find role textbox fill "Quiz Tester" --name "Name" >/dev/null 2>&1
$AB find role textbox fill "$EMAIL" --name "Email" >/dev/null 2>&1
$AB find role textbox fill "password123" --name "Password" >/dev/null 2>&1
$AB find role button click --name "Create account" >/dev/null 2>&1
sleep 3
URL=$($AB get url 2>/dev/null)
case "$URL" in *dashboard*) ok "register -> dashboard";; *) bad "register -> dashboard (at $URL)";; esac

# --- lesson in reference mode: quiz is inline at the bottom ---
$AB open "$BASE/learn/$LESSON?mode=reference" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 2
HTML=$($AB snapshot 2>/dev/null)
has "reference lesson loads" "$HTML" "Knowledge check"

# --- answer every question per the plan ---
python3 - <<'EOF' > /tmp/quiz-answers.sh
import json
plan = json.load(open('/tmp/quiz-plan.json'))
for p in plan:
    n = p['n']
    if p['type'] == 'mcq':
        t = p['text'].replace("'", "'\\''")
        print(f"agent-browser find text '{t}' click >/dev/null 2>&1")
    elif p['type'] == 'ms':
        for t in p['texts']:
            t = t.replace("'", "'\\''")
            print(f"agent-browser find text '{t}' click >/dev/null 2>&1")
    else:
        t = p['text'].replace("'", "'\\''")
        print(f"agent-browser find role textbox fill '{t}' --name 'Answer for question {n}' >/dev/null 2>&1")
EOF
bash /tmp/quiz-answers.sh
sleep 1

# --- submit ---
$AB find role button click --name "Submit answers" >/dev/null 2>&1
sleep 2
HTML=$($AB snapshot 2>/dev/null)
if echo "$HTML" | grep -qiE "100%|passed|Passed"; then ok "quiz graded 100% locally"; else bad "quiz graded (got: $(echo "$HTML" | grep -iE '%' | head -2))"; fi

# --- local state now has the result ---
ST=$($AB storage local qf3-state 2>/dev/null)
has "state has lesson kcBestPct 100" "$ST" '"kcBestPct":100'
XP=$(echo "$ST" | python3 -c "import json,sys; s=json.loads(sys.stdin.read().split('qf3-state: ')[-1] if 'qf3-state: ' in sys.stdin.read() else input()); print()" 2>/dev/null || true)
STV=$(echo "$ST" | sed 's/^qf3-state: //')
XP=$(echo "$STV" | python3 -c "import json,sys; print(json.load(sys.stdin)['xp'])" 2>/dev/null)
if [ "${XP:-0}" -gt 0 ] 2>/dev/null; then ok "local XP awarded instantly (xp=$XP)"; else bad "local XP awarded (raw: $(echo "$STV" | head -c 120))"; fi
# --- background flush: the POST round-trip must appear in the network log ---
sleep 6
NET=$($AB network requests --filter "api/sync" 2>/dev/null)
if echo "$NET" | grep -q "api/sync"; then ok "sync POST round-tripped"; else bad "sync POST round-tripped (log: $(echo "$NET" | head -c 200))"; fi
QUEUE2=$($AB storage local qf3-queue 2>/dev/null | sed 's/^qf3-queue: //')
QLEN=$(echo "$QUEUE2" | python3 -c "import json,sys; q=json.load(sys.stdin); print(len(q))" 2>/dev/null || echo "ERR")
if [ "$QLEN" = "0" ]; then ok "queue flushed to server in background"; else bad "queue flushed (len=$QLEN: $(echo "$QUEUE2" | head -c 150))"; fi

# --- dashboard reflects local XP (daily quest bar prints todayXp/goal = 20/50) ---
$AB open $BASE/dashboard >/dev/null 2>&1
sleep 2
HTML=$($AB snapshot 2>/dev/null)
if echo "$HTML" | grep -q "20/50"; then ok "dashboard quest bar shows 20/50 from local XP"; else bad "dashboard quest bar shows 20/50 (got: $(echo "$HTML" | grep -oE '[0-9]+/50' | head -2))"; fi

# --- offline: block the API, reload, app still works ---
$AB network route "**/api/**" --abort >/dev/null 2>&1
$AB open "$BASE/learn/$LESSON?mode=reference" >/dev/null 2>&1
sleep 2
HTML=$($AB snapshot 2>/dev/null)
has "lesson readable offline" "$HTML" "Knowledge check"
$AB open $BASE/revision >/dev/null 2>&1
sleep 2
HTML=$($AB snapshot 2>/dev/null)
has "revision offline" "$HTML" "Revision"
$AB open $BASE/dashboard >/dev/null 2>&1
sleep 2
HTML=$($AB snapshot 2>/dev/null)
has "dashboard offline" "$HTML" "Daily quests"
$AB network unroute >/dev/null 2>&1

echo
echo "RESULT: $PASS passed, $FAIL failed"
exit $FAIL
