# QuantFoundry Content Authoring Guide

This directory holds all curriculum content as structured JSON. Files are validated by
`scripts/validate-content.mjs` and read by the platform at runtime. **Do not edit
`content/map/curriculum.json` unless you are the integrator**: author lessons against
the map's module/lesson IDs.

## Lesson files

Path: `content/lessons/<moduleId>/<lessonId>.json` (one file per lesson, `<lessonId>`
must match the `id` in the curriculum map).

```jsonc
{
  "id": "arith-numbers-and-operations",        // must match map lesson id
  "moduleId": "ph1-arithmetic",                 // must match map module id
  "title": "Number Systems and the Four Operations",
  "estMinutes": 25,
  "difficulty": "foundation",                   // foundation | core | advanced | specialist
  "prereqs": [],                                // explicit lesson ids; empty requires entry-point review
  "objectives": ["...", "..."],                 // 3-5 measurable learning objectives
  "motivation": "2-4 sentences: a real problem this lesson solves.",
  "blocks": [ /* content blocks, see below */ ],
  "guidedExercise": {
    "prompt": "markdown, what the learner does",
    "hints": ["..."],
    "solution": "markdown worked solution"
  },
  "independentExercise": {
    "prompt": "markdown task with concrete numbers/context",
    "hints": ["..."],
    "solution": "markdown worked solution"
  },
  "commonMistakes": ["..."],
  "realWorldApplication": "1-3 sentences",
  "quantFinanceApplication": "1-3 sentences (omit if truly not applicable)",
  "summary": ["key point", "..."],
  "quiz": [ /* six knowledge-check questions, at least three types */ ],
  "flashcards": [ { "type": "definition|formula|concept|code-output", "front": "...", "back": "..." } ],  // 4-6
  "references": [ { "label": "cppreference: Range-for", "url": "https://..." } ],
  "skills": ["arithmetic"]                      // must be ids from map.skills
}
```

### Block types (all blocks inside `blocks`)

- `{ "type": "p", "md": "paragraph with **bold**, *italic* and inline math $x^2$ }`
- `{ "type": "h2", "text": "Section heading" }` / `{ "type": "h3", "text": "Sub" }`
- `{ "type": "math", "tex": "e^{i\\pi} + 1 = 0", "caption": "optional" }` for a display equation (KaTeX)
- `{ "type": "code", "lang": "cpp|python|bash|sql|text", "code": "...", "caption": "optional" }`
- `{ "type": "callout", "variant": "info|warn|pitfall|quant", "title": "...", "md": "..." }`
- `{ "type": "list", "ordered": false, "items": ["markdown item"] }`
- `{ "type": "table", "headers": ["A","B"], "rows": [["1","2"]] }`
- `{ "type": "steps", "title": "Worked derivation", "items": ["markdown step"] }`
- `{ "type": "interactive", "component": "ComponentName", "params": { ... }, "caption": "..." }`
- `{ "type": "ref", "items": [{ "label": "...", "url": "https://..." }] }`

### Interactive components (registered names: use exactly)

`NumberLine`, `FractionVisual`, `CompoundGrowth`, `FunctionPlotter`, `DerivativeLab`,
`IntegralLab`, `TaylorLab`, `VectorVisual`, `MatrixTransform`, `ProbabilitySimulator`,
`DistributionViewer`, `RandomWalk`, `BrownianMotion`, `ConfidenceIntervalLab`,
`RegressionLab`, `TimeSeriesDecompose`, `BlackScholesLab`, `PayoffDiagram`, `GreeksLab`,
`YieldCurveLab`, `EfficientFrontier`, `MonteCarloPi`, `OrderBookVisual`, `MatchingSim`,
`MemoryLayout`, `ComplexityCompare`, `SortingVisual`, `HashTableVisual`, `BSTVisual`,
`MarkovChainSim`, `BinomialTreeLab`, `VolatilitySmile`, `NormalConvergence`

### Quiz question types

```jsonc
{ "id": "q1", "type": "mcq", "prompt": "...", "options": ["a","b","c","d"], "answerIndex": 0, "explanation": "why" }
{ "id": "q2", "type": "ms",  "prompt": "...", "options": ["a","b","c","d"], "answerIndices": [0,2], "explanation": "..." }
{ "id": "q3", "type": "numeric", "prompt": "...", "answer": 42, "tolerance": 0.01, "unit": "optional", "explanation": "..." }
{ "id": "q4", "objective": 1, "type": "code-output", "prompt": "What does this print?", "code": "...", "language": "python", "answer": "exact stdout string", "explanation": "..." }
{ "id": "q5", "type": "short", "prompt": "...", "modelAnswer": "...", "keywords": ["eigenvalue|eigenvalues", "determinant|det", "zero|singular"], "explanation": "..." }
```

