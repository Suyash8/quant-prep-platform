import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('note'), lessonId: z.string(), body: z.string().max(20000) }),
  z.object({ type: z.literal('bookmark'), lessonId: z.string() }),
]);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { type, lessonId } = parsed.data;

  if (type === 'note') {
    const body = parsed.data.body;
    if (body.trim() === '') {
      await db.note.deleteMany({ where: { userId: user.id, lessonId } });
      return NextResponse.json({ ok: true, cleared: true });
    }
    await db.note.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      create: { userId: user.id, lessonId, body },
      update: { body },
    });
    return NextResponse.json({ ok: true });
  }

  const existing = await db.bookmark.findUnique({
    where: { userId_targetType_targetId: { userId: user.id, targetType: 'lesson', targetId: lessonId } },
  });
  if (existing) {
    await db.bookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, bookmarked: false });
  }
  await db.bookmark.create({ data: { userId: user.id, targetType: 'lesson', targetId: lessonId } });
  return NextResponse.json({ ok: true, bookmarked: true });
}
