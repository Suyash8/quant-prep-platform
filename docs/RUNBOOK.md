# QuantFoundry Production Runbook

## 1. Architecture Topology

```
Browser -> CDN/TLS Edge -> Web App (Next.js standalone on Node 22, 2+ replicas)
                              |-- Managed PostgreSQL (Neon / Supabase / RDS, PITR enabled)
                              |-- Code Runner (private internal VM/container, bwrap + g++ + python3)
                              +-- Optional Resend SMTP & Stripe Webhooks
```

## 2. Deployment & Release Steps

1. Run schema migrations **before** starting the new application revision:
   ```bash
   npx prisma migrate deploy
   ```
   Never run `prisma db push --accept-data-loss` on staging or production.
2. Build and verify packs + application:
   ```bash
   npm run build
   ```
3. Start web instances (`node .next/standalone/server.js`) and code-runner instances behind private networking (`CODE_RUNNER_AUTH_TOKEN` >= 32 chars).
4. Verify `/api/healthz` returns `200` and `/api/ready` (with `CRON_SECRET` bearer) reports `db: ok`, `runner: configured-ok`.

## 3. Rollback Procedure

1. Roll back the web container image / deployment tag to the previous known-good SHA.
2. Migrations in `prisma/migrations/` are additive-first; if a forward migration must be undone, apply a compensating migration from a verified DB backup snapshot rather than deleting migration history.
3. Flush CDN edge cache only if pack hashes changed; versioned content packs invalidate automatically.

## 4. Secret Rotation

- **SESSION_SECRET**: Rotate via secret manager; invalidate active sessions afterward if compromise is suspected (`DELETE FROM "Session"`).
- **CODE_RUNNER_AUTH_TOKEN**: Deploy updated token to code runner and web simultaneously (or stage dual-replica swap) so judge requests stay authenticated.
- **CRON_SECRET**: Update scheduler Authorization bearer alongside environment secret.
- **STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET**: Rotate in Stripe Dashboard and mirror immediately; Stripe retries failed `500` webhook deliveries with exponential backoff.

## 5. Runner Incident Response

1. If `/api/ready` reports `runner: configured-degraded`: inspect runner container logs (`sandbox.active`, memory headroom, queue saturation).
2. The judge fails closed (`503 runtime-unavailable`) without penalising learner attempts. Restart the runner service or scale replicas cleanly.
3. Temporary bypass of remote judge submissions only affects code grading; reading lessons, quizzes, drills, and flashcards stays available.

## 6. Backups & Point-in-Time Recovery (PITR)

- Enable daily automated snapshots + continuous WAL PITR (>= 7 days) on managed Postgres.
- Verify restoration quarterly against a staging database by running `pg_restore` and checking `/api/ready` + row counts (`User`, `XpEvent`, `LessonProgress`).

## 7. Promoting an Administrator

Administrators are never auto-promoted via HTTP registration:

```bash
node scripts/admin-grant.mjs admin@yourdomain.com grant
```
