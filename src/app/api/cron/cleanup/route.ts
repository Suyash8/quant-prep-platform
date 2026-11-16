import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 401 });
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000);

  const [deletedSessions, deletedSyncEvents] = await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.syncEvent.deleteMany({ where: { appliedAt: { lt: thirtyDaysAgo } } }),
  ]);

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    prunedExpiredSessions: deletedSessions.count,
    prunedOldSyncEvents: deletedSyncEvents.count,
  });
}