Rules: every question needs an `explanation`. `code-output` answers are compared trimmed/exact.
`short` answers are keyword-scored server-side. Numeric accepts `tolerance` (default 1e-6).

## Problem files (`content/problems/`)

```jsonc
{
  "slug": "running-median",
  "title": "Running Median",
  "difficulty": "hard",                 // easy | medium | hard
  "category": "quant-algorithms",       // fundamentals | arrays-strings | hashing | recursion | binary-search | trees | graphs | dynamic-programming | advanced | mathematics | probability | cpp-internals | concurrency | systems-design | quant-finance
  "tags": ["heaps", "streaming"],
  "statement": [ /* blocks as above (p, math, code, list, table allowed) */ ],
  "inputFormat": "markdown",
  "outputFormat": "markdown",
  "constraints": ["..."],
  "examples": [{ "input": "...", "output": "...", "explanation": "..." }],
  "hints": ["..."],
  "editorial": [ /* blocks */ ],
  "solutions": { "python": "code", "cpp": "code" },
  "tests": [{ "input": "...", "expected": "..." , "hidden": false }],
  "timeLimitMs": 4000, "memoryLimitMb": 256,
  "estMinutes": 25
}
```

I/O contract: program reads `input` on stdin, prints expected output on stdout.
Compare: split lines, trim trailing whitespace on each line, ignore trailing blank lines.
All test inputs are static strings. 8–15 tests per problem including edge cases.

## Assessment files (`content/assessments/`)

```jsonc
{
  "id": "diag-core",                    // assessments starting with "diag-" are diagnostics
  "title": "...",
  "kind": "diagnostic|assessment|interview|screening",
  "timeLimitMinutes": 40,               // 0 = untimed
  "description": "markdown",
  "areas": ["arithmetic", "algebra"],   // for diagnostics: scores per area
  "sections": [{
    "title": "...",
    "questions": [ /* same question schema as lesson quiz; numeric/mcq/ms/code-output/short */ ]
  }]
}
```

## Project files (`content/projects/`)

```jsonc
{
  "slug": "portfolio-analytics",
  "order": 5,
  "title": "Portfolio Analytics Engine",
  "language": "python|cpp|python-cpp",
  "difficulty": "core|advanced|capstone",
  "prereqLessons": ["lesson-id"],
  "context": "markdown: business/technical context",
  "problem": "markdown problem statement",
  "requirements": ["..."],
  "milestones": [{ "title": "...", "detail": "...", "estHours": 6 }],
  "designGuidance": [ /* blocks */ ],
  "starterFiles": [{ "path": "src/returns.py", "content": "..." }],
  "evaluationCriteria": [{ "criterion": "...", "weight": 25 }],
  "documentationRequirements": ["..."],
  "extensionChallenges": ["..."]
}
```

## Company profile files (`content/companies/`)

```jsonc
{
  "slug": "jane-street",
  "name": "Jane Street",
  "category": "prop-trading|asset-manager|bank|market-maker|fund",
  "roles": [{ "title": "...", "track": "C", "notes": "published facts only" }],
  "publishedExpectations": [{ "claim": "...", "sourceUrl": "https://...", "retrievedAt": "2026-11-09", "confidence": "sourced|inferred" }],
  "competencyAreas": ["probability", "mental-math"],
  "prepModules": ["ph6-probability-brainteasers"],
  "prepAssessments": ["apt-quantitative"],
  "notes": "honest guidance, mark inferences"
}
```

## Quality bar (non-negotiable)

1. **Teach, don't list.** Every lesson explains *why* before *how*. No naked formula dumps.
2. **Depth.** A lesson's blocks should total 600-1,100 words of real teaching content.
   Worked steps show actual numbers and actual arithmetic.
3. **Originality.** Write original explanations/examples; never copy textbooks.
4. **Correctness.** Verify every numeric example by hand (or reason it through carefully).
   Code samples must be correct for the stated language version and MUST be self-contained.
