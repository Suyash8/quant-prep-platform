#!/bin/bash
# Render smoke test: every lesson must return HTTP 200 (not 500) for the authed test user.
# Throttled: gentle pacing so the dev server is never overwhelmed.
set -u
cd "$(dirname "$0")/.."
curl -s -c /tmp/smoke.jar -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"e2e@test.dev","password":"e2etest12345"}' -o /dev/null

python3 - <<'PYEOF' > /tmp/lesson_ids.txt
import json, os
ids = []
for mod in os.listdir('content/lessons'):
    for f in os.listdir(f'content/lessons/{mod}'):
        if f.endswith('.json'):
            ids.append(f[:-5])
print('\n'.join(sorted(ids)))
PYEOF

total=0; bad=0
while read -r id; do
  total=$((total+1))
  code=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/smoke.jar --max-time 90 "http://localhost:3000/learn/$id")
  if [ "$code" != "200" ]; then
    bad=$((bad+1))
    echo "NON-200 ($code): $id"
  fi
  sleep 0.1
done < /tmp/lesson_ids.txt
echo "---"
echo "smoke test: $total lessons, $bad failures"
exit $bad
