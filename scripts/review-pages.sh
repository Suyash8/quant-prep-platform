#!/usr/bin/env bash
# Review individual page screenshots with the vision model, saving JSON outputs.
# usage: bash scripts/review-pages.sh <shotsDir> <page1> <page2> ...
set -euo pipefail
DIR="${1:?shots dir}"; shift
OUT="$DIR/reviews"; mkdir -p "$OUT"
PROMPT='You are a strict senior UI design reviewer auditing a full-page screenshot of a page from "QuantFoundry", a quantitative-finance learning platform (light theme, editorial/technical design system). Score the page 1-10 for visual polish: hierarchy, rhythm/spacing, color discipline, information density, alignment, and finish. Then list the TOP 5 SPECIFIC visual weaknesses (concrete: name the section, what looks monotonous, misaligned, low-contrast, unfinished or awkward). No praise, no summary of what is good — only score + weaknesses + one-line fix suggestions each.'
for name in "$@"; do
  f="$DIR/$name.png"
  [ -f "$f" ] || { echo "MISSING $f"; continue; }
  echo "== $name =="
  z-ai vision -p "$PROMPT" -i "$f" -o "$OUT/$name.json" >/dev/null 2>&1 || echo "FAIL $name"
  node -e "const j=require('$OUT/$name.json'); const c=j.choices?.[0]?.message?.content||j.content||JSON.stringify(j).slice(0,200); console.log('### $name —', c.split('\n').slice(0,14).join('\n'))" 2>/dev/null || echo "(parse fail)"
done
