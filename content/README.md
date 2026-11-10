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
  "prereqs": [],                                // lesson ids; empty = sequential within module
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
  "quiz": [ /* knowledge-check questions, 4-6 */ ],
  "flashcards": [ { "type": "definition|formula|concept|code-output", "front": "...", "back": "..." } ],  // 3-6
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
{ "id": "q4", "type": "code-output", "prompt": "What does this print?", "code": "...", "language": "python", "answer": "exact stdout string", "explanation": "..." }
{ "id": "q5", "type": "short", "prompt": "...", "modelAnswer": "...", "keywords": ["eigenvalue", "det"], "explanation": "..." }
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
2. **Depth.** A lesson's blocks should total ~500-900 words of real teaching content.
   Worked steps show actual numbers and actual arithmetic.
3. **Originality.** Write original explanations/examples; never copy textbooks.
4. **Correctness.** Verify every numeric example by hand (or reason it through carefully).
   Code samples must be correct for the stated language version and MUST be self-contained.
5. **Honesty.** No fabricated market data: use clearly-hypothetical illustrative numbers.
6. **LaTeX** uses KaTeX: `$...$` inline, `{"type":"math"}` display. Escape backslashes in JSON (`\\`).
   **Currency is NOT math**: write dollar amounts as `\$42.17` (escaped) so they are not parsed as math delimiters. Use plain `$...$` only for actual equations.
7. Quiz must actually test the objectives; distractors must be plausible, not jokes.
