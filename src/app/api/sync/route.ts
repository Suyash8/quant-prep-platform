import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, rateLimitShared } from '@/lib/auth';
import { db } from '@/lib/db';
import { getAssessment, getLessonById, getMap } from '@/lib/content';
import { computeStatus, sm2, PASS_THRESHOLD, hasEarnedSpacedMastery } from '@/lib/mastery';
import { gradeAnswer } from '@/lib/grading';
import { awardXp, XP_TABLE } from '@/lib/gamification';
import { dayKey } from '@/lib/gamification-core';
import { can } from '@/lib/entitlements';
import { assertSameOrigin } from '@/lib/origin';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Authoritative Offline Sync Endpoint (A1, A6, A10):
 * - Events carry EVIDENCE (answers maps, card grades, drill counts), NEVER client-claimed pct/XP/problem solves.
 * - Forged/unknown events are rejected and quarantined cleanly without mutating user XP or mastery.
 */

const base = { id: z.string().min(1).max(120), at: z.string().max(40).optional() };
const key = z.string().min(1).max(200);
const syncEventSchema = z.discriminatedUnion('kind', [
  z.object({
    ...base,
    kind: z.literal('lesson_attempt'),
    lessonId: key,
    contentHash: z.string().max(32).optional(),
    answers: z.record(z.string().max(60), z.unknown()).refine((a) => Object.keys(a).length <= 30),
  }),
  z.object({
    ...base,
    kind: z.literal('assessment_attempt'),
    assessmentId: key,
    answers: z.record(z.string().max(80), z.unknown()).refine((a) => Object.keys(a).length <= 100),
  }),
  z.object({ ...base, kind: z.literal('exercise_done'), lessonId: key }),
  z.object({
    ...base,
    kind: z.literal('reviews'),
    reviews: z.array(z.object({ cardKey: key, grade: z.number().int().min(0).max(5) })).max(500),
  }),
  z
    .object({
      ...base,
      kind: z.literal('drill_session'),
      mode: z.string().min(1).max(30).default('mixed'),
      level: z.number().int().min(1).max(10).default(1),
      correct: z.number().int().min(0).max(500),
      answered: z.number().int().min(1).max(500),
      durationS: z.number().int().min(0).max(7200).default(60),
    })
    .refine((d) => d.correct <= d.answered, { message: 'correct cannot exceed answered' }),
]);

type ValidSyncEvent = z.infer<typeof syncEventSchema>;
const syncBatchSchema = z.object({ events: z.array(z.unknown()).max(200) });

async function buildSnapshot(userId: string) {
  const [user, lessonRows, cardRows, problemRows, assessRows, drillAgg] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { xp: true, streakCount: true, longestStreak: true, lastStudyDate: true, dailyGoalXp: true, timezone: true, streakFreezes: true },
    }),
    db.lessonProgress.findMany({ where: { userId } }),
    db.cardState.findMany({ where: { userId } }),
    db.problemAttempt.findMany({ where: { userId }, select: { problemSlug: true, status: true } }),
    db.assessmentAttempt.findMany({ where: { userId }, select: { assessmentId: true, scorePct: true } }),
    db.drillSession.aggregate({
      where: { userId },
      _count: { _all: true },
      _sum: { correct: true, total: true },
    }),
  ]);

  const lessons: Record<string, { kcBestPct: number; kcAttempts: number; exerciseDone: boolean; retrievalDone: boolean; status: string }> = {};
  for (const r of lessonRows) {
    lessons[r.lessonId] = {
      kcBestPct: r.kcBestPct,
      kcAttempts: r.kcAttempts,
      exerciseDone: r.exerciseDone,
      retrievalDone: r.retrievalDone,
      status: r.status,
    };
  }
  const cards: Record<string, unknown> = {};
  for (const c of cardRows) {
    cards[c.cardKey] = {
      ease: c.ease,
      intervalDays: c.intervalDays,
      repetitions: c.repetitions,
      lapses: c.lapses,
      dueAt: c.dueAt.toISOString(),
      lastGrade: c.lastGrade ?? 0,
      updatedAt: (c.lastReviewedAt ?? c.dueAt).toISOString(),
    };
  }
  const problems: Record<string, { status: string }> = {};
  const rank = (s: string) => (s === 'passed' ? 2 : s === 'attempted' ? 1 : 0);
  for (const p of problemRows) {
    const cur = problems[p.problemSlug];
    if (!cur || rank(p.status) > rank(cur.status)) problems[p.problemSlug] = { status: p.status };
  }
  const assessments: Record<string, { bestPct: number }> = {};
  for (const a of assessRows) {
    assessments[a.assessmentId] = { bestPct: Math.max(assessments[a.assessmentId]?.bestPct ?? 0, a.scorePct) };
  }

  return {
    xp: user?.xp ?? 0,
    streakCount: user?.streakCount ?? 0,
    longestStreak: user?.longestStreak ?? 0,
    streakFreezes: user?.streakFreezes ?? 0,
    lastStudyDate: user?.lastStudyDate ? dayKey(user.lastStudyDate, user.timezone || 'UTC') : null,
    dailyGoalXp: user?.dailyGoalXp ?? 50,
    lessons,
    cards,
    problems,
    assessments,
    drills: {
      sessions: drillAgg._count._all ?? 0,
      totalCorrect: drillAgg._sum.correct ?? 0,
      totalAnswered: drillAgg._sum.total ?? 0,
    },
  };
}

