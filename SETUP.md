# QuantFoundry — Setup & Run Guide

QuantFoundry is a Duolingo-style quant-finance learning platform: 283 bite-sized
lessons across 11 phases, judged coding problems, timed drills, spaced-repetition
revision, interactive labs, assessments, career mapping and a study planner —
wrapped in a gamified XP/streak/quest system.

## Requirements

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 20.9 (22+ recommended) | runtime for Next.js 16 |
| Bun | ≥ 1.1 | package manager + script runner (`curl -fsSL https://bun.sh/install | bash`) |
| SQLite | bundled via Prisma | no server needed |

The code runner (in-browser C++/Python execution) resolves `g++` and `python3`
from your PATH at startup. Without them, coding problems fall back to a
client-side simulator — everything else works.

## Quick start (dev mode)

```bash
# 1. install dependencies (postinstall runs `prisma generate` automatically)
bun install

# 2. create + sync the SQLite database
bun run db:push

# 3. start the dev server on http://localhost:3000
bun run dev
```

Open **http://localhost:3000**, click **Register**, create your account —
**the first account you register becomes the admin** (sees the `/admin`
content-validation panel).

## Production mode

```bash
bun run build          # next build + assemble standalone output
bun run start          # serves on http://localhost:3000 (uses .next/standalone)
```

`bun run start` expects the env vars below (see `.env.example`); set
`DATABASE_URL` to an absolute path when running from the standalone folder:

```bash
DATABASE_URL="file:/absolute/path/to/db/custom.db" bun run start
```

## Code runner mini-service (optional, for judged problems)

Started automatically on first use (port **3010**), or manually:

```bash
cd mini-services/code-runner && bun install && bun run dev
```

## Environment

Copy `.env.example` to `.env` (a working `.env` ships with the project):

```
DATABASE_URL=file:../db/custom.db   # relative to prisma/schema.prisma
# SESSION_SECRET=change-me-in-production   # optional; has a dev fallback
```

## Scripts reference

| Command | What it does |
|---|---|
| `bun run dev` | Next dev server on :3000 |
| `bun run build` | production build (standalone output) |
| `bun run start` | run the production build |
| `bun run db:generate` | regenerate the Prisma client |
| `bun run db:push` | sync `prisma/schema.prisma` to SQLite |
| `node scripts/validate-content.mjs` | validate all 283 lesson JSON files |
| `node --test scripts/unit-tests.mjs` | run the 25 unit tests |
| `python3 scripts/seed-visual.py` | reseed the demo account with realistic progress |
| `bash scripts/audit-all.sh /tmp/audit http://localhost:3000` | screenshot every page for visual QA |

## Content model

All curriculum lives as schema-validated JSON under `content/`:
`lessons/` (11 phases), `problems/` (28 judged), `assessments/`,
`projects/`, `companies/`, `map/`, `registry.json`. Adding lessons requires
no frontend changes — validate with the script above or the `/admin` panel.

## Test accounts (shipped database)

| Email | Password | Purpose |
|---|---|---|
| `e2e@test.dev` | `e2etest12345` | progress-rich learner (11,408 XP) |
| `visual@test.dev` | `visualtest12345` | demo learner — 3 weeks of realistic progress (1,480 XP, 7-day streak), also admin |

For a clean start, delete `db/custom.db` and run `bun run db:push` again.

## Troubleshooting

- **Port 3000 busy** → `pkill -f "next dev"` then retry, or `PORT=3001 bun run dev`.
- **`prisma generate` skipped by npm** → npm 10+ may skip postinstall scripts;
  run `bun install` (recommended) or `npx prisma generate` manually.
- **Design tokens look off** → hard-refresh; the PWA service worker bumps on
  each release (`public/sw.js`, current cache `qf-v4`).
