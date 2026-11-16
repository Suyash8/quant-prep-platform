# QuantFoundry

Interactive quantitative developer preparation platform spanning foundations in mathematics, systems, C++, Python, statistics, pricing, and market microstructure.

## Architecture

- **Web App**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + KaTeX + Monaco Editor.
- **Database**: PostgreSQL with Prisma ORM (`prisma/schema.prisma`, versioned migrations in `prisma/migrations/`).
- **Content Packs & Tier-2 Answer Delivery**: Static curriculum packs under `public/packs/v3/` for fast offline reading (with quiz keys, reference solutions, and editorials stripped), paired with server-side grading (`/api/progress/lesson`, `/api/progress/lesson/check`, `/api/assessments/submit`) and authenticated post-pass/post-solve answer delivery (`/api/packs/answers/[kind]/[id]`).
- **Sandboxed Code Runner**: Dedicated HTTP runner service (`mini-services/code-runner/`) executing C++17, C++20, and Python 3 submissions under strict CPU, memory, and output limits behind bearer-token authentication.

## Quick Start (Local Development)

1. **Install dependencies & generate Prisma Client**
   ```bash
   npm ci
   npx prisma generate
   ```

2. **Configure environment**
   Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` (PostgreSQL connection string)
   - `SESSION_SECRET` (minimum 32 characters)
   - `CODE_RUNNER_AUTH_TOKEN` (minimum 32 characters; shared with `mini-services/code-runner`)
   - `CODE_RUNNER_URL` (`http://127.0.0.1:4100` for local runner)
   - `CRON_SECRET` (bearer token for `/api/cron/cleanup`)
   - Optional: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`, `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_NOTIFY_EMAIL`, `NEXT_PUBLIC_APP_URL`.

3. **Apply database migrations**
   ```bash
   npx prisma migrate deploy
   ```

4. **Start the code runner (in another terminal)**
   ```bash
   PORT=4100 CODE_RUNNER_AUTH_TOKEN="$CODE_RUNNER_AUTH_TOKEN" QF_PROBLEMS_DIR=./content/problems bun run mini-services/code-runner/index.ts
   ```

5. **Start the dev server**
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — Start development server on port 3000.
- `npm run build` — Rebuild static content packs, run Next.js production build, and execute post-build checks.
- `npm start` — Run the production standalone server (`node .next/standalone/server.js`).
- `npm test` — Execute unit & security regression tests (`scripts/unit-tests.mjs`).
- `npm run verify:content` — Run `validate-content.mjs --registry` and `content-lint.mjs`.
- `npm run lint` — Run ESLint across the repository.
- `npm run admin:grant -- <email>` — Promote an existing registered account to `admin` role via CLI (first-user auto-admin is intentionally disabled).

## Self-Hosted Docker Stack

```bash
docker compose -f compose.yaml up --build
```

Run operations reference is in [docs/RUNBOOK.md](docs/RUNBOOK.md).