5. **Honesty.** No fabricated market data: use clearly-hypothetical illustrative numbers.
6. **LaTeX** uses KaTeX: `$...$` inline, `{"type":"math"}` display. Escape backslashes in JSON (`\\`).
   **Currency is NOT math**: write dollar amounts as `\$42.17` (escaped) so they are not parsed as math delimiters. Use plain `$...$` only for actual equations.
7. Quiz must actually test the objectives; distractors must be plausible, not jokes.


## Runtime and notation contract

Target runtime: Python 3.11 or newer, NumPy 2.x and modern C++20 with GCC 12
or newer. Reference verification on 2026-11-13 used Python 3.12.15, NumPy
2.5.4 and a separate Python 3.11.17 interpreter for code-output comparison.
The available GCC 11.4 compiler is below the required version. The truth gate
reports this as a failure, even when syntax checks pass. This document does not
claim that the deployment runner has been upgraded.

Use $S_t$ for an underlying price, $K$ for a strike, $r$ for the continuously
compounded risk-free rate, $q$ for dividend yield, $\sigma$ for annualised
volatility and $T-t$ for years to expiry. State day-count and compounding choices.
Use $P$ for a real-world probability measure and $Q$ for a pricing measure, and
name the measure when taking expectations. A return in decimal units is not a
percentage-point difference. Currency in Markdown must escape its dollar sign
(`\$42`, represented as `\\$42` inside JSON). Reserve unescaped dollar pairs for
math. Do not scrub minus signs, underscores, code, expected output or TeX.

## Executable samples and question fields

Code blocks accept `snippet: true` for a deliberate fragment, `file: "main.py"`
for its filename and `requires: ["statsmodels"]` for optional dependencies.
Declare the reason in the caption. These are factual declarations, never escape
hatches for broken complete examples. The UI should show filenames and dependency
requirements as chips. A fragment is deferred in the execution report, not passed.

Exercises accept the same metadata plus `successCheck`, a sentence that tells the
learner what observable result to verify. Both exercises need three escalating
hints. A solution containing fenced code is executed when it is not a declared
fragment. Prose-only solutions still need independent arithmetic review.

Each quiz question needs a zero-based `objective` index. Every objective must be
tested. Missing mappings and uncovered objectives fail schema validation and the
truth gate. Short answers need at least three `keywords` groups; use `|` within a
group for alternatives, for example `latency|delay`. The grader requires at least
60 percent of groups, respects token boundaries and applies light stemming.
Alternatives do not turn this into a semantic or contradiction-aware grader.
`modelAnswer` remains required. Noninteger numeric answers need a stated positive
absolute `tolerance`. Code-output answers are strings.

## Reproducible checks and honest reports

- `node scripts/content-truth.mjs`: strict gate, writes `.truth-report.json` and
  `.truth-exec.json`; exits nonzero for failures or unresolved execution deferrals.
- `node scripts/check-content-urls.mjs 64`: check up to 64 unrecorded public URLs,
  persist timestamps, status codes and redirects in `.truth-urls.json`. A 404 or
  method-not-allowed HEAD is retried using GET. Cached responses are transport
  evidence, never proof of page relevance or freedom from soft 404s. Remove a
  saved URL result deliberately when a new transport check is needed.
- `node scripts/spell-check.mjs`: editorial spelling scan, protecting code and
  identifiers. Inspect each finding rather than applying global replacements.
- `node scripts/content-times.mjs`: check study-time values. Add `--write --map`
  only as integrator, after all lesson insertions are applied.
- `node scripts/validate-content.mjs --registry`: schema gate and registry rebuild.
- `node scripts/unit-tests.mjs`: includes the actual TypeScript question grader.

Set `QF_PYTHON` and `QF_CXX` to explicit runtime paths when needed. Put both
`python3.11` and `python3.12` on PATH to check cross-version answers. Execution
uses isolated temporary directories and timeouts, but is not a security sandbox
for hostile programs. Only run it on trusted reviewed project content. Cache
keys include content, runtime versions, package versions and checker version.

Estimated time is the nearest five minutes to body words / 200, plus one minute
per quiz question, eight for the guided exercise, twelve for the independent
exercise and three per interactive, clamped to 10-60 minutes. The calculation
does not establish editorial quality.

`.truth-before.json` is an untouched-snapshot run under the new checker. It is
not the narrower original appendix audit. Compare like-for-like categories and
retain failures. `REVIEW-LOG.md` records actual review status; automated checks
are not end-to-end lesson sign-off.
