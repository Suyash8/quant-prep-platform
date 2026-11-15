import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRegistry } from '@/lib/content';

export const dynamic = 'force-dynamic';

export async function GET() {
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
      const res = await fetch(`${runnerUrl.replace(/\/$/, '')}/health`, {
        signal: controller.signal,
        cache: 'no-store',
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
