# QuantFoundry, Architecture & Curriculum Documentation

## 1. Overview

QuantFoundry is a full-stack learning platform built to the master specification: a complete
zero-to-quantitative-developer programme combining interactive mathematics education, a serious
coding-practice environment with real code execution, an assessment/mastery engine, spaced
revision, project-based learning and a research-grounded career centre.

- **Framework:** Next.js 16 (App Router) + TypeScript 5 + Tailwind CSS 4
- **Database:** Prisma ORM (SQLite datasource, PostgreSQL-compatible schema)
- **Editor:** Monaco (bundled locally, graceful textarea fallback)
- **Mathematics:** KaTeX (server-rendered in lessons, client-rendered in quizzes)
- **Execution:** dedicated sandboxed runner mini-service (Bun), genuine g++ compilation and Python 3

## 2. Content architecture

All curriculum content lives under `content/` as JSON, validated by `scripts/validate-content.mjs`:

```
content/
├── map/curriculum.json      # the full programme: 11 phases, 65 modules, 283 planned lessons,
│                            # skills vocabulary, track mapping (A to E)
├── lessons/<moduleId>/<lessonId>.json   # one file per lesson
├── problems/<slug>.json     # judged coding problems (tests, editorial, reference solutions)
├── assessments/<id>.json    # diagnostic + timed assessments + screening simulation
├── projects/<slug>.json     # 10 project specifications
├── companies/<slug>.json    # 15 researched employer profiles (+ _matrix.json requirements matrix)
└── registry.json            # generated lesson index (node scripts/validate-content.mjs --registry)
```

### Lesson schema (summary)

Every lesson carries: stable `id` (matches the map), `moduleId`, title, estimated minutes,
difficulty (foundation/core/advanced/specialist), explicit prerequisites, objectives, motivation,
content `blocks`, guided + independent exercises with worked solutions, common mistakes, real-world
and quant-finance applications, summary, a 4 to 6 question knowledge check with answers + explanations,
flashcards, references and skill tags. Block types: `p, h2, h3, math, code, callout, list, table,
steps, interactive, ref`. Question types: `mcq, ms, numeric, short, code-output`.

Content conventions:
- Inline math uses `$...$` (KaTeX); currency is escaped as `\$` so it is never parsed as math;
  math spans may contain `\$` for amounts (e.g. `$F = \$104$`).
- Interactive blocks reference components registered in `src/components/interactive/registry.tsx`,
  the validator rejects unregistered names, so lessons can never embed a broken lab.
- Every numeric worked example is hand-verified; quiz `code-output` answers are exact stdout strings.

### Validation gate

`node scripts/validate-content.mjs` checks: schema shape, id/filename match, map membership,
prerequisite resolvability, quiz answer material presence (server-side grading contract), ≥3 quiz
questions with explanations, flashcards/summary minimums, interactive-component registration,
KaTeX delimiter balance, table row widths, problem test counts and reference solutions, project
evaluation-weight sums (must equal 100), and assessment section integrity. Coverage against the
map is reported per phase. `--registry` regenerates `content/registry.json`.

Adding content = add JSON files + run the validator. No application code changes are required,
the admin panel (`/admin`, admin role) also validates on demand and accepts bulk JSON imports.

## 3. Application architecture

### Rendering

Server Components render all content surfaces (curriculum tree, lesson blocks, problem statements,
company profiles, analytics). Client Components are used only where interaction requires it:
quiz inputs, exercise reveal, code workspace, labs, drills, planner controls, trackers.

### Data model (prisma/schema.prisma)

Learner state only (curriculum lives in files):

| Model | Purpose |
|---|---|
| User, Session | credential auth (scrypt), signed httpOnly session cookies, roles (learner/admin) |
| DiagnosticResult | per-area baseline scores |
| LessonProgress | status (not_started → in_progress → attempted → passed → mastered / needs_revision), best knowledge-check %, attempts, exercise + retrieval flags |
| AssessmentAttempt | per-question results JSON for review mode |
| ProblemAttempt | submission history per problem (language, verdict, tests passed) |
| CardState | SM-2 state per flashcard (ease, interval, repetitions, lapses, dueAt) |
| DrillSession | timed mental-math sessions |
| ProjectProgress | self-logged milestones, status, notes |
| Note, Bookmark | per-lesson notes and bookmarks |
| StudyPlan | planner configuration + generated schedule |
| LearningSession | study-time heartbeats (kind, seconds, day) |
| Application | career-centre application tracker |
| UserSkill | derived skill mastery estimates |

