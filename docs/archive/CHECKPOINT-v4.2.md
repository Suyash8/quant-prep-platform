# QuantFoundry v4.2 stable checkpoint

This is a stabilised snapshot of the current app, not a finished product. It exists so the work can be
kept and built on. Everything below is what was actually run and what is still wrong.

## What is in it
- The Next.js app, content (298 lessons incl. 15 new, 12 new assessments, 15 company profiles, 48 coding problems),
  the code runner, service worker and offline layer, tests and verification scripts.
- Fixes made in this phase: runner crash on early-exit submissions, per-event sync rejection and quarantine,
  offline service worker (icons were missing so install failed), device-vs-server score separation, assessment
  pass mark (80) applied consistently, offline download reports failed files instead of claiming success,
  stable Taylor lab and a correct unit square in the matrix lab, visible notices for unreadable expressions.

## Checks run (see docs/ and scripts/)
Run against a production build served locally (Node 22, Postgres, Chromium via Playwright).
Set `QF_DEMO_EMAIL` and `QF_DEMO_PASSWORD` yourself for any script that signs in; no credentials are shipped.

| Check | Result |
|---|---|
| `tsc --noEmit` | 0 errors |
| `node --test scripts/unit-tests.mjs` | 33/33 pass |
| `scripts/offline-check.mjs` (real browser, offline reload, queue flush, one blocked file reported as partial) | 13/13 pass |
| `scripts/verify-sync-*.mjs` (atomicity, quarantine, pass mark, provenance), `verify-security-fixes.mjs` | pass |
| `scripts/verify-hidden-all.mjs` (hidden test output never reaches the browser) | 48 problems, 602 tests, 521 hidden, 0 leaks |
| `scripts/verify-runner-epipe.mjs` | pass |
| `scripts/check-taylor.mjs`, `check-matrix-square.mjs`, `check-expressions.mjs` | pass |
| Problems: oracle vs Python vs C++ (ASan/UBSan) | 48/48 on Python 3.12.15 and GCC 12.4.0, local only (docs/PROBLEMS-RUNTIME-REPORT.txt) |

## Known gaps (not hidden)
- **Strict content validation is red** (`node scripts/validate-content.mjs`): roughly 2,700 errors, mostly quiz
  questions without objective mappings. It was not relaxed to get green.
- **Content review is partial.** About 49 of 283 original lessons were read end to end and corrected;
  none has a full source and visual sign-off. The rest are unreviewed. Many lessons still need rewriting.
- **Lab parameters.** `node scripts/check-lab-params.mjs` finds 223 candidate params in lesson content that a lab
  does not read (static scan, may include false positives from destructuring). Labs now show a visible note when
  lesson settings are ignored; the underlying mismatch is not fixed.
- **Weak problem-to-lesson links:** EMA/ewm, dedicated Cholesky, largest-remainder apportionment, union-find.
- **Offline:** the service worker caches app pages and content packs after a first online visit and now reports
  failed files. Behaviour depends on the browser keeping its cache (storage eviction, private mode, iOS limits),
  so offline use is not guaranteed. Scores computed on a device while offline are stored as device-reported and
  shown as "not verified". There is **no server re-grading step**: the server cannot re-score a device-only
  assessment because per-question answers are not synced, so such scores stay unverified until the learner
  retakes the assessment online. They never replace a server-graded attempt. Note: a synced device score at or
  above an assessment's pass mark still sets the lesson `retrievalDone` flag and can award XP, so progress can
  advance on a device claim.
- **Premium routes** (/pricing, /onboarding, /achievements, /certificate) are not part of this checkpoint.
- **Redesign** of landing, dashboard and most existing pages was not done. Page scores are not claimed.
  No two-pass judged audit was run; no official vision-judge exists in this environment.
- **Environment:** the problem runtime check used Python 3.12 / GCC 12 installed locally; the app host's own
  toolchain is not verified.
- Lint: 0 errors, 1 warning (`npx eslint .`). The original project had 14 errors in this environment. Type scale, copy and responsive gates from the spec were not all run for this checkpoint.

## Setup
See SETUP.md and `.env.example`. You must set `DATABASE_URL` and `SESSION_SECRET`.
