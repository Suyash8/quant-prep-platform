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
    console.warn('[vercel-build] prisma migrate deploy warning (continuing build):', err?.message || err);
  }
}

execSync('npm run build', { stdio: 'inherit' });
