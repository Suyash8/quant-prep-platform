# Final audit

Judge: self-judged via 3 independent vision-capable model runs over 640px downscaled montages (the official `z-ai` vision CLI is not on PATH in this environment; per Part 3.4 every score below is self-judged and deliberately harsh: each run was instructed to subtract a point from its first impression and find 4 concrete flaws before assigning a number)
Date: 2026-11-11   Build: production (`next build` standalone), 1280x900, light mode

| Page | Baseline median | Run 1 | Run 2 | Run 3 | Final median | Mobile overflowX |
|------|-----------------|-------|-------|-------|--------------|------------------|
| learn_list | 6 | 5 | 5 | 6 | 5 | 0 |
| register | 6 | 5 | 5 | 6 | 5 | 0 |
| about | 7 | 6 | 7 | 6 | 6 | 0 |
| admin | 7 | 6 | 5 | 6 | 6 | 0 |
| analytics | 6 | 6 | 6 | 6 | 6 | 0 |
| assessment | 6 | 6 | 7 | 6 | 6 | 0 |
| assessments | 7 | 6 | 6 | 7 | 6 | 0 |
| career_detail | 7 | 6 | 5 | 6 | 6 | 0 |
| curriculum | 6 | 5 | 7 | 6 | 6 | 0 |
| dashboard | 6 | 6 | 6 | 7 | 6 | 0 |
| diagnostic | 6 | 6 | 5 | 6 | 6 | 0 |
| drills | 6 | 7 | 5 | 6 | 6 | 0 |
| lab | 6 | 6 | 7 | 6 | 6 | 0 |
| lesson | 6 | 5 | 6 | 6 | 6 | 0 |
| login | 6 | 5 | 6 | 7 | 6 | 0 |
| planner | 6 | 6 | 6 | 6 | 6 | 0 |
| practice | 6 | 5 | 7 | 6 | 6 | 0 |
| problem | 7 | 6 | 6 | 6 | 6 | 0 |
| project | 6 | 6 | 6 | 6 | 6 | 0 |
| projects | 6 | 6 | 7 | 6 | 6 | 0 |
| revision | 6 | 6 | 5 | 6 | 6 | 0 |
| career | 6 | 6 | 7 | 7 | 7 | 0 |
| landing | 6 | 6 | 7 | 7 | 7 | 0 |
| methodology | 6 | 7 | 6 | 7 | 7 | 0 |
| settings | 7 | 5 | 7 | 7 | 7 | 0 |

Lowest pages: learn_list and register, median 5.
Pages below 8: all 25, under this self-judged harsh protocol.
Two consecutive passing audits: no (the visual gate is not met; see below).

## Honest reading of the visual gate

The visual gate (every page median >= 8, two consecutive audits) is **not met**. What the numbers do and do not say:

- The judged complaint profile shifted from structural failures at baseline (unstyled pages, native controls, half-empty pages, dead right rails, broken radii) to polish-level complaints (rhythm, alignment minutiae, list monotony, low-contrast micro text). Every objective, machine-checkable issue from the baseline is gone: native-control scan 0, hex scan 0, raw palette scan 0, contrast audit ALL PASS, mobile overflow 0 on all 25 routes.
- The self-judged protocol anchors scores low by design ("subtract one point from your first impression, find 4 concrete flaws before allowing yourself a number"). Under it, a solid professional page is defined as 8 and the runs returned dense flaw lists for every page, compressing the distribution into 5 to 7. A dedicated full-resolution check of the three flagship pages (landing, dashboard, lesson) earlier in the run scored them 7/8/8, one to two points above their montage medians, consistent with the documented montage downscale penalty.
- The official judge (`z-ai` vision CLI) was not available on PATH, so no officially-judged number exists in this report. Reproducing the numbers: `bun run build`, serve the standalone build on :3002, register+seed the demo learner, `node scripts/shot.mjs /tmp/audit http://localhost:3002`, montage, judge.

## Gate table

| Gate | Command | Result | Pass / fail |
|---|---|---|---|
| Type | `npx tsc --noEmit` | 0 errors | PASS |
| Lint | `npx eslint .` | 8 errors, all in `scripts/*.cjs` tooling, identical to the recorded baseline | PASS (no new) |
| Content | `node scripts/validate-content.mjs --registry` | exit 0, 0 errors, 0 warnings (baseline: 0 errors, 47 warnings) | PASS |
| Unit | `node --test scripts/unit-tests.mjs` | 25 pass, 0 fail | PASS |
| Smoke | `bash scripts/smoke-v3.sh` | 32 passed, 0 failed (after porting the script off the author-machine paths) | PASS |
| Offline | `node scripts/offline-check.mjs` | 6/6: 4 pages render offline, quiz grades offline, sync reachable again | PASS |
| Dash scan | `grep -rIn $'\xe2\x80\x94\|\xe2\x80\x93' src content public docs *.md` | 0 hits (baseline: 31 in docs) | PASS |
| Native controls | `node scripts/scan-native-controls.mjs` | 0 hits (baseline: 18+) | PASS |
| Hex scan | `grep -rnE '#[0-9a-fA-F]{3,8}\b' src/app src/components --include=*.tsx` (minus `components/ui/`) | 0 outside the sanctioned `learning-path.tsx` phase palette (baseline: 56) | PASS |
| Raw palette | `grep -rnE '(text\|bg\|border\|ring\|from\|to)-(gray\|slate\|...)...' src --include=*.tsx` (minus `components/ui/`) | 0 hits | PASS |
| Contrast | `node scripts/contrast-audit.mjs` | 17/17 pairs pass 4.5:1 (text) / 3:1 (bold large) | PASS |
| Responsive | `node scripts/shot.mjs /tmp/audit-final-mobile http://localhost:3002 390 844` | overflowX = 0 on all 25 routes (baseline mobile audit was never clean; 47 to 238px overflow per page before the fix) | PASS |
| Banned words | manual scan per Part 5.7 list | 0 in src/content copy (technical finance terms such as "leveraged investors" retained deliberately) | PASS |
| Visual | 3-run self-judged median | 5 to 7 per page, none at 8 | FAIL |

## What the judges still ask for (the honest next queue)

1. List-page monotony: practice (28 rows), learn library (50 modules), career company list (15 rows), projects (12 cards). They want varied row states, featured items and rhythm breaks, not just correct components.
2. Micro-contrast: 12px-and-smaller helper text and category micro-labels still read faint at montage scale.
3. Asymmetric card pairs: methodology lesson-parts, about engineering notes, revision deck composition, project design guidance. Cards want equalized heights (`items-stretch` + `h-full`) or filler content.
4. The code editor and table surfaces still read as "pasted in" to some judges despite full tokenization; a header bar and filename chrome on `.code-block` would help.
