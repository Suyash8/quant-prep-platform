import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimitShared } from '@/lib/auth';
import { db } from '@/lib/db';
import { getLessonById } from '@/lib/content';
import { gradeAnswer } from '@/lib/grading';
import { scoreQuiz, computeStatus, PASS_THRESHOLD, hasEarnedSpacedMastery } from '@/lib/mastery';
import { awardXp, XP_TABLE } from '@/lib/gamification';
import { can } from '@/lib/entitlements';
import { assertSameOrigin } from '@/lib/origin';

const schema = z.object({
  lessonId: z.string().min(1).max(120),
  answers: z.record(z.string(), z.unknown()).optional(),
  exerciseDone: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to track progress.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 });
  const { lessonId, answers, exerciseDone } = parsed.data;

  const found = getLessonById(lessonId);
  if (!found) return NextResponse.json({ error: 'Unknown lesson.' }, { status: 404 });
  if (!can(user, 'lesson', { phaseId: found.phaseId })) {
    return NextResponse.json({ error: 'Upgrade to Pro to track progress beyond Phase 1.' }, { status: 403 });
  }
  const lesson = found.lesson;

  if (!(await rateLimitShared(`lesson:${user.id}`, 20, 1))) {
    return NextResponse.json({ error: 'Too many submissions, slow down.' }, { status: 429 });
  }

  const prev = await db.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
  });

  let pct = prev?.kcBestPct ?? 0;
  let perQuestion: Record<string, { correct: boolean; explanation: string }> | undefined;
  let statusUpdate: ReturnType<typeof computeStatus> | undefined;

  if (answers) {
    const questions = lesson.quiz.map((q) => ({ id: q.id, type: q.type }));
    const result = scoreQuiz(questions, answers, (q, a) => {
      const full = lesson.quiz.find((x) => x.id === q.id)!;
      return gradeAnswer(full, a);
    });
    pct = result.pct;
    perQuestion = {};
    for (const q of lesson.quiz) {
      const a = answers[q.id];
      perQuestion[q.id] = { correct: a !== undefined ? gradeAnswer(q, a) : false, explanation: q.explanation };
    }
    statusUpdate = computeStatus(
      {
        kcBestPct: prev?.kcBestPct ?? 0,
        kcAttempts: prev?.kcAttempts ?? 0,
        exerciseDone: prev?.exerciseDone ?? false,
        retrievalDone: prev?.retrievalDone ?? false,
        status: prev?.status ?? 'not_started',
      },
      { pct, exerciseDone },
    );
  }

  const isFirstPass = Boolean(answers && pct >= PASS_THRESHOLD && !prev?.firstPassedAt);
  const updateData: Record<string, unknown> = {};
  if (statusUpdate) {
    updateData.status = statusUpdate.status;
    updateData.kcBestPct = Math.max(prev?.kcBestPct ?? 0, pct);
    updateData.kcAttempts = statusUpdate.kcAttempts;
    if (isFirstPass) updateData.firstPassedAt = new Date();
  }
  if (exerciseDone) {
    updateData.exerciseDone = true;
    if (prev?.status === 'not_started' && !statusUpdate) updateData.status = 'in_progress';
  }

  const progress = await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: {
      userId: user.id,
      lessonId,
      status: (updateData.status as string) ?? (exerciseDone ? 'in_progress' : 'not_started'),
      kcBestPct: pct,
      kcAttempts: statusUpdate?.kcAttempts ?? 0,
      exerciseDone: !!exerciseDone,
      firstPassedAt: isFirstPass ? new Date() : null,
    },
    update: updateData,
  });

  // Check if genuine spaced retrieval mastery has already been earned on this lesson's cards
  const existingCards = await db.cardState.findMany({
    where: { userId: user.id, cardKey: { startsWith: `${lessonId}:` } },
    select: { repetitions: true, intervalDays: true },
  });
  const spacedMasteryEarned = Boolean(prev?.retrievalDone || hasEarnedSpacedMastery(existingCards));
  if (progress.status === 'passed' && spacedMasteryEarned) {
    await db.lessonProgress.update({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      data: { retrievalDone: true, status: 'mastered' },
    });
  }

  // Ensure spaced-repetition cards exist for this lesson using skipDuplicates
  if (lesson.flashcards.length > 0) {
    await db.cardState.createMany({
      data: lesson.flashcards.map((fc, i) => ({
        userId: user.id,
        cardKey: `${lessonId}:${i}`,
        source: 'lesson',
        front: fc.front,
        back: fc.back,
        cardType: fc.type,
        dueAt: new Date(Date.now() + 86400_000),
      })),
      skipDuplicates: true,
    });
  }

  let xpAwarded = 0;
  let streakCount: number | null = null;
  if (answers && pct >= PASS_THRESHOLD && isFirstPass) {
    const award = await awardXp(
      user.id,
      XP_TABLE.lessonPass,
      'lesson_pass',
      lesson.title,
      undefined,
      lessonId,
    ).catch(() => null);
    xpAwarded += award?.amount ?? 0;
    if (award) streakCount = award.streakCount;
  }

  if (spacedMasteryEarned && progress.status === 'passed' && prev?.status !== 'mastered') {
    const award = await awardXp(
      user.id,
      XP_TABLE.lessonMaster,
      'lesson_master',
      lesson.title,
      undefined,
      lessonId,
    ).catch(() => null);
    xpAwarded += award?.amount ?? 0;
    if (award) streakCount = award.streakCount;
  }

  return NextResponse.json({
    xpAwarded,
    streakCount,
    pct,
    correct: perQuestion ? Object.values(perQuestion).filter((q) => q.correct).length : undefined,
    total: lesson.quiz.length,
    perQuestion,
    status: progress.status,
    passThreshold: PASS_THRESHOLD,
    exerciseDone: progress.exerciseDone,
  });
}
