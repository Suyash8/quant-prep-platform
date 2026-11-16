import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser, rateLimitShared } from '@/lib/auth';
import { clientIp } from '@/lib/client-ip';
import { assertSameOrigin } from '@/lib/origin';
import { getLessonById, getProblem } from '@/lib/content';

const schema = z.object({
  lessonId: z.string().trim().max(120).optional(),
  problemSlug: z.string().trim().max(120).optional(),
  cardIndex: z.number().int().min(0).max(200).optional(),
  reason: z.enum(['incorrect', 'typo', 'unclear', 'broken_math', 'other']),
  comment: z.string().trim().max(2000).default(''),
});

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const ip = clientIp(req);
  if (!(await rateLimitShared(`report:${ip}`, 10, 0.05))) {
    return NextResponse.json({ error: 'Too many reports submitted. Please wait.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid report payload.' }, { status: 400 });
  }

  const { lessonId, problemSlug, cardIndex, reason, comment } = parsed.data;
  if (!lessonId && !problemSlug) {
    return NextResponse.json({ error: 'Specify a lessonId or problemSlug.' }, { status: 400 });
  }
  if (lessonId && !getLessonById(lessonId)) {
    return NextResponse.json({ error: 'Unknown lesson.' }, { status: 404 });
  }
  if (problemSlug && !getProblem(problemSlug)) {
    return NextResponse.json({ error: 'Unknown problem.' }, { status: 404 });
  }

  const user = await getCurrentUser().catch(() => null);
  const created = await db.contentReport.create({
    data: {
      userId: user?.id ?? null,
      lessonId: lessonId ?? null,
      problemSlug: problemSlug ?? null,
      cardIndex: cardIndex ?? null,
      reason,
      comment,
      status: 'open',
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
