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

## Independent review checks PASSED (executed, not just read)
- Runner isolation probes 29/29 reproduced; memory/fd/fork bounds measured; fail-closed behavior confirmed.
- Admission gate 30/30 reproduced on the target runner; 413/200 body-size boundary verified.
- Qualify-runtime gate incl. negative path (below-baseline host correctly refuses).
- Web gate: all judge-route branches incl. 503/401/409 and dev waiver.
- Cross-account draft isolation: no carry-over (dedicated race harnesses, incl. short-window variant).
- QF_V5_READY_ONLY test hook: narrowing-only verified by live execution; cannot elevate unknown ids; unset = unchanged behavior.

## Checks NOT finished - do not read this package as fully tested
- The paced hidden-test privacy run across all 78 problems x Python/C++ (about 16 minutes) was lost when the test host rebooted. It has NOT passed on this exact tree. Earlier legacy-scope run (old 48-problem v3 suite) passed but does not cover these.
- Performance profiles P0/P1/P2: not run.
- Final clean `npm ci` + production build of this exact tree: not run.
- Final normal-mode UI screenshot review (incl. mobile) of this exact tree: not done.
- Legacy sync/security suites were rerun by the developer on ef6047b (7 suites rc 0) but the logs were lost with the host; not independently re-verified.
These rerun in the background after delivery; results follow separately.

## Setup
See SETUP.md. In short: copy .env.example to .env and fill in, `bun install` (or npm install), `npx prisma db push`, `npm run build` (regenerates content packs and server-problems), `npm start`. The code runner requires bwrap, Python >= 3.12, g++ >= 12.4 and about 2 GiB RAM; see SETUP.md "Local code runner". QF_V5_CODE_DEV=1 enables the dev-only test problem without baseline enforcement (development only).
