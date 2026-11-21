import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimitShared } from '@/lib/auth';
import { db } from '@/lib/db';
import { awardXp, XP_TABLE } from '@/lib/gamification';
import { dayKey } from '@/lib/gamification-core';
import { sm2, hasEarnedSpacedMastery } from '@/lib/mastery';
import { assertSameOrigin } from '@/lib/origin';

const schema = z.object({
  cardKey: z.string().min(1).max(200),
  grade: z.number().int().min(0).max(5),
});

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!(await rateLimitShared(`review:${user.id}`, 60, 2))) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid review.' }, { status: 400 });
  const { cardKey, grade } = parsed.data;

  const card = await db.cardState.findUnique({ where: { userId_cardKey: { userId: user.id, cardKey } } });
  if (!card) return NextResponse.json({ error: 'Unknown card.' }, { status: 404 });

  const now = new Date();
  const wasDue = card.dueAt <= now;
  const next = sm2(
    { ease: card.ease, intervalDays: card.intervalDays, repetitions: card.repetitions, lapses: card.lapses },
    grade,
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
      lastReviewedAt: now,
    },
  });

  // Real mastery (A4): requires card to have been due and reach >=2 spaced repetitions & >=3d interval
  if (card.source === 'lesson' && wasDue && grade >= 3 && hasEarnedSpacedMastery([updated])) {
    const colon = card.cardKey.lastIndexOf(':');
    const lessonId = colon > 0 ? card.cardKey.slice(0, colon) : card.cardKey;
    const progress = await db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId } },
    });
    if (progress && progress.status === 'passed') {
      await db.lessonProgress.update({ where: { id: progress.id }, data: { retrievalDone: true, status: 'mastered' } });
    } else if (progress && progress.kcBestPct >= 80) {
      await db.lessonProgress.update({ where: { id: progress.id }, data: { retrievalDone: true } }).catch(() => {});
    }
  }

  if (card.source === 'quiz_miss' && grade >= 4 && updated.repetitions >= 2) {
    await db.cardState.delete({ where: { id: card.id } });
    return NextResponse.json({ ok: true, graduated: true, nextDueAt: next.dueAt.toISOString() });
  }

  return NextResponse.json({
    ok: true,
    intervalDays: next.intervalDays,
    ease: next.ease,
    dueAt: next.dueAt.toISOString(),
  });
}

/** Log a revision session for analytics with rate limit and bounded review count (A6). */
export async function PUT(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!(await rateLimitShared(`revlog:${user.id}`, 10, 0.2))) {
    return NextResponse.json({ error: 'Too many revision logs.' }, { status: 429 });
  }
  const parsed = z
    .object({ seconds: z.number().int().min(0).max(7200), reviewed: z.number().int().min(0).max(200) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid.' }, { status: 400 });

  const today = dayKey(new Date(), user.timezone || 'UTC');
  await db.learningSession.create({
    data: { userId: user.id, kind: 'revision', seconds: parsed.data.seconds, day: today },
  });

  let xpAwarded = 0;
  if (parsed.data.reviewed >= 10) {
    // Verify actual recent reviews in DB rather than trusting raw client count
    const recentWindow = new Date(Date.now() - 2 * 3600_000);
    const verifiedReviewed = await db.cardState.count({
      where: { userId: user.id, lastReviewedAt: { gte: recentWindow } },
    });
    const effectiveReviewed = Math.min(parsed.data.reviewed, verifiedReviewed);
    if (effectiveReviewed >= 10) {
      const amount = Math.min(Math.floor(effectiveReviewed / 10) * XP_TABLE.revisionPer10, XP_TABLE.revisionCap);
      const award = await awardXp(
        user.id,
        amount,
        'revision',
        `${effectiveReviewed} cards reviewed`,
        undefined,
        `rev:${today}:${Math.floor(Date.now() / 60000)}`,
      ).catch(() => null);
      xpAwarded = award?.amount ?? 0;
    }
  }
  return NextResponse.json({ ok: true, xpAwarded });
}
