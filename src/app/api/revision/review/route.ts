import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimit } from '@/lib/auth';
import { db } from '@/lib/db';
import { awardXp, XP_TABLE } from '@/lib/gamification';
import { sm2 } from '@/lib/mastery';
import { getLessonById } from '@/lib/content';

const schema = z.object({
  cardKey: z.string().min(1),
  grade: z.number().int().min(0).max(5),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!rateLimit(`review:${user.id}`, 60, 2)) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid review.' }, { status: 400 });
  const { cardKey, grade } = parsed.data;

  const card = await db.cardState.findUnique({ where: { userId_cardKey: { userId: user.id, cardKey } } });
  if (!card) return NextResponse.json({ error: 'Unknown card.' }, { status: 404 });

  const next = sm2(
    { ease: card.ease, intervalDays: card.intervalDays, repetitions: card.repetitions, lapses: card.lapses },
    grade
  );

  const updated = await db.cardState.update({
    where: { id: card.id },
    data: {
      ease: next.ease,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      lapses: next.lapses,
      dueAt: next.dueAt,
      lastGrade: grade,
      lastReviewedAt: new Date(),
    },
  });

  // Retrieval mastery: a lesson card reviewed with grade >= 3 after being due marks


  // the lesson's retrievalDone; combined with status 'passed' -> mastered.


  if (card.source === 'lesson' && grade >= 3) {
    const lessonId = card.cardKey.split(':')[0];
    const progress = await db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId } },
    });
    if (progress && progress.status === 'passed') {
      await db.lessonProgress.update({ where: { id: progress.id }, data: { retrievalDone: true, status: 'mastered' } });
    } else if (progress && progress.kcBestPct >= 80 && progress.exerciseDone) {
      await db.lessonProgress.update({ where: { id: progress.id }, data: { retrievalDone: true } }).catch(() => {});
    }
  }

  // quiz_miss cards that are now solid get removed from the deck


  if (card.source === 'quiz_miss' && grade >= 4 && updated.repetitions >= 2) {
    await db.cardState.delete({ where: { id: card.id } });
    return NextResponse.json({ ok: true, graduated: true, nextDueAt: next.dueAt.toISOString() });
  }

  return NextResponse.json({ ok: true, intervalDays: next.intervalDays, ease: next.ease, dueAt: next.dueAt.toISOString() });
}

/** Log a revision session for analytics */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const parsed = z.object({ seconds: z.number().int().min(0).max(7200), reviewed: z.number().int().min(0) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid.' }, { status: 400 });
  await db.learningSession.create({
    data: { userId: user.id, kind: 'revision', seconds: parsed.data.seconds, day: new Date().toISOString().slice(0, 10) },
  });
  // Gamification: revision pays a little XP per 10 reviewed cards.


  let xpAwarded = 0;
  if (parsed.data.reviewed >= 10) {
    const amount = Math.min(Math.floor(parsed.data.reviewed / 10) * XP_TABLE.revisionPer10, XP_TABLE.revisionCap);
    const award = await awardXp(user.id, amount, 'revision', `${parsed.data.reviewed} cards reviewed`).catch(() => null);
    xpAwarded = award?.amount ?? 0;
  }
  return NextResponse.json({ ok: true, xpAwarded });
}
