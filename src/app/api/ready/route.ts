import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getRegistry } from '@/lib/content';

export const dynamic = 'force-dynamic';

function isCronAuthorized(authHeader: string | null, cronSecret: string | undefined): boolean {
  if (!cronSecret || cronSecret.length < 16 || !authHeader) return false;
  const a = Buffer.from(authHeader, 'utf8');
  const b = Buffer.from(`Bearer ${cronSecret}`, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Detailed readiness/ops endpoint restricted to administrators or valid CRON_SECRET bearer. */
export async function GET(req: Request) {
  const cronOk = isCronAuthorized(req.headers.get('authorization'), process.env.CRON_SECRET);
  if (!cronOk) {
    const user = await getCurrentUser().catch(() => null);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const startedAt = Date.now();
  let dbOk = false;
  let lessonCount = 0;
  let runnerStatus: 'configured-ok' | 'configured-degraded' | 'local-default' = 'local-default';

  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  try {
    lessonCount = getRegistry().lessons.length;
  } catch {
    lessonCount = 0;
  }

  const runnerUrl = process.env.CODE_RUNNER_URL;
  if (runnerUrl) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const token = process.env.CODE_RUNNER_AUTH_TOKEN;
      const res = await fetch(`${runnerUrl.replace(/\/$/, '')}/health`, {
        signal: controller.signal,
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      clearTimeout(timer);
      runnerStatus = res.ok ? 'configured-ok' : 'configured-degraded';
    } catch {
      runnerStatus = 'configured-degraded';
    }
  }

  const healthy = dbOk && lessonCount > 0;
  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      db: dbOk ? 'ok' : 'error',
      lessons: lessonCount,
      runner: runnerStatus,
      latencyMs: Date.now() - startedAt,
    },
    { status: healthy ? 200 : 503 },
  );
}
