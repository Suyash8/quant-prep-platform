#!/bin/bash
# Crawl all QuantFoundry routes as guest; report status + timing
BASE="http://localhost:3000"
routes=(
  / /curriculum /methodology /career /login /register /about
  /dashboard /learn /practice /lab /drills /revision /planner
  /analytics /projects /assessments /diagnostic /settings /admin
)
echo "=== GUEST CRAWL (expect 200 or 307 redirects to login) ==="
for r in "${routes[@]}"; do
  out=$(curl -s -o /dev/null -w "%{http_code} %{time_total}s %{redirect_url}" --max-time 30 "$BASE$r")
  echo "$r -> $out"
done
echo ""
echo "=== AUTHED CRAWL (using e2e cookie) ==="
# login fresh
curl -s -c /tmp/e2e.jar -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"e2e@test.dev","password":"e2etest12345"}' -o /dev/null
for r in "${routes[@]}"; do
  out=$(curl -s -b /tmp/e2e.jar -o /dev/null -w "%{http_code} %{time_total}s %{redirect_url}" --max-time 60 "$BASE$r")
  echo "$r -> $out"
done