### Mastery model (`src/lib/mastery.ts`)

- **passed** = knowledge-check best ≥ 80% AND practical exercise complete.
- **mastered** = passed AND retrieval complete (a lesson flashcard reviewed successfully after it
  was due, or ≥70% on a later cumulative assessment marking retrieval).
- **needs_revision** = two or more failing attempts below threshold.
- Guessing is bounded by the anti-brute-force design: scoring is server-side, submissions are
  rate-limited, and the exercise requirement prevents quiz-only progression.

### Spaced repetition (`sm2` in mastery.ts)

Standard SM-2: grade 0 to 5, ease floor 1.3, intervals 1 → 6 → interval × ease (capped at 365d),
lapses reset repetitions. Quiz-miss cards graduate (are removed) after two consecutive grades ≥ 4.

### Prerequisite graph (`getCurriculumGraph`)

Sequential chaining within modules + explicit lesson prereqs, resolved to a DAG and topologically
ordered. Lesson unlock = all prereqs passed/mastered. The planner schedules lessons strictly in
this order; the dashboard recommends the first unlocked, unpassed lessons.

## 4. Code execution service

`mini-services/code-runner/index.ts`, Bun HTTP service bound to `127.0.0.1:3010`:

- `POST /submit`, compile (C++17/20: `g++ -O2 -pipe -DONLINE_JUDGE`) then run each test:
  stdin supplied per test, stdout compared line-aware (trailing whitespace trimmed, trailing
  blank lines ignored); returns per-test verdicts, timings, stderr, expected/actual diffs.
- `POST /run`, single execution against custom stdin (used by the workspace Console).
- `GET /health`, liveness.

Isolation measures: separate process from the web tier; ephemeral `mkdtemp` workspace removed
after the job; `env -i` clean environment; `ulimit` address space (memory limit per problem),
CPU time, file size and process count; wall-clock timeout with SIGKILL; 256 KB stdout cap;
1 MB stdin cap; 128 KB code cap; max 2 concurrent jobs with FIFO queueing. The Next.js tier
(`src/lib/runner-client.ts`) health-checks and auto-spawns the service, rate-limits submissions
and never trusts client input for tests, expected outputs come from validated content files.

**Production note:** containerise the runner (Docker/gVisor, no network namespace) for
container-grade isolation; the HTTP contract is unchanged.

## 5. API surface (all Zod-validated, server-authorised)

| Route | Function |
|---|---|
| `POST /api/auth/register·login·logout`, `GET /api/auth/me` | credential auth + session |
| `POST /api/progress/lesson` | knowledge-check scoring, exercise completion, mastery updates, flashcard creation |
| `POST /api/assessments/submit` | timed assessment scoring (per-section, per-area for the diagnostic), retrieval marking |
| `POST /api/judge/run`, `POST /api/judge/submit` | code execution / test-suite judging via runner |
| `POST /api/revision/review` (+PUT session log) | SM-2 grading, retrieval-mastery upgrades |
| `POST /api/drills/session` | mental-math session logging |
| `POST /api/planner` | prerequisite-ordered schedule generation with feasibility statement |
| `POST /api/projects/progress` | milestone/status/notes tracking |
| `POST /api/notes` | lesson notes (autosave) and bookmark toggling |
| `POST /api/applications` | application tracker CRUD |
| `POST /api/settings` | profile updates |
| `GET /api/admin/validate`, `POST /api/admin/import` | admin content validation and bulk import (admin role) |

## 6. Design system

Warm off-white light theme (`#faf9f7`) and charcoal dark theme (`#14171b`), deep navy accent
(`#1e3a5f`), subdued success/warning/danger, Inter (variable) for interface text, JetBrains Mono
for code and numerics (`.tnum`), KaTeX for mathematics. Restrained chips, hairline borders,
academic reading rhythm (`prose-qf`), thin scrollbars, visible focus rings, reduced-motion support.
No purple gradients, glassmorphism, sparkle icons or AI-marketing language anywhere.

## 7. Learning-science grounding

Retrieval practice (knowledge checks before solutions; reveal-after-recall flashcards),
spaced repetition (SM-2), interleaving (practice bank by topic filters), progressive difficulty
(foundation → specialist levels, drill levels 1 to 10), immediate corrective feedback (every quiz
answer carries an explanation shown after submission), desirable difficulty (mastery thresholds),
and cumulative assessment (subject assessments mark passed lessons retrieval-verified).
