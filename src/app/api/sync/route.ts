import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getAssessment, getLessonById } from '@/lib/content';
import { computeStatus, sm2 } from '@/lib/mastery';
import { awardXp, XP_TABLE } from '@/lib/gamification';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { rateLimit } from '@/lib/auth';
import type { SyncEvent } from '@/lib/client/local-state';

/**
 * Batch sync endpoint (v3 offline-first).
 *
 * POST: applies queued client events (idempotent by event id, so replays and
 *       double-sends are safe) and returns the authoritative snapshot.
 * GET:  returns the snapshot alone (first-load hydration).
 */

async function buildSnapshot(userId: string) {
  const [user, lessonRows, cardRows, problemRows, assessRows, drillRows] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { xp: true, streakCount: true, longestStreak: true, lastStudyDate: true, dailyGoalXp: true } }),
    db.lessonProgress.findMany({ where: { userId } }),
    db.cardState.findMany({ where: { userId } }),
    db.problemAttempt.findMany({ where: { userId } }),
    db.assessmentAttempt.findMany({ where: { userId } }),
    db.drillSession.findMany({ where: { userId }, select: { correct: true, total: true } }),
  ]);

  const lessons: Record<string, { kcBestPct: number; kcAttempts: number; exerciseDone: boolean; retrievalDone: boolean; status: string }> = {};
  for (const r of lessonRows) {
    lessons[r.lessonId] = { kcBestPct: r.kcBestPct, kcAttempts: r.kcAttempts, exerciseDone: r.exerciseDone, retrievalDone: r.retrievalDone, status: r.status };
  }
  const cards: Record<string, unknown> = {};
  for (const c of cardRows) {
    cards[c.cardKey] = {
      ease: c.ease, intervalDays: c.intervalDays, repetitions: c.repetitions,
      lapses: c.lapses, dueAt: c.dueAt.toISOString(), lastGrade: c.lastGrade ?? 0,
      updatedAt: (c.lastReviewedAt ?? c.dueAt).toISOString(),
    };
  }
  const problems: Record<string, { status: string }> = {};
  for (const p of problemRows) {
    const cur = problems[p.problemSlug];
    const rank = (s: string) => (s === 'passed' ? 2 : s === 'attempted' ? 1 : 0);
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
    lastStudyDate: user?.lastStudyDate ? user.lastStudyDate.toISOString().slice(0, 10) : null,
    dailyGoalXp: user?.dailyGoalXp ?? 60,
    lessons,
    cards,
    problems,
    assessments,
    drills: {
      sessions: drillRows.length,
      totalCorrect: drillRows.reduce((n, d) => n + d.correct, 0),
      totalAnswered: drillRows.reduce((n, d) => n + d.total, 0),
    },
  };
}

type Tx = Prisma.TransactionClient;

/**
 * Apply one event atomically: the dedupe claim and every effect (including the
 * XP award) commit together or not at all. Returns 'applied', 'duplicate' (this
 * user already has the event) or throws (nothing was changed, safe to retry).
 */
async function applyEvent(userId: string, e: SyncEvent): Promise<'applied' | 'duplicate'> {
  const dedupeKey = `${userId}:${e.id}`;
  try {
    await db.$transaction(async tx => {
      await tx.syncEvent.create({ data: { eventId: dedupeKey, userId } });
      await applyEventBody(tx, userId, e);
    }, { timeout: 15000 });
    return 'applied';
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return 'duplicate';
    throw err;
  }
}

