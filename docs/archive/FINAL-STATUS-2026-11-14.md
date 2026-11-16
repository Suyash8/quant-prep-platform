# QuantFoundry v5 rebuild - final review pack, 2026-11-14

This archive is the full current source of the QuantFoundry v5 rebuild at the
conclusion of the independent engineering review. It supersedes the
2026-11-14 morning checkpoint.

## Verified by execution on the final build

- Content validator: 96 lessons, 296 concepts, 1,183 items, 78 practice
  problems - 0 errors, 0 warnings.
- Grader fixtures: 4,143 / 4,143 pass, 0 mismatches. Additions grader: no errors.
- UX regression on the final build (22 recorded checks): 19 route-viewport
  checks across 390px light and 1280px dark - 0 document overflow and 0 axe
  accessibility violations (axe loaded and active) - plus 3 functional
  checks: offline reload of a stored lesson renders, reconnection succeeds,
  and browser-history behavior recorded. The history row records that one
  Back from a lesson lands on the guard's parked history entry; it is not a
  pass/fail assertion. The unsaved-work guard proof is the separate dirty
  test: dismiss preserves code and input (twice), accept leaves. No page
  errors in any check. Earlier review rounds ran the same script without
  axe available, so no prior axe result exists or is claimed.
  Offline reload of a stored lesson renders identically; reconnection and a
  real post-reconnect code run verified; unsaved-work back guard verified
  (dismiss preserves code and input, accept leaves).
- Deep layout sweep, 6 heaviest lessons at 390px light and 1280px dark:
  0 overflowing blocks; worked-example prose wraps inside its card.
- Answer states verified visually: neutral selection, red incorrect with
  "Incorrect." copy, green correct only on a correct answer.
- Code reading examples: source lines are preserved verbatim (no soft
  wrapping); long lines pan horizontally inside the card. The pan region is
  keyboard reachable (focusable, labelled, arrow-key scroll). Document
  overflow is 0 at 390px and 1280px.
- Practice gating fails closed by design: if the code-runner toolchain is
  below baseline, the app reports practice closed instead of grading against
  an unqualified toolchain. Runner qualification is documented in
  docs/runtime-qualification.md (generic configuration, no machine-specific
  paths).
- Production CHECK on the qualified runner: 10/10, with the standing
  qualifiers limitsProvisional: true and awardsProgress: false.

## Evidence

- Editorial evidence: current 96-lesson bundle (edition 96897989) under
  content-v5/_evidence/editorial-source/.
- Public-contract capture for all 78 problems can be regenerated from
  content-v5/problems-src at any time; every row's hashes recompute from the
  sources in this tree.

## Performance (local, single machine - not production load)

Route-level sweep, cold and warm: TTFB 3-129 ms, LCP 168-328 ms, zero long
tasks across learn, lesson, practice, practice item, progress, review and
dashboard routes. These are local development-machine numbers, useful for
regression comparison, not a production capacity claim.

## Not claimed

- No external production deployment was performed or verified.
- No load or concurrency testing beyond the local sweep above.
- Accessibility was checked with axe on the 19 route-viewport checks above only.

## Exclusions

.env, node_modules, .next build output, and local logs are excluded.
