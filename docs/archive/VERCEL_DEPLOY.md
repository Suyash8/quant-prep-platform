# Deploying QuantFoundry to Vercel

The first deployment failed because the app used **SQLite** (`file:...` database).
Vercel's serverless functions have an **ephemeral, read-only filesystem**, there is no
place for a database file to live, so every DB query (including login) crashed.

The project now uses **PostgreSQL** via Prisma. Follow these steps to go live.

---

## 1. Create a free Postgres database

Pick one (all have free tiers):

| Provider | How |
| --- | --- |
| **Vercel Postgres** (recommended, zero-config) | Vercel Dashboard → your project → **Storage** tab → **Create Database** → Neon (Postgres). Vercel injects `DATABASE_URL` automatically. |
| **Neon** | [neon.tech](https://neon.tech) → new project → copy the **pooled** connection string. |
| **Supabase** | [supabase.com](https://supabase.com) → new project → Settings → Database → **Connection Pooling** (port 6543) string. |

> For serverless, always use the **pooled** connection string (Neon: the host contains
> `-pooler` and/or port `6543`; Supabase: port `6543`).

## 2. Create the tables (one-time)

From your machine, inside the project folder:

```bash
npm install                      # or: bun install
# put your cloud DATABASE_URL in .env (copy .env.example)
npx prisma db push               # or: bunx prisma db push
```

This creates all tables in the cloud database. `prisma generate` runs automatically
on Vercel during install (`postinstall` script), so no extra build step is needed.

## 3. Environment variables in Vercel

Vercel Dashboard → your project → **Settings → Environment Variables**:

| Name | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://...` | **Skip this if you created the DB via the Storage tab**, Vercel injects it. Use the *pooled* URL for Neon/Supabase. |
| `SESSION_SECRET` | any long random string (`openssl rand -hex 32`) | Signs login cookies. Without it a default dev secret is used, fine to start, set it before real users. |
| `CODE_RUNNER_URL` | *(optional)* | Only needed for in-browser code submission (practice judge). See §6. |

Then **Redeploy** (Deployments → latest → Redeploy) so the new env vars take effect.

## 4. First user = admin

The **first account registered** on the deployment automatically becomes `admin`.
Register immediately after deploying if you want admin rights.

## 5. What works on Vercel

- ✅ Landing, auth (register/login/logout), curriculum, all lessons, quizzes,
  flashcards, spaced repetition (revision), drills, assessments, planner, analytics,
  projects tracker, career tracker, settings, notes, bookmarks, XP/streaks.
- ⚠️ **Live code submission** (C++/Python judge) needs a long-lived process, which
  serverless can't spawn. See §6.
- ⚠️ Admin content import (uploading new lesson JSONs) writes to disk, not possible
  on Vercel. Content is bundled with the deploy; edit `content/` and redeploy instead.

## 6. Code runner (optional, later)

The judge is a separate mini-service (`mini-services/code-runner`). To enable it in
production, host it on any VM/container (Fly.io, Railway, a $5 VPS) and set:

```
CODE_RUNNER_URL=https://<runner-host>:3010
```

Everything else works without it, the UI shows a clear message instead of crashing.

## 7. Local development

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL (any Postgres) + SESSION_SECRET
npx prisma db push
npm run dev                   # http://localhost:3000
```

You can point local dev at the same cloud database, or run Postgres locally
(`docker run -p 5432:5432 -e POSTGRES_PASSWORD=qf postgres:17`).

## Troubleshooting

- **500 on every page after deploy** → `DATABASE_URL` missing/wrong in Vercel env vars.
- **`PrismaClientInitializationError`** → DB unreachable: check you used the *pooled*
  URL and allowed connections from Vercel's IPs (Neon/Supabase allow all by default).
- **Lesson pages 404/500 with `ENOENT content/...`** → make sure your deploy includes
  the `next.config.ts` `outputFileTracingIncludes` setting (it's already in the repo).
- **Build fails with `cp: .next/standalone`** → you're on an old commit; the build
  script now uses `scripts/post-build.cjs` which is Vercel-safe.
