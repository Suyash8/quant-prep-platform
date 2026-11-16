import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, currentSessionId, revokeOtherSessions } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/origin';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const curId = await currentSessionId();
  const rows = await db.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: 'desc' },
    select: { id: true, userAgent: true, lastUsedAt: true, createdAt: true, expiresAt: true },
  });

  return NextResponse.json({
    sessions: rows.map((r) => ({
      id: r.id,
      current: r.id === curId,
      userAgent: r.userAgent ?? 'Browser session',
      lastUsedAt: r.lastUsedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
    })),
  });
}

export async function DELETE(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const curId = await currentSessionId();
  const sessionId = req.nextUrl.searchParams.get('id');
  if (sessionId) {
    await db.session.deleteMany({ where: { id: sessionId, userId: user.id } });
    return NextResponse.json({ ok: true, revokedCurrent: sessionId === curId });
  }

  const revoked = await revokeOtherSessions(user.id, curId);
  return NextResponse.json({ ok: true, revoked });
}
