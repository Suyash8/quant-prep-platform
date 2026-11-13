# QuantFoundry setup

Everything here is taken from the current package files (`package.json`, `prisma/schema.prisma`,
`.env.example`, `src/lib/auth.ts`, `src/lib/runner-client.ts`). If something here disagrees with those files,
the files win.

## Requirements
- Node.js 20 or newer (the checkpoint was built and tested on Node 22).
- PostgreSQL. SQLite is not supported (`prisma/schema.prisma` uses the `postgresql` provider).
- Bun on your PATH. The app starts the code-runner service with `bun mini-services/code-runner/index.ts`
  (`src/lib/runner-client.ts`), and `npm start` uses `bun` as well. `package.json` does not declare Bun,
  so install it yourself.
- For running submitted code: `python3` and `/usr/bin/g++` on the machine that runs the runner
  (`mini-services/code-runner/index.ts`). Without them, code submission fails and everything else works.
  The problem checks were run on Python 3.12 and GCC 12.4, so use those or newer.

## Environment variables (`.env.example`)
| Variable | Required | Meaning |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string. |
| `SESSION_SECRET` | yes in production | Signs session cookies. Generate one with `openssl rand -hex 32`. In production the app refuses to start without it; only non-production runs fall back to a built-in development value. |
| `CODE_RUNNER_URL` | no | URL of an external runner. Default is the local runner on `127.0.0.1:3010`. |

Do not commit `.env`. The package does not ship one.

## Install and run
```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then edit DATABASE_URL and SESSION_SECRET
npm run db:push             # applies prisma/schema.prisma to the database (see warning below)
node scripts/validate-content.mjs --registry   # regenerates content/registry.json; also prints content errors
npm run dev                 # http://localhost:3000
```
`npm run db:push` runs `prisma db push --accept-data-loss`. It can drop data in an existing database,
so point it only at a database you are happy to change.

Production build and start:
```bash
npm run build               # builds content packs, runs next build, then copies assets into .next/standalone
NODE_ENV=production PORT=3000 node .next/standalone/server.js     # or: npm start (uses bun)
```
Load `.env` into the environment first (for example `set -a; . ./.env; set +a`); the standalone server
does not read it for you.

The first account registered becomes the administrator (`src/app/api/auth/register/route.ts`).

## Content checks
`node scripts/validate-content.mjs` is the strict validator. In this checkpoint it is **red** (roughly 2,700
errors, mostly quiz questions without objective mappings). That is a known content gap, not a setup problem.
Counts of lessons, problems and assessments come from `content/registry.json`, not from this file.

## Verification scripts
Scripts that sign in need an account you created: set `QF_DEMO_EMAIL` and `QF_DEMO_PASSWORD` in your shell.
No credentials are shipped.

| Command | What it checks |
|---|---|
| `node --test scripts/unit-tests.mjs` | unit tests (grading, mastery, gamification) |
| `npx tsc --noEmit` / `npm run lint` | types / lint |
| `node scripts/offline-check.mjs` | real-browser offline test (needs a running server and Playwright) |
| `node scripts/verify-sync-*.mjs`, `verify-security-fixes.mjs`, `verify-runner-epipe.mjs` | sync and server regressions |
| `node scripts/verify-hidden-all.mjs` | hidden test output never reaches the browser (paced to respect the rate limit) |
| `npm run check:expressions`, `check:taylor`, `check:matrix` | lab math regressions |
| `node scripts/check-lab-params.mjs` | lists lesson lab params a lab does not read (static scan, candidates only) |
| `node scripts/seed-visual.mjs` | seeds learner progress for the account in `QF_DEMO_EMAIL` (register it first; needs `DATABASE_URL`) |

The older `scripts/*-v3.sh`, `audit-all.sh` and `mini-audit.sh` belong to the original project's harness and
were not re-verified for this checkpoint.
