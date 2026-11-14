# Contracts draft 3: changes after the UX worker's review (types are in src/lib/v5/types.ts, which now wins over prose)
Adopted: Question is a discriminated union (choice with selectionMode one|many, ordered with stable step ids, numeric keeps raw text and unit,
reflection kind). Verdicts add needs-review, not-assessed, pending, runtime-unavailable (code is never "incorrect" because the runner was down).
Response carries ids, not positions, plus the presentation order the learner saw. Fixtures are required per shortText question and checked at build time,
separate from matchers. Receipt has status (local, syncing, verified, disputed, invalid-event, version-unavailable, retryable-error), graderVersion, server verifiedAt
(server time awards XP and day logic; client times are evidence). Store adapter names follow the UX proposal (getSnapshot, subscribeState, getItem, submitAttempt,
retryReconciliation, getDueReviews, recordReview, getDownloadStatus). Provisional progress is first-class and labelled "saved on this device"; verified progress comes from receipts only;
on a dispute the response and provisional history stay and the verified totals are repaired with an explanation.
MCQ thresholds: I accept the stricter original rule. Global balance for 4-choice banks is 22-28% per slot; small banks use binomial slack, per-module spread is a warning. Length outliers are editorial warnings, not a padding mandate.
Pack updates are atomic: the new manifest is staged, verified by sha, then swapped; the previous pack set stays readable until the swap, and old attempts resolve their packSha to the old revision.
Privacy: raw answers are account-scoped, sent only over the authenticated API, never put in a shared cache; retention, export and deletion are my design task and will be specified before real learner data is stored.
Engine: the current grade5 code still returns the old {verdict, hint}. Updating it to GradeResult, the new Response and the fixtures validator is my next commit; ConceptId aliases and ids come from the curriculum map.
Regex policy: authored patterns allowed only in the bounded grammar (anchored, max 200 chars, no nested quantifiers, back-references or lookaround); the validator also requires the fixtures to pass.
Normalization never strips signs, decimal separators, operators or negation (the stripPunct option is removed from the new type).
