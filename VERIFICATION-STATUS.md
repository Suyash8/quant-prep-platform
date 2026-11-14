# Verification status - QuantFoundry v5 package (reconstructed source tree)

## What this package is
A reconstructed source tree, assembled 2026-11-14 from the source snapshot cd98b20 plus the exact reviewed patch chain:
admission gate (7122d1be) -> readiness population (c7fedd6) -> ef6047b (per-id evidence check + permission note) -> d6be669 (test-hook QF_V5_READY_ONLY + test-suite fixes).
It is NOT a git archive and carries no .git history. Commit hashes above refer to the original repository.

## Content identity - verified
- 78 practice problems (Python + C++), contentVersion 4e218059407fd3c3, 176 packs / 1183 items / 78 problems.
- sha256 of every content-v5/problems-src file matches the deployed anchors 78/78; every regenerated problem pack sha256 matches 78/78 (anchors: content-v5/_evidence/deployed-anchors-3f1be15-b100f6f9.json).
- src/lib/v5/server-problems/ and public/v5/ are generated artifacts (gitignored): `npm run build` regenerates them deterministically from the shipped problems-src.
- content-v5/_build/code-readiness.json ships POPULATED: all 78 problems, python + cpp each, written by scripts/populate-readiness.mjs from the shipped qualification evidence (content-v5/_evidence/qualification-9b32061-runner-59868d2a.json: qualified=true, 156/156 reference runs, 0 skipped, 30/30 isolation probes, sandbox active, target toolchain Python 3.12.15 / g++ 12.4.0). At run time the judge still fails closed unless the runner reports an active sandbox on Python >= 3.12 and g++ >= 12.4.

## Legacy v3 problem catalog (content/problems) - restored 2026-11-14 (r3)
The first package (r1) omitted content/problems entirely: the trimmed source snapshot it was built from had dropped that directory. r2 restored the user's original 28 files; this r3 carries the FULL recovered legacy catalog: 48 problem JSON files, 602 tests, 521 hidden, from the preserved 2026-11-13 consolidated archive. It is a strict superset of the user's original 28 (no test inputs lost anywhere; order-book-spread had its expected-output strings reformatted plus 4 inputs added - the only content delta). The legacy judge and code-workspace UI work again.
- Legacy judge gate FIXED in this package: /api/judge/submit and /api/judge/run now share the same fail-closed runtime check as /api/v5/code (src/app/api/judge/[action]/route.ts calls judgeRuntimeStatus). Executed verification on this exact tree: with the runner up but below the Python 3.12 / g++ 12.4 baseline the legacy route returns 503 runtime-unavailable and runs nothing; with the development waiver it judges normally (wrong answer judged failed, hidden tests return no expected output); unauthenticated 401 and unknown-slug 404 unchanged.

## Independent review checks PASSED (executed, not just read)
- Runner isolation probes 29/29 reproduced; memory/fd/fork bounds measured; fail-closed behavior confirmed.
- Admission gate 30/30 reproduced on the target runner; 413/200 body-size boundary verified.
- Qualify-runtime gate incl. negative path (below-baseline host correctly refuses).
- Web gate: all judge-route branches incl. 503/401/409 and dev waiver.
- Cross-account draft isolation: no carry-over (dedicated race harnesses, incl. short-window variant).
- QF_V5_READY_ONLY test hook: narrowing-only verified by live execution; cannot elevate unknown ids; unset = unchanged behavior.

## Checks completed on this exact tree after the r1 package shipped
- Clean install (bun) + full production build: SUCCESS, 0 errors, standalone output produced.
- Fresh Postgres schema push: OK.
- verify-v5-code (dev mode, fresh account): ALL PASS - not-ready 403, both 409 problem-changed paths, wrong-answer no-hidden-leak, compile-error path, stdin/output boundaries, output_limit kill, stdout truncation flag.
- verify-v5-practice (real UI, mobile 390px, dev mode): ALL PASS - draft save/restore, older-draft confirm, language-switch guard, failed-save handling, offline honesty, no horizontal overflow.
- Sync suites: provenance PASS; quarantine rejects poisoned events; retry queues then clears with notice; atomicity has no double-apply; passmark gates at 75/85; invalid event kinds are rejected per-event with HTTP 200 batch semantics.
- Legacy judge spot check after the r2 catalog restore: anagram-groups judged failed on a wrong answer; hidden tests return no expected output (no leak).
- Paced hidden-test privacy sweep across all 78 problems x Python/C++: ALL PASS - 156/156 problem-language pairs covered, 234 judged calls, 845 hidden tests in scope, 0 hidden-output leaks, nothing skipped. Harness limits: expected strings shorter than 8 characters are not probed and the per-pair C++ compile-error shape is not exercised.
- Legacy-judge readiness gate: implemented and execution-verified both directions (see the legacy catalog section).

## Checks NOT finished - do not read this package as fully tested
- Performance profiles P0/P1/P2: not run.
- A strict `npm ci` lockfile variant build: not run (bun install was used).
- Final normal-mode (production, non-dev) UI review of this exact tree: in progress.
- Legacy suites over the restored 48 (hidden-all, runner-epipe): pending rerun.
These rerun in the background after delivery; results follow separately.

## Setup
See SETUP.md. In short: copy .env.example to .env and fill in, `bun install` (or npm install), `npx prisma db push`, `npm run build` (regenerates content packs and server-problems), `npm start`. The code runner requires bwrap, Python >= 3.12, g++ >= 12.4 and about 2 GiB RAM; see SETUP.md "Local code runner". QF_V5_CODE_DEV=1 enables the dev-only test problem without baseline enforcement (development only).
