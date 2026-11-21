#!/usr/bin/env node
/**
 * Vercel build script: applies any pending idempotent Prisma migrations when
 * DATABASE_URL is configured, then runs the full QuantFoundry production build.
 */
const { execSync } = require('child_process');

if (process.env.DATABASE_URL) {
  try {
    console.log('[vercel-build] Running prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  } catch (err) {
    if (process.env.VERCEL_ENV === 'production') {
      console.error('[vercel-build] FATAL: prisma migrate deploy failed in production:', err?.message || err);
      process.exit(1);
    }
    console.warn('[vercel-build] prisma migrate deploy warning (non-production build):', err?.message || err);
  }
}

execSync('npm run build', { stdio: 'inherit' });
