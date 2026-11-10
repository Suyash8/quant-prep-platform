#!/bin/bash
# Full audit: login -> screenshot ALL routes (full page) -> judge with VLM -> scores
set -u
OUT=${1:-/tmp/faudit}; BASE=${2:-http://localhost:3002}
mkdir -p "$OUT"; rm -f "$OUT"/*.png "$OUT"/*.json "$OUT"/scores.txt 2>/dev/null

# Login flow
agent-browser open $BASE/login --viewport 1280x900 >/dev/null 2>&1; sleep 1.5
agent-browser eval "(function(){var e=document.querySelector('input[type=email]');Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(e,'visual@test.dev');e.dispatchEvent(new Event('input',{bubbles:true}));var p=document.querySelector('input[type=password]');Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(p,'visualtest12345');p.dispatchEvent(new Event('input',{bubbles:true}));return 'ok'})()" >/dev/null 2>&1
sleep 0.4
agent-browser click "button[type=submit]" >/dev/null 2>&1; sleep 3

shot(){ agent-browser open "$BASE$2" >/dev/null 2>&1; sleep 3.5; agent-browser screenshot "$OUT/$1.png" --full >/dev/null 2>&1; echo "$1:$( [ -s "$OUT/$1.png" ] && echo OK || echo FAIL )"; }

# Get real IDs from content map + companies (skip missing files gracefully)
LESSON=$(python3 -c "
import json
m=json.load(open('/home/z/my-project/content/map/curriculum.json'))
l=m['phases'][0]['modules'][0]['lessons'][0]
print(l['id'] if isinstance(l,dict) else l)" 2>/dev/null)
PROB=$(ls /home/z/my-project/content/problems/*.json 2>/dev/null | head -1 | xargs -r basename | sed 's/\.json$//')
ASSESS=$(ls /home/z/my-project/content/assessments/*.json 2>/dev/null | head -1 | xargs -r basename | sed 's/\.json$//')
PROJ=$(ls /home/z/my-project/content/projects/*.json 2>/dev/null | head -1 | xargs -r basename | sed 's/\.json$//')
CAREER=$(ls /home/z/my-project/content/companies/*.json 2>/dev/null | grep -v matrix | head -1 | xargs -r basename | sed 's/\.json$//')
echo "IDs: lesson=$LESSON prob=$PROB assess=$ASSESS proj=$PROJ career=$CAREER"

shot landing /

# capture login + register while logged OUT (they redirect when authed)
agent-browser eval "fetch('/api/auth/logout',{method:'POST'}).then(()=> 'ok')" >/dev/null 2>&1; sleep 1.5
shot login /login
shot register /register

# log back in
agent-browser open $BASE/login --viewport 1280x900 >/dev/null 2>&1; sleep 1.5
agent-browser eval "(function(){var e=document.querySelector('input[type=email]');Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(e,'visual@test.dev');e.dispatchEvent(new Event('input',{bubbles:true}));var p=document.querySelector('input[type=password]');Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(p,'visualtest12345');p.dispatchEvent(new Event('input',{bubbles:true}));return 'ok'})()" >/dev/null 2>&1
sleep 0.4
agent-browser click "button[type=submit]" >/dev/null 2>&1; sleep 3

shot dashboard /dashboard
shot curriculum /curriculum
shot learn_list /learn
shot lesson "/learn/$LESSON"
shot practice "/practice"
shot problem "/practice/$PROB"
shot assessments /assessments
shot assessment "/assessments/$ASSESS"
shot drills /drills
shot revision /revision
shot lab /lab
shot analytics /analytics
shot projects /projects
shot project "/projects/$PROJ"
shot career /career
shot career_detail "/career/$CAREER"
shot diagnostic /diagnostic
shot planner /planner
shot methodology /methodology
shot about /about
shot settings /settings
shot admin /admin

echo "=== ALL SHOTS DONE ==="
