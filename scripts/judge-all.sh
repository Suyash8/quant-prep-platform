#!/bin/bash
# Judge all screenshots in a dir with VLM (rate-limit aware), print scores
set -u
OUT=${1:-/tmp/audit6}
mkdir -p "$OUT"
JUDGE='You are an extremely strict senior product designer reviewing ONE page of QuantFoundry, a Duolingo-style quant-finance learning platform (Nunito font, rounded-2xl cards, 3D chunky buttons with hard drop shadows, green primary, gold XP accents, HUD pills, colored chips). Judge ONLY this full-page screenshot. Rate VISUAL DESIGN 0-10 (10 = could ship as a genuine Duolingo competitor: intentional spacing, clear hierarchy, cohesive color, zero dead zones, no native ugly controls; mediocre = 5-6). Then list up to 4 SPECIFIC visual problems. Format EXACTLY: SCORE: <n>/10 then ISSUES: bullets.'
> "$OUT/scores.txt"
for f in "$OUT"/*.png; do
  n=$(basename "$f" .png)
  # skip if already judged
  [ -s "$OUT/$n.json" ] && continue
  ok=0
  for attempt in 1 2 3; do
    z-ai vision -p "$JUDGE" -i "$f" -o "$OUT/$n.json" >/dev/null 2>&1
    if [ -s "$OUT/$n.json" ]; then ok=1; break; fi
    sleep 30
  done
  [ "$ok" = "1" ] || { echo "$n: JUDGE-FAILED"; continue; }
  python3 - "$OUT/$n.json" "$n" "$OUT/scores.txt" <<'PYEOF'
import json,sys,re
d=json.load(open(sys.argv[1]))
c=d.get('choices',[{}])[0].get('message',{}).get('content','') if isinstance(d,dict) else str(d)
m=re.search(r'SCORE:\s*(\d+(?:\.\d+)?)\s*/\s*10',c)
score=m.group(1) if m else '?'
open(sys.argv[3],'a').write(f"{sys.argv[2]}: {score}/10\n")
issues=[l.strip() for l in c.split('\n') if l.strip().startswith(('-','•','*'))][:4]
print(f"═══ {sys.argv[2]} ═══ {score}/10")
for i in issues: print('   '+i[:145])
PYEOF
  sleep 4
done
echo "=== SCORES ==="; cat "$OUT/scores.txt" | sort -t: -k2 -n
echo JUDGE-DONE
