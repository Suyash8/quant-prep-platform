import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function isValidCronBearer(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !authHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');
  const actual = Buffer.from(authHeader, 'utf8');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(req: NextRequest) {
  if (!isValidCronBearer(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 86400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000);

  const [deletedSessions, deletedSyncEvents, deletedRateLimits] = await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.syncEvent.deleteMany({ where: { appliedAt: { lt: thirtyDaysAgo } } }),
    db.rateLimitBucket.deleteMany({ where: { updatedAt: { lt: oneDayAgo } } }),
  ]);

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    prunedExpiredSessions: deletedSessions.count,
    prunedOldSyncEvents: deletedSyncEvents.count,
    prunedRateLimitBuckets: deletedRateLimits.count,
  });
}
