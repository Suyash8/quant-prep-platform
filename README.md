# QuantFoundry

**Zero-to-Quantitative-Developer learning platform (v4.2 checkpoint). Offline support is best effort; see CHECKPOINT-v4.2.md.**

An interactive, prerequisite-sequenced curriculum that takes a learner from absolute zero, no programming, no mathematics beyond arithmetic, to professional-level quantitative software engineering: mathematics through stochastic calculus, modern C++ through lock-free concurrency, Python through scientific computing, finance from first principles, and the systems engineering that binds them.

---

## Quick start

```bash
# 1. Install dependencies
bun install

# 2. Configure the database (PostgreSQL; see VERCEL_DEPLOY.md for hosted setup)
cp .env.example .env   # then set DATABASE_URL and SESSION_SECRET (see SETUP.md)

# 3. Push the schema
bun run db:push

# 4. Validate the curriculum content (counts are in content/registry.json)
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

## What is new in v3: offline-first, native feel

Every keystroke of the learning loop now runs on the device. Nothing waits on a server.

- **Instant scoring.** Quizzes grade in the browser with the exact same grader the server uses. No round trip, no spinner, works on a plane.
- **Instant lessons.** Lessons render client-side from versioned content packs (static JSON under `/packs/v3/`). Moving between lessons is immediate after the first visit.
- **Local-first progress.** XP, streaks, mastery status and revision scheduling are written to local storage first, then synced to the server in the background through `/api/sync`. Events are idempotent, so double-sends and reconnects never double-count.
- **Download everything.** Settings → Offline saves all lessons, every problem, assessment and project plus the app pages themselves. After that the whole platform opens and scores with zero network.
- **PWA.** Install it from the browser, work offline for weeks, sync when you reconnect. The service worker rewrites the cached lesson shell per URL so any lesson route hydrates offline.

What still needs the network: compiling and running your practice code (that is a real compiler in a sandbox) and account management. Everything else is local.

## What is inside

| Area | Details |
|---|---|
| Curriculum | Lessons across 11 phases (see content/registry.json for the count) (`content/lessons/`), validated by `scripts/validate-content.mjs` |
| Interactive labs | 33 client-side visualisation engines (derivative/integral labs, Black-Scholes, order books, memory layout, Monte Carlo and more) embedded in lessons and browsable at `/lab` |
| Coding practice | 28 judged problems with genuine C++17/C++20 compilation (g++) and Python 3 execution in an isolated runner service |
| Assessments | Placement diagnostic (7 areas x 4 questions), timed subject assessments and a screening simulation, graded locally, synced server-side |
| Mastery engine | Knowledge-check >= 80% + completed exercises = *passed*; a later successful spaced-retrieval review = *mastered*; repeated failure = *needs revision* |
| Revision | SM-2 spaced repetition over lesson-generated flashcards plus questions you missed, running fully client-side |
| Mental math | Timed drill engine (8 modes, 10 levels) with accuracy/speed tracking and weak-area detection |
| Planner | Schedule generated from your hours/days/track/mode over the prerequisite topological order, with honest feasibility statements |
| Projects | 12 portfolio project specifications with milestones, starter files, weighted evaluation criteria and extension challenges |
| Career centre | 15 researched company profiles with sourced-vs-inferred labelling, a cross-employer requirements matrix, resume guidance and an application tracker |
| Analytics | Study time, skill mastery, problem accuracy, revision consistency and bottleneck detection, all computed from real activity |

## Architecture

```
├── content/                     # Curriculum as validated JSON (source of truth)
│   ├── map/curriculum.json      #   phases -> modules -> lessons, skills, tracks
│   ├── lessons/<module>/<id>.json
│   ├── problems/ assessments/ projects/ companies/
│   └── README.md                #   content schemas + quality bar
├── public/packs/v3/             # generated content packs for the offline client
│   ├── manifest.json map.json   #   built by scripts/build-content-packs.cjs
│   └── lessons/ problems/ …
├── src/
│   ├── app/                     # Next.js 16 App Router
│   │   ├── learn/[lessonId]/    #   thin auth shell + client lesson player
│   │   ├── dashboard|revision|practice|drills   # local-first client pages
│   │   └── api/                 #   auth, sync, judge, progress, admin…
│   ├── components/
│   │   ├── learn/               #   client pages (dashboard, lesson, revision, offline manager)
│   │   ├── gamified/            #   lesson player, learning path, confetti
│   │   └── interactive/         #   33 lab components + registry
│   └── lib/
│       ├── client/              #   pack store + local-first progress + sync engine
│       ├── curriculum-graph.ts  #   isomorphic prerequisite graph
│       ├── grading.ts mastery.ts#   isomorphic graders (same code server + client)
│       └── gamification-core.ts #   pure XP math, shared by both sides
├── mini-services/code-runner/   # purpose-built sandboxed execution service (port 3010, loopback)
├── prisma/schema.prisma         # users, sessions, progress, attempts, cards, sync events…
└── scripts/
    ├── build-content-packs.cjs  # generates public/packs/v3 (runs in the build)
    ├── validate-content.mjs     # content gate (schema, answers, math, prereqs)
    ├── smoke-v3.sh              # end-to-end server smoke test
    └── detok-content.py         # copy cleanup tools (em-dashes, AI words)
```

## Deployment

See `VERCEL_DEPLOY.md`. Content packs are generated during `npm run build`, so hosted deployments need no extra steps. PostgreSQL is required (SQLite cannot persist on serverless hosts).

## Testing

```bash
npx tsc --noEmit                # types
node scripts/validate-content.mjs --registry   # content
bash scripts/smoke-v3.sh        # server + sync + packs + pages (starts its own server on :3004)
```
