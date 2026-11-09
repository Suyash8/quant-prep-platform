#!/bin/bash
# Minimal final audit: login + screenshot 6 key pages + VLM judge
set -u
OUT=/tmp/faudit; mkdir -p $OUT; BASE=http://localhost:3002
agent-browser open $BASE/login --viewport 1280x900 >/dev/null 2>&1; sleep 1.5
agent-browser eval "(function(){var e=document.querySelector('input[type=email]');Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(e,'visual@test.dev');e.dispatchEvent(new Event('input',{bubbles:true}));var p=document.querySelector('input[type=password]');Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(p,'visualtest12345');p.dispatchEvent(new Event('input',{bubbles:true}));return 'ok'})()" >/dev/null 2>&1
sleep 0.4
agent-browser click "button[type=submit]" >/dev/null 2>&1; sleep 3
shot(){ agent-browser open "$BASE$2" >/dev/null 2>&1; sleep 2.5; agent-browser screenshot "$OUT/$1.png" --full >/dev/null 2>&1; echo "$1:$( [ -s "$OUT/$1.png" ] && echo OK || echo FAIL )"; }
shot landing /; shot dashboard /dashboard; shot practice /practice; shot assessments /assessments; shot analytics /analytics; shot drills /drills
JUDGE='You are an extremely strict senior product designer reviewing a page of QuantFoundry, a Duolingo-style quant-finance learning platform (Nunito font, rounded-2xl cards, 3D chunky buttons with hard shadows, green primary, gold XP accents, HUD pills, chips). Judge ONLY this full-page screenshot. Rate VISUAL DESIGN 0-10 (10 = could ship as a Duolingo competitor; mediocre = 5-6). Then list up to 5 SPECIFIC visual problems. Format EXACTLY: SCORE: <n>/10 then ISSUES: bullets.'
for f in $OUT/*.png; do n=$(basename $f .png)
  z-ai vision -p "$JUDGE" -i "$f" -o "$OUT/$n.json" >/dev/null 2>&1
  [ -s "$OUT/$n.json" ] && python3 -c "
import json
d=json.load(open('$OUT/$n.json'))
c=d.get('choices',[{}])[0].get('message',{}).get('content','') if isinstance(d,dict) else ''
print('════ $n ════'); print((c or str(d))[:700])"
done; echo MINI-AUDIT-DONE
