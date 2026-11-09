import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimit } from '@/lib/auth';
import { db } from '@/lib/db';
import { getLessonById } from '@/lib/content';
import { gradeAnswer } from '@/lib/grading';
import { scoreQuiz, computeStatus, PASS_THRESHOLD } from '@/lib/mastery';
import { awardXp, XP_TABLE } from '@/lib/gamification';

const schema = z.object({
  lessonId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()).optional(),
  exerciseDone: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to track progress.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 });
  const { lessonId, answers, exerciseDone } = parsed.data;

  const found = getLessonById(lessonId);
  if (!found) return NextResponse.json({ error: 'Unknown lesson.' }, { status: 404 });
  const lesson = found.lesson;

  if (!rateLimit(`lesson:${user.id}`, 20, 1)) {
    return NextResponse.json({ error: 'Too many submissions, slow down.' }, { status: 429 });
  }

  const prev = await db.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
  });

  let pct = prev?.kcBestPct ?? 0;
  let perQuestion: Record<string, { correct: boolean; explanation: string }> | undefined;
  let statusUpdate: ReturnType<typeof computeStatus> | undefined;

  if (answers) {
    const questions = lesson.quiz.map(q => ({ id: q.id, type: q.type }));
    const result = scoreQuiz(questions, answers, (q, a) => {
      const full = lesson.quiz.find(x => x.id === q.id)!;
      return gradeAnswer(full, a);
    });
    pct = result.pct;
    perQuestion = {};
    for (const q of lesson.quiz) {
      const a = answers[q.id];
      perQuestion[q.id] = { correct: a !== undefined ? gradeAnswer(q, a) : false, explanation: q.explanation };
    }
    const next = computeStatus(
      {
        kcBestPct: prev?.kcBestPct ?? 0,
        kcAttempts: prev?.kcAttempts ?? 0,
        exerciseDone: prev?.exerciseDone ?? false,
        retrievalDone: prev?.retrievalDone ?? false,
        status: prev?.status ?? 'not_started',
      },
      { pct, exerciseDone }
    );
    statusUpdate = next;
  }

  const updateData: Record<string, unknown> = {};
  if (statusUpdate) {
    updateData.status = statusUpdate.status;
    updateData.kcBestPct = Math.max(prev?.kcBestPct ?? 0, pct);
    updateData.kcAttempts = statusUpdate.kcAttempts;
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
    },
    update: updateData,
  });

  // Mastery upgrade: passed + retrieval done -> mastered
  if (progress.status === 'passed' && prev?.retrievalDone) {
    await db.lessonProgress.update({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      data: { status: 'mastered' },
    });
  }

  await ensureCards(user.id, lessonId, lesson.flashcards);

  // Gamification: full XP the first time a lesson/exercise is cleared, small
  // trickle for repeats so review stays worth doing but can't be farmed.
  let xpAwarded = 0;
  let streakCount: number | null = null;
  const prevStatus = prev?.status ?? 'not_started';
  if (answers && pct >= 80) {
    const firstClear = !['passed', 'mastered'].includes(prevStatus);
    const amount = firstClear ? XP_TABLE.lessonPass : 5;
    const award = await awardXp(user.id, amount, 'lesson_pass', lesson.title).catch(() => null);
    xpAwarded += award?.amount ?? 0;
    if (award) streakCount = award.streakCount;
  }
  if (exerciseDone && !prev?.exerciseDone) {
    const award = await awardXp(user.id, XP_TABLE.exercise, 'exercise', lesson.title).catch(() => null);
    xpAwarded += award?.amount ?? 0;
    if (award) streakCount = award.streakCount;
  }
  if (progress.status === 'mastered' && prevStatus !== 'mastered') {
    const award = await awardXp(user.id, XP_TABLE.lessonMaster, 'lesson_master', lesson.title).catch(() => null);
    xpAwarded += award?.amount ?? 0;
    if (award) streakCount = award.streakCount;
  }

  return NextResponse.json({
    xpAwarded,
    streakCount,
    pct,
    correct: perQuestion ? Object.values(perQuestion).filter(q => q.correct).length : undefined,
    total: lesson.quiz.length,
    perQuestion,
    status: progress.status,
    passThreshold: PASS_THRESHOLD,
    exerciseDone: progress.exerciseDone,
  });
}

async function ensureCards(userId: string, lessonId: string, cards: { type: string; front: string; back: string }[]) {
  for (let i = 0; i < cards.length; i++) {
    const key = `${lessonId}:${i}`;
    await db.cardState.upsert({
      where: { userId_cardKey: { userId, cardKey: key } },
      create: {
        userId, cardKey: key, source: 'lesson',
        front: cards[i].front, back: cards[i].back, cardType: cards[i].type,
        dueAt: new Date(Date.now() + 86400_000),
      },
      update: {},
    });
  }
}