async function applyEventBody(tx: Tx, userId: string, e: SyncEvent) {
  switch (e.kind) {
    case 'lesson_result': {
      const found = getLessonById(e.lessonId);
      if (!found) return;
      const prev = await tx.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId: e.lessonId } } });
      const next = computeStatus(
        {
          kcBestPct: prev?.kcBestPct ?? 0, kcAttempts: prev?.kcAttempts ?? 0,
          exerciseDone: prev?.exerciseDone ?? false, retrievalDone: prev?.retrievalDone ?? false,
          status: prev?.status ?? 'not_started',
        },
        { pct: e.pct },
      );
      const row = await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: e.lessonId } },
        create: { userId, lessonId: e.lessonId, status: next.status, kcBestPct: next.kcBestPct, kcAttempts: next.kcAttempts },
        update: { status: next.status, kcBestPct: next.kcBestPct, kcAttempts: next.kcAttempts },
      });
      if (row.status === 'passed' && row.retrievalDone) {
        await tx.lessonProgress.update({ where: { id: row.id }, data: { status: 'mastered' } });
      }
      if (e.pct >= 80) {
        const firstClear = !['passed', 'mastered'].includes(prev?.status ?? 'not_started');
        await awardXp(userId, firstClear ? XP_TABLE.lessonPass : 5, 'lesson_pass', found.lesson.title, tx);
      }
      // mirror the lesson route: grow the revision deck for this lesson
      for (let i = 0; i < found.lesson.flashcards.length; i++) {
        const key = `${e.lessonId}:${i}`;
        await tx.cardState.upsert({
          where: { userId_cardKey: { userId, cardKey: key } },
          create: {
            userId, cardKey: key, source: 'lesson',
            front: found.lesson.flashcards[i].front, back: found.lesson.flashcards[i].back,
            cardType: found.lesson.flashcards[i].type, dueAt: new Date(Date.now() + 86400_000),
          },
          update: {},
        }).catch(() => {});
      }
      break;
    }
    case 'exercise_done': {
      const prev = await tx.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId: e.lessonId } } });
      // exercise + a passing quiz score (possibly from an earlier event) = passed
      const bestPct = prev?.kcBestPct ?? 0;
      const retrievalDone = prev?.retrievalDone ?? false;
      let status: string = prev?.status ?? 'not_started';
      if (bestPct >= 80) status = retrievalDone ? 'mastered' : 'passed';
      else if (status === 'not_started') status = 'in_progress';
      await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: e.lessonId } },
        create: { userId, lessonId: e.lessonId, status, exerciseDone: true },
        update: { exerciseDone: true, status },
      });
      if (!prev?.exerciseDone) await awardXp(userId, XP_TABLE.exercise, 'exercise', undefined, tx);
      break;
    }
    case 'retrieval_done': {
      const prev = await tx.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId: e.lessonId } } });
      if (!prev) return;
      const data: Record<string, unknown> = { retrievalDone: true };
      if (['passed', 'mastered'].includes(prev.status)) data.status = 'mastered';
      await tx.lessonProgress.update({ where: { id: prev.id }, data });
      break;
    }
    case 'reviews': {
      for (const r of e.reviews ?? []) {
        const card = await tx.cardState.findUnique({ where: { userId_cardKey: { userId, cardKey: r.cardKey } } });
        if (!card) continue;
        const next = sm2(
          { ease: card.ease, intervalDays: card.intervalDays, repetitions: card.repetitions, lapses: card.lapses },
          r.grade,
        );
        await tx.cardState.update({
          where: { id: card.id },
          data: { ease: next.ease, intervalDays: next.intervalDays, repetitions: next.repetitions, lapses: next.lapses, dueAt: next.dueAt, lastGrade: r.grade },
        });
      }
      const xp = Math.min(Math.round(((e.reviews?.length ?? 0) / 10) * XP_TABLE.revisionPer10), XP_TABLE.revisionCap);
      if (xp > 0) await awardXp(userId, xp, 'revision', undefined, tx);
      break;
    }
    case 'drill_session': {
      await tx.drillSession.create({ data: { userId, mode: 'mixed', correct: e.correct, total: e.answered } });
      const xp = Math.min(XP_TABLE.drillSession + e.correct * XP_TABLE.drillPerCorrect, XP_TABLE.drillCap + XP_TABLE.drillSession);
      await awardXp(userId, xp, 'drills', undefined, tx);
      break;
    }
    case 'problem_attempt': {
      const prev = await tx.problemAttempt.findFirst({ where: { userId, problemSlug: e.slug }, orderBy: { createdAt: 'desc' } });
      if (prev) {
        const rank = (s: string) => (s === 'passed' ? 2 : 1);
        if (rank(e.status) > rank(prev.status)) {
          await tx.problemAttempt.update({ where: { id: prev.id }, data: { status: e.status } });
        }
      } else {
        await tx.problemAttempt.create({ data: { userId, problemSlug: e.slug, language: 'synced', status: e.status === 'passed' ? 'passed' : 'failed', passedTests: 0, totalTests: 0 } });
      }
      if (e.status === 'passed' && prev?.status !== 'passed') {
        await awardXp(userId, XP_TABLE.problemPass, 'problem', e.slug, tx);
      }
      break;
    }
    case 'assessment_result': {
      // Device-reported scores are kept apart from server-graded attempts: a synced claim never overwrites a
      // server-graded row (and its per-question detail). It lives in its own row tagged source=offline-sync.
      const attempts = await tx.assessmentAttempt.findMany({ where: { userId, assessmentId: e.assessmentId }, orderBy: { submittedAt: 'desc' } });
      const isSynced = (d: string | null) => { try { return JSON.parse(d ?? '{}').source === 'offline-sync'; } catch { return false; } };
      const prev = attempts.find(a => isSynced(a.detail));
      const best = Math.max(0, ...attempts.map(a => a.scorePct));
      if (prev) {
        if (e.pct > prev.scorePct) {
          await tx.assessmentAttempt.update({ where: { id: prev.id }, data: { scorePct: e.pct, submittedAt: new Date() } });
        }
      } else {
        await tx.assessmentAttempt.create({ data: { userId, assessmentId: e.assessmentId, kind: 'assessment', scorePct: e.pct, detail: JSON.stringify({ source: 'offline-sync', note: 'score reported by device, not server-graded; per-question detail unavailable' }), submittedAt: new Date() } });
      }
      // Same pass mark the online submit route uses: the assessment's own passMarkPercent, default 70.
      const passMark = getAssessment(e.assessmentId)?.passMarkPercent ?? 70;
      if (!e.assessmentId.startsWith('diag-') && e.pct >= passMark) {
        await tx.lessonProgress.updateMany({ where: { userId, status: 'passed' }, data: { retrievalDone: true } });
      }
      if (e.pct > best) {
        const xp = Math.min(Math.round((e.pct / 10) * XP_TABLE.assessmentPer10pct), XP_TABLE.assessmentCap);
        if (xp > 0) await awardXp(userId, xp, 'assessment', e.assessmentId, tx);
      }
      break;
    }
  }
}

