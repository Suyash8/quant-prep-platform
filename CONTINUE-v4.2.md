# Continuation state (QuantFoundry v4.2 work, UI/engineering owner)

Environment to restore: node 22, `npm i --legacy-peer-deps`, embedded Postgres (`embedded-postgres`, port 5433, user/pass qf, db quantfoundry, data dir /tmp/pgdata), `.env` with DATABASE_URL and SESSION_SECRET (production now requires it), `npx prisma generate && npx prisma db push`, bun on PATH for the code runner, Playwright chromium for `scripts/shot.mjs`. Build with NODE_OPTIONS=--max-old-space-size=900 (box has about 1 GB RAM).

Done (committed): type-scale pass + scripts/scan-type-scale.mjs; page tint/chunky hover; honest auth pitch; version constant; dash cleanup in src/docs; practice featured card/grid/collapse; problem two-column sticky workspace; project detail tabs + list rendering; F1 python path; F2 hidden tests hidden; F4 session secret/HMAC; F5 partial (claim row, zod kind check, rate limit); use-mobile lint fix.

Open: F5 true atomicity (apply events inside one db.$transaction and per-kind zod payload validation, applied count = accepted), F3 offline-check real assertions, F6/F7 assessment path and placeholder attempt rows, F8 remaining 15 lint errors (5 react-hooks in src, 11 no-require-imports in scripts), F9 hex/palette, F10 hard-coded counts, F11 SHELL_ROUTES + sw VERSION with premium routes, F12, F13 ("Submit" label, offline chip), landing restructure (6,159 px, target 4,500), dashboard trail, curriculum vs learn split, drills, revision, lab, analytics, career, planner, settings, admin, premium layer (pricing, onboarding, achievements, certificate with server-computed eligibility, command palette), mobile pass on all 25 routes, two judged runs (self-judged only), AUDIT.md, CHANGELOG-v4.2.md, DESIGN.md/SETUP.md updates, final zip quantfoundry-v4.2.zip. Content patches from the three content workers need integration (content/ and shared grading/types/validator).
Screenshot sets: original 22 pages (pre-change) in /tmp/audit-original22; 25 pages after type-scale only in /tmp/audit-after-typescale25.

## Update 9:10 PM IST (run 3)
Done since earlier list: F3 offline gate (12/12, real assertions; SW install was failing because PWA icon PNGs were missing, now generated), F6/F7, F10 (countLabs), F12 (prisma log, ignoreBuildErrors removed, strict mode), F13 (Submit wording), sync per-event quarantine, lint 0 errors, runner EPIPE crash fix, FunctionPlotter multi-expression, integrated: final additions (15 lessons, 12 assessments, companies), problems patches 1-3 (40 of 48), content-truth checkpoint + arithmetic + prealgebra increments.
Run gates: tsc 0, unit 33/33, offline 12/12, hidden-output check 0 leaks on 37/40 problems (rerun run-length-encode, stream-outlier-stddev, vwap-slicing; submit rate limit is 429 so pace 2.5s+).
Still open: strict validate-content red (content worker), 8 problems (worker), UI hooks (scoreBands, passMarkPercent, lessonId links, successCheck, snippet/file/requires chips, problem.lessons links), F9 hex tokens, F11 SHELL_ROUTES for premium routes, F14 client-md dollars, landing + all pages redesign, premium routes, mobile pass, rendered FunctionPlotter check, truth tooling on integrated data, judged runs x2, AUDIT/CHANGELOG/DESIGN/SETUP, zip.
Build: kill next-server, `NODE_OPTIONS=--max-old-space-size=900 npm run build`, start with setsid (PATH incl node_modules/.bin for bun). Runner is spawned by the app from .next/standalone/mini-services.

## Update 9:14 PM IST
- Built and running (:3002) with: assessment scoreBands/passMark UI+server threshold, FunctionPlotter multi-expression, runner EPIPE fix. Algebra2 increment applied to content after that build (rebuild needed for packs).
- verify-runner-epipe.mjs PASS (early-exit submissions do not kill the runner). verify-hidden-all.mjs: rerun run-length-encode, stream-outlier-stddev, vwap-slicing (429 pacing).
- Lessons are a card stepper (1/21): to screenshot the FunctionPlotter, advance to card 12 of /learn/arith-powers-roots-logs (block index 11, expressions ["2**x","log2(x)"]); scripts/shot-plotter.mjs needs a stepper-advance loop. Rendered pixels still pending.
- Send main a snapshot zip (git archive) + FunctionPlotter pixels once taken.

## 9:25 PM update
- Done: sync assessment_result uses passMarkPercent (scripts/verify-sync-passmark.mjs PASS: 75 no, 85 yes on assess-probability). SW reports cached/failed/partial; offline-check 13/13 incl. partial outage (1 blocked file -> phase partial). Hidden check for run-length-encode, stream-outlier-stddev, vwap-slicing: 39 tests, 0 leaks (ONLY=slug,... env filter). Unit tests: node --test scripts/unit-tests.mjs (33/33). Registry: validate-content --registry.
- Integrated: queue-linear, prose-spacing, calculus2 patches. Expression sweep 34/0.
- Pending: partial-state pixels, ExprNotice pixels, UI hooks, landing/pages, premium routes, mobile pass, judged audits, final docs.
