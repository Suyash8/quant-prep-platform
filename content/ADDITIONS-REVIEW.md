# New lessons, assessments and career content review

Date: 2026-11-13

## Delivered scope

The coverage table enumerates 15 lessons although the prompt calls them 14. All 15 named lessons are included. Their IDs are unchanged from that table, including `pf-robust-construction`; the word in that required identifier is not learner-facing prose.

Each lesson has three objectives, six questions across five types, five flashcards, guided and independent exercises with three hints and explicit `successCheck` fields, three references and an existing registered concept lab. The labs are labelled as related building blocks, not as complete implementations of each new topic.

All 15 lessons were read end to end during authorship and correction. Main code, quiz code and both exercise solutions were executed. Added examples include a restricted synthetic SABR smile fit and a seeded Monte Carlo Asian/barrier illustration. The barrier example is explicitly discretely monitored. Formal formula blocks are rendered by the focused KaTeX check.

This is not a full product sign-off. Final integrated rendering, independent end-to-end editorial review, all-platform runtime verification and complete source reachability remain open. Do not mark these rows as full rubric sign-offs while those checks are open.

## Evidence

- `scripts/check-additions.py` checks the 15 additions and all 12 assessments, executes the examples and code-output questions, checks quiz contracts, links, flashcards and explicit exercise checks, and independently recomputes new assessment numbers. It also enumerates all 24 permutations for the corrected four-candidate secretary strategy.
- `content/assessment-verification.json` records 74 independently recomputed existing assessment numeric answers. Eighteen new numeric answers are recomputed by `check-additions.py`.
- `scripts/check-additions-math.mjs` renders scoped math with KaTeX. See `content/additions-math-report.json`.
- `scripts/check-company-provenance.mjs` checks source/date metadata, preparation links and 210 per-company matrix cells against profile competencies. It is an internal consistency check, not proof of current hiring requirements.
- The permissive schema validator passed with 298 mapped lessons, zero errors and zero warnings in the isolated integration copy.
- TypeScript passed in that copy. No UI source was changed by this content package.
- Executed runtime: Python 3.10.12, GCC 11.4.0, Node 22.23.4. Python and GCC are below the requested minimums. Passing here does not close the requested Python 3.11+/GCC 12+ runtime gate.

The original unit suite returned 23/25: two tests still hard-code 283 authored lessons and fail solely because the scoped integration copy has 298. The shared test owner must derive expectations from the map rather than leave the old fixed count. This package does not edit shared tests.

Short-answer model answers also pass a local whole-token phrase-group check for every group. The actual updated shared grader was then supplied separately and transpiled/executed against all28 scoped short model answers: all pass with keyword score1.0. See additions-grader-report.json and check-additions-grader.cjs. The supplied updated32-test suite also passes32/32 against this298-lesson copy. Shared source/tests were used temporarily for verification only, restored afterwards and excluded from this owned package. Stem-only rubric terms were expanded to real word alternatives.

## Assessment corrections

The three new assessments are `assess-fixed-income`, `assess-statistics-ml` and `assess-python-numerics`, with 12 questions each. The complete set has 158 questions across 12 files. All questions have a teaching-lesson link; each assessment has an 80% practice threshold, time limit and three results bands.

Corrections to existing content include:

- RAII means Resource Acquisition Is Initialisation, not Resource Allocation.
- Automatic storage duration does not mandate one stack-pointer implementation.
- Virtual calls can sometimes be devirtualised; the language does not mandate exactly one vptr per object or a red-black-tree representation for `map`.
- The four-candidate secretary optimum rejects one candidate, not two. Its success probability is 11/24, verified by exhaustive enumeration.
- Effective spread uses the contemporaneous midpoint. The revised question explicitly asks for cents and correctly expects 2.00 cents, not 0.02 cents.
- The Black-Scholes question supplying rounded CDF values now expects the 7.96 implied by those given values, not the 7.97 obtained with a more precise CDF.
- Order acknowledgement timeout is an uncertain outcome. Retry or duplicate-ID behaviour must follow the venue protocol; there is no universal safe-resend guarantee.
- Pipeline quantiles do not simply add or multiply. Measure full-path latency and stage dependence.
- Raw tick logs and corrected analytical views are distinguished rather than claiming no tick data can ever be corrected.

MCQ correct options were repositioned deterministically without changing their meanings. The 43 assessment MCQs occupy positions 11/11/11/10; the 30 new-lesson MCQs occupy positions 8/8/7/7. Correct-option length outliers, short explanations and duplicate prompts are checked. One legacy assessment has only one MCQ, so within-assessment position variety is impossible there; overall balance remains within the required range.

## Career provenance

Fifteen profiles retain their original IDs and editorial preparation mappings. Twenty-nine short claim paraphrases have dates and sources. Role, skill and prep recommendations are explicitly editorial inference, not employer endorsements. The 210 per-company matrix cells are also inference; the sector matrix is a guide, not a universal hiring requirement.

Twelve profiles use readable official source pages checked on the review date. UBS's old rates job link returned a no-matching-jobs template. Citadel Securities and Millennium material was readable only as LinkedIn-hosted copies, without independent primary-employer verification. These three stay `unverified-recent` and require the visible 'Verify on the company site' treatment. No profile promises a current vacancy.

Jane Street's role-specific SWE guide rejects OCaml preference and mental-maths interview lore for SWE. Its 2 November 2026 update describes trial higher-level design, review and LLM rounds at some campus onsites, with most rounds still traditional coding. Those sources replace the earlier unsourced lore.

## Reference caveats

The 41 unique new-lesson references were transport-checked. Three dead links and one irrelevant redirect were replaced with separately discovered sources. All four replacements returned HTTP 200 in a later check. Some cppreference and SEC requests were blocked, although selected cppreference pages were readable through the public content fetch. Transport success is not a full relevance audit, and blocked references are not marked as passed. See `content/new-lesson-reference-transport.json` for the exact results.

## Integration

Copy the scoped files. Apply `content/new-lesson-insertions.json` idempotently by `moduleId` and `after`, preserving other curriculum changes. The complete curriculum file and registry are deliberately not in this package. Regenerate registry and packs after merging. Expose assessment `passMarkPercent`, `scoreBands` and `lessonId` links in the relevant UI, and use company `verificationStatus`, `asOf` and matrix `generatedAt` visibly. Run the integrated truth gate and inspect lesson, assessment and career rendering before calling the product ready.