const base = { id: z.string().min(1).max(120), at: z.string().max(40).optional() };
const pct = z.number().min(0).max(100);
const key = z.string().min(1).max(200);
const syncEventSchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('lesson_result'), lessonId: key, pct }),
  z.object({ ...base, kind: z.literal('exercise_done'), lessonId: key }),
  z.object({ ...base, kind: z.literal('retrieval_done'), lessonId: key }),
  z.object({ ...base, kind: z.literal('reviews'), reviews: z.array(z.object({ cardKey: key, grade: z.number().int().min(0).max(5) })).max(500) }),
  z.object({ ...base, kind: z.literal('drill_session'), correct: z.number().int().min(0).max(1000), answered: z.number().int().min(0).max(1000) }).refine(d => d.correct <= d.answered, { message: 'correct cannot exceed answered' }),
  z.object({ ...base, kind: z.literal('problem_attempt'), slug: key, status: z.enum(['passed', 'attempted']) }),
  z.object({ ...base, kind: z.literal('assessment_result'), assessmentId: key, pct }),
]);
const syncBatchSchema = z.object({ events: z.array(z.unknown()).max(200) });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to sync.' }, { status: 401 });
  const snapshot = await buildSnapshot(user.id);
  return NextResponse.json({ snapshot });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to sync.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!rateLimit(`sync:${user.id}`, 30, 1)) {
    return NextResponse.json({ error: 'Too many sync requests. Try again shortly.' }, { status: 429 });
  }
  const parsed = syncBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid sync batch.' }, { status: 400 });
  }
  // Validate per event: one malformed event is rejected on its own and never blocks the rest.
  const events: SyncEvent[] = [];
  const rejected: { id: string | null; reason: string }[] = [];
  for (const raw of parsed.data.events) {
    const v = syncEventSchema.safeParse(raw);
    if (v.success) events.push(v.data as unknown as SyncEvent);
    else {
      const rid = typeof (raw as { id?: unknown })?.id === 'string' ? (raw as { id: string }).id : null;
      rejected.push({ id: rid, reason: v.error.issues[0]?.message ?? 'invalid event' });
    }
  }
  const accepted: string[] = [];
  const duplicates: string[] = [];
  const failed: string[] = [];
  for (const e of events) {
    try {
      const r = await applyEvent(user.id, e);
      (r === 'applied' ? accepted : duplicates).push(e.id);
    } catch {
      // the event's transaction rolled back: nothing was applied, the client keeps it and retries
      failed.push(e.id);
    }
  }

  const snapshot = await buildSnapshot(user.id);
  return NextResponse.json({ applied: accepted.length, accepted, duplicates, failed, rejected, snapshot });
}
