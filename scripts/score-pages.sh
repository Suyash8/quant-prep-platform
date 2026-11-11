#!/usr/bin/env bash
# Visual review pass: score every page screenshot with the vision model.
# usage: bash scripts/score-pages.sh <shotsDir> <passName>
set -euo pipefail
DIR="${1:?shots dir}"; PASS="${2:?pass name}"
OUT="$DIR/reviews-$PASS"; mkdir -p "$OUT"
PROMPT='You are a strict senior UI design reviewer. This is a full-page screenshot of a page from "QuantFoundry", a quantitative-finance learning platform (light theme, chunky 3D controls, rounded cards, green primary). Rate VISUAL DESIGN 1-10 (10 = could ship as a polished commercial product; mediocre = 5-6). Be strict but fair: reward hierarchy, rhythm, color discipline, information density, alignment and finish; punish monotony, dead zones, misalignment, low contrast, unbalanced grids. First line MUST be exactly "SCORE: <n>/10". Then "WEAKNESSES:" followed by up to 3 specific one-line weaknesses (concrete, naming the section). No praise.'
for f in "$DIR"/*.png; do
  name=$(basename "$f" .png)
  z-ai vision -p "$PROMPT" -i "$f" -o "$OUT/$name.json" >/dev/null 2>&1 || echo "$name FAIL"
  node -e "
const j=require('$OUT/$name.json');
const c=(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||'';
const m=c.match(/SCORE:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
console.log('$name', m?m[1]:'?');
const wl=(c.split(/WEAKNESSES:?/i)[1]||'').split('\n').filter(l=>l.trim().startsWith('-')||l.trim().startsWith('*')).slice(0,3);
wl.forEach(l=>console.log('   ', l.trim().replace(/^[-*]\s*/,'').slice(0,150)));
" 2>/dev/null || echo "$name parse-fail"
done