class SyncQuarantineError extends Error {
  constructor(message: string) {
    super(message);
  }
}

type Tx = Prisma.TransactionClient;

async function applyEventBody(tx: Tx, user: { id: string; plan: string; role: string; timezone: string }, e: ValidSyncEvent) {
  switch (e.kind) {
    case 'lesson_attempt': {
      const found = getLessonById(e.lessonId);
      if (!found) throw new SyncQuarantineError('unknown_lesson');
      if (!can(user, 'lesson', { phaseId: found.phaseId })) {
        throw new SyncQuarantineError('entitlement_required');
      }
      const lesson = found.lesson;
      let correct = 0;
      for (const q of lesson.quiz) {
        if (gradeAnswer(q, e.answers[q.id])) correct++;
      }
      const pct = lesson.quiz.length ? Math.round((correct / lesson.quiz.length) * 100) : 0;

      const prev = await tx.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: user.id, lessonId: e.lessonId } },
      });
      const next = computeStatus(
        {
          kcBestPct: prev?.kcBestPct ?? 0,
          kcAttempts: prev?.kcAttempts ?? 0,
          exerciseDone: prev?.exerciseDone ?? false,
          retrievalDone: prev?.retrievalDone ?? false,
          status: prev?.status ?? 'not_started',
        },
        { pct },
      );
      const isFirstPass = pct >= PASS_THRESHOLD && !prev?.firstPassedAt;
      await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: e.lessonId } },
        create: {
          userId: user.id,
          lessonId: e.lessonId,
          status: next.status,
          kcBestPct: next.kcBestPct,
          kcAttempts: next.kcAttempts,
          firstPassedAt: isFirstPass ? new Date() : null,
        },
        update: {
          status: next.status,
          kcBestPct: next.kcBestPct,
          kcAttempts: next.kcAttempts,
          ...(isFirstPass ? { firstPassedAt: new Date() } : {}),
        },
      });
      if (isFirstPass) {
        await awardXp(user.id, XP_TABLE.lessonPass, 'lesson_pass', lesson.title, tx, e.lessonId);
      }
      if (lesson.flashcards.length > 0) {
        await tx.cardState.createMany({
          data: lesson.flashcards.map((fc, i) => ({
            userId: user.id,
            cardKey: `${e.lessonId}:${i}`,
            source: 'lesson',
            front: fc.front,
            back: fc.back,
            cardType: fc.type,
            dueAt: new Date(Date.now() + 86400_000),
          })),
          skipDuplicates: true,
        });
      }
      break;
    }

    case 'exercise_done': {
      const found = getLessonById(e.lessonId);
      if (!found) throw new SyncQuarantineError('unknown_lesson');
      if (!can(user, 'lesson', { phaseId: found.phaseId })) {
        throw new SyncQuarantineError('entitlement_required');
      }
      const prev = await tx.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: user.id, lessonId: e.lessonId } },
      });
      await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: e.lessonId } },
        create: { userId: user.id, lessonId: e.lessonId, status: 'in_progress', exerciseDone: true },
        update: { exerciseDone: true },
      });
      break;
    }

    case 'reviews': {
      const now = new Date();
      for (const r of e.reviews) {
        const card = await tx.cardState.findUnique({
          where: { userId_cardKey: { userId: user.id, cardKey: r.cardKey } },
        });
        if (!card) continue;
        const wasDue = card.dueAt <= now;
        const next = sm2(
          { ease: card.ease, intervalDays: card.intervalDays, repetitions: card.repetitions, lapses: card.lapses },
          r.grade,
        );
        const updated = await tx.cardState.update({
          where: { id: card.id },
          data: {
            ease: next.ease,
            intervalDays: next.intervalDays,
            repetitions: next.repetitions,
            lapses: next.lapses,
            dueAt: next.dueAt,
            lastGrade: r.grade,
            lastReviewedAt: now,
          },
        });
        if (card.source === 'lesson' && wasDue && r.grade >= 3 && hasEarnedSpacedMastery([updated])) {
          const colon = card.cardKey.lastIndexOf(':');
          const lessonId = colon > 0 ? card.cardKey.slice(0, colon) : card.cardKey;
          await tx.lessonProgress.updateMany({
            where: { userId: user.id, lessonId, status: 'passed' },
            data: { retrievalDone: true, status: 'mastered' },
          });
        }
      }
      const xp = Math.min(Math.round((e.reviews.length / 10) * XP_TABLE.revisionPer10), XP_TABLE.revisionCap);
      if (xp > 0) await awardXp(user.id, xp, 'revision', undefined, tx, `rev-sync:${e.id}`);
      break;
    }

    case 'drill_session': {
      if (e.answered >= 10 && e.durationS > 0 && e.durationS < Math.floor(e.answered * 0.25)) {
        throw new SyncQuarantineError('implausible_drill_duration');
      }
      await tx.drillSession.create({
        data: { userId: user.id, mode: e.mode, level: e.level, correct: e.correct, total: e.answered, durationS: e.durationS },
      });
      const xp = Math.min(
        XP_TABLE.drillSession + e.correct * XP_TABLE.drillPerCorrect,
        XP_TABLE.drillCap + XP_TABLE.drillSession,
      );
      await awardXp(user.id, xp, 'drill', undefined, tx, `drill-sync:${e.id}`);
      break;
    }

    case 'assessment_attempt': {
      const assessment = getAssessment(e.assessmentId);
      if (!assessment) throw new SyncQuarantineError('unknown_assessment');
      if (!can(user, 'assessment', { assessmentId: assessment.id })) {
        throw new SyncQuarantineError('entitlement_required');
      }
      let correct = 0;
      let total = 0;
      for (const sec of assessment.sections) {
        for (const q of sec.questions) {
          total++;
          if (e.answers[q.id] !== undefined && gradeAnswer(q, e.answers[q.id])) correct++;
        }
      }
      const pct = total ? Math.round((correct / total) * 100) : 0;
      await tx.assessmentAttempt.create({
        data: {
          userId: user.id,
          assessmentId: assessment.id,
          kind: assessment.kind,
          scorePct: pct,
          detail: JSON.stringify({ source: 'offline-sync-graded', correct, total }),
          submittedAt: new Date(),
        },
      });
      const isDiag = assessment.id.startsWith('diag-');
      if (!isDiag && pct >= (assessment.passMarkPercent ?? 70)) {
        const covered = new Set(assessment.sections.flatMap((s) => s.covers ?? []));
        const map = getMap();
        const eligible = map.phases
          .flatMap((p) => p.modules)
          .filter((m) => covered.has(m.id))
          .flatMap((m) => m.lessons.map((l) => l.id));
        if (eligible.length > 0) {
          await tx.lessonProgress.updateMany({
            where: { userId: user.id, status: 'passed', lessonId: { in: eligible } },
            data: { retrievalDone: true, status: 'mastered' },
          });
        }
      }
      if (total >= 5 && pct >= 30) {
        const amount = Math.min(Math.floor(pct / 10) * XP_TABLE.assessmentPer10pct, XP_TABLE.assessmentCap);
        const today = dayKey(new Date(), user.timezone || 'UTC');
        await awardXp(
          user.id,
          amount,
          isDiag ? 'diagnostic' : 'assessment',
          assessment.title,
          tx,
          `${assessment.id}:${today}`,
        );
      }
      break;
    }
  }
}

