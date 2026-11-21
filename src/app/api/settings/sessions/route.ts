import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser, currentSessionId, revokeOtherSessions, sessionTag } from '@/lib/auth';
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
      id: sessionTag(r.id),
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
  const tagParam = req.nextUrl.searchParams.get('id');
  if (tagParam) {
    const userSessions = await db.session.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const matched = userSessions.find((s) => sessionTag(s.id) === tagParam || s.id === tagParam);
    if (!matched) {
      return NextResponse.json({ ok: true, revokedCurrent: false });
    }
    await db.session.deleteMany({ where: { id: matched.id, userId: user.id } });
    const revokedCurrent = matched.id === curId;
    if (revokedCurrent) {
      const jar = await cookies();
      jar.delete('qf_session');
    }
    return NextResponse.json({ ok: true, revokedCurrent });
  }

  const revoked = await revokeOtherSessions(user.id, curId);
  return NextResponse.json({ ok: true, revoked });
}
