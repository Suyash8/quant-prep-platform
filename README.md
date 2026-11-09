# QuantFoundry

**The complete Zero-to-Quantitative-Developer learning platform.**

An interactive, prerequisite-sequenced curriculum that takes a learner from absolute zero — no programming, no mathematics beyond arithmetic — to professional-level quantitative software engineering: mathematics through stochastic calculus, modern C++ through lock-free concurrency, Python through scientific computing, finance from first principles, and the systems engineering that binds them.

---

## Quick start

```bash
# 1. Install dependencies
bun install

# 2. Configure the database (SQLite by default; see below for PostgreSQL)
echo 'DATABASE_URL="file:./db/custom.db"' > .env

# 3. Push the schema
bun run db:push

# 4. Validate the curriculum content (283 lessons, 16 problems, 7 assessments, 10 projects, 15 company profiles)
node scripts/validate-content.mjs --registry

# 5. Start the app
bun run dev          # http://localhost:3000
```

The first registered account automatically becomes the platform **administrator**.

The **code runner** (a separate service that compiles C++ and executes Python for practice submissions) starts on demand the first time you submit code; you can also run it explicitly:

```bash
bun mini-services/code-runner/index.ts    # 127.0.0.1:3010
```

---

## What is inside

| Area | Details |
|---|---|
| Curriculum | 283 fully-authored lessons across 11 phases and 65 modules (`content/lessons/`), validated by `scripts/validate-content.mjs` |
| Interactive labs | 33 client-side visualisation engines (derivative/integral labs, Black-Scholes, order books, memory layout, Monte Carlo, …) embedded in lessons and browsable at `/lab` |
| Coding practice | 16 judged problems with genuine C++17/C++20 compilation (g++) and Python 3 execution in an isolated runner service; server-side test scoring |
| Assessments | Placement diagnostic (7 areas × 4 questions), five timed subject assessments, one screening simulation — all scored server-side |
| Mastery engine | Knowledge-check ≥ 80% + completed exercises = *passed*; a later successful spaced-retrieval review = *mastered*; repeated failure = *needs revision* |
| Revision | SM-2 spaced repetition over lesson-generated flashcards plus questions you missed |
| Mental math | Timed drill engine (8 modes, 10 levels) with accuracy/speed tracking and weak-area detection |
| Planner | Schedule generated from your hours/days/track/mode over the prerequisite topological order — with honest feasibility statements |
| Projects | 10 portfolio project specifications with milestones, starter files, weighted evaluation criteria and extension challenges |
| Career centre | 15 researched company profiles with sourced-vs-inferred labelling, a cross-employer requirements matrix, resume guidance and an application tracker |
| Analytics | Study time, skill mastery, problem accuracy, revision consistency and bottleneck detection — all computed from real activity |

## Architecture

```
├── content/                     # Curriculum as validated JSON (source of truth)
│   ├── map/curriculum.json      #   phases → modules → lessons, skills, tracks
│   ├── lessons/<module>/<id>.json
│   ├── problems/ assessments/ projects/ companies/
│   └── README.md                #   content schemas + quality bar
├── src/
│   ├── app/                     # Next.js 16 App Router
│   │   ├── (public)             #   landing, curriculum, methodology, login/register
│   │   ├── learn/[lessonId]/    #   lesson player (blocks, exercises, server-scored quiz)
│   │   ├── practice/[slug]/     #   coding workspace (Monaco + judge)
│   │   ├── diagnostic|assessments|revision|drills|lab|projects|career|analytics|planner|settings|admin
│   │   └── api/                 #   auth, progress, judge, revision, drills, planner, admin…
│   ├── components/
│   │   ├── interactive/         #   33 lab components + registry
│   │   └── …                    #   lesson renderer, quiz, workspace, planner…
│   └── lib/                     # content loaders, auth (scrypt+sessions), mastery/SM-2, grading, runner client
├── mini-services/code-runner/   # purpose-built sandboxed execution service (port 3010, loopback)
├── prisma/schema.prisma         # learner state: users, sessions, progress, attempts, cards, plans…
├── scripts/
│   ├── validate-content.mjs     # content gate (schema, quiz answers, math balance, prereqs, coverage)
│   ├── unit-tests.mjs           # node --test suite: mastery, SM-2, grading, evaluator, graph, content
│   └── repair-json.mjs
└── db/                          # SQLite database file
```

### Key engineering decisions

- **Content as validated files, not database rows.** Curriculum JSON is the source of truth; the database stores only learner state. Adding a lesson requires no frontend change and no migration — the validator gate enforces the schema, quiz answer integrity, KaTeX delimiter balance, prerequisite resolvability and interactive-component registration.
- **Server-side scoring everywhere.** Correct quiz/assessment answers never reach the browser before submission; submissions are graded against content JSON on the server (`src/lib/grading.ts`).
- **Isolated code execution.** Submissions are proxied from the Next.js server to a dedicated runner process (`mini-services/code-runner`) that compiles with `g++ -std=c++17/20` and executes Python in an ephemeral temp directory with a clean environment, `ulimit` address-space/CPU/process/file-size limits, wall-clock SIGKILL, output caps and a bounded job queue. **The web server never executes untrusted code in its own process.**
- **Honest progress.** Every displayed metric is computed from real activity; nothing is seeded to look busy. Unpublished curriculum topics are labelled *in development* rather than stubbed.
- **Auth** is self-contained: scrypt password hashing, httpOnly signed session cookies, in-memory token-bucket rate limiting on auth and judge endpoints, Zod validation on every API route.

### Switching to PostgreSQL

The Prisma datasource is SQLite for zero-config local use. For production, change `provider` in `prisma/schema.prisma` to `"postgresql"`, point `DATABASE_URL` at your instance and run `bun run db:push` — the schema uses no SQLite-specific features.

### Production-grade code execution

The bundled runner isolates jobs at process level. For container-grade isolation, run the same service inside Docker/gVisor and keep the identical HTTP contract (`POST /submit`, `POST /run`, `GET /health`) — the web tier needs no changes. Network access for user code can then be removed at the container level.

## Testing

```bash
node --test scripts/unit-tests.mjs      # 21 tests: mastery, SM-2, grading, math evaluator, graph integrity, content
node scripts/validate-content.mjs       # full curriculum gate (exit code = pass/fail)
bun run lint                            # eslint
bunx tsc --noEmit                       # types
```

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Prisma datasource | `file:./db/custom.db` |
| `SESSION_SECRET` | Session-cookie signature (set in production) | dev fallback |

No other secrets are required; the platform has no third-party API dependencies.

## Known limitations

- SQL problem execution is **not enabled** (the runner rejects `sql` jobs explicitly); C++17, C++20 and Python 3 are fully supported.
- The runner provides process-level, not container-level, isolation (see above for the production path).
- Playwright E2E specs are not bundled; the golden-path journeys (register → diagnostic → lesson → quiz → practice run/submit → revision) are verified manually and documented here.
- Curriculum modules without authored lessons would be labelled *in development* — currently **all 283 mapped lessons are authored**, so no module shows that state.

## Deployment

```bash
bun run build        # next build (standalone output)
NODE_ENV=production bun .next/standalone/server.js
```

Set `DATABASE_URL` and `SESSION_SECRET` in the environment; run `bun run db:push` against the production database before first start. The code-runner service must be reachable at `127.0.0.1:3010` (it is spawned automatically by the API tier if missing).