async function applyEvent(user: { id: string; plan: string; role: string; timezone: string }, e: ValidSyncEvent): Promise<'applied' | 'duplicate'> {
  const dedupeKey = `${user.id}:${e.id}`;
  try {
    await db.$transaction(
      async (tx) => {
        await tx.syncEvent.create({ data: { eventId: dedupeKey, userId: user.id } });
        await applyEventBody(tx, user, e);
      },
      { timeout: 15000 },
    );
    return 'applied';
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return 'duplicate';
    throw err;
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to sync.' }, { status: 401 });
  if (!(await rateLimitShared(`sync-get:${user.id}`, 30, 2))) {
    return NextResponse.json({ error: 'Too many sync requests.' }, { status: 429 });
  }
  const snapshot = await buildSnapshot(user.id);
  return NextResponse.json({ snapshot });
}

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to sync.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!(await rateLimitShared(`sync:${user.id}`, 30, 1))) {
    return NextResponse.json({ error: 'Too many sync requests. Try again shortly.' }, { status: 429 });
  }
  const parsed = syncBatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid sync payload.' }, { status: 400 });

  const acked: string[] = [];
  const rejected: { id: string; reason: string }[] = [];
  const failed: string[] = [];

  for (const raw of parsed.data.events) {
    const rawId =
      raw && typeof raw === 'object' && typeof (raw as { id?: unknown }).id === 'string'
        ? (raw as { id: string }).id
        : '';
    const v = syncEventSchema.safeParse(raw);
    if (!v.success) {
      if (rawId) rejected.push({ id: rawId, reason: v.error.issues[0]?.message ?? 'unsupported event kind' });
      continue;
    }
    try {
      await applyEvent(
        { id: user.id, plan: user.plan, role: user.role, timezone: user.timezone || 'UTC' },
        v.data,
      );
      acked.push(v.data.id);
    } catch (err) {
      if (err instanceof SyncQuarantineError) {
        rejected.push({ id: v.data.id, reason: err.message });
      } else {
        failed.push(v.data.id);
      }
    }
  }

  const snapshot = await buildSnapshot(user.id);
  return NextResponse.json({ acked, rejected, failed, snapshot });
}
