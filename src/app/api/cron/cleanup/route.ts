import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const deletedSessions = await db.session.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    prunedExpiredSessions: deletedSessions.count,
  });
}
