import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getLessonById } from '@/lib/content';
import { computeStatus, sm2 } from '@/lib/mastery';
import { awardXp, XP_TABLE } from '@/lib/gamification';
import type { SyncEvent } from '@/lib/client/local-state';

/**
 * Batch sync endpoint (v3 offline-first).
 *
 * POST: applies queued client events (idempotent by event id, so replays and
 *       double-sends are safe) and returns the authoritative snapshot.
 * GET:  returns the snapshot alone (first-load hydration).
 */

async function buildSnapshot(userId: string) {
  const [user, lessonRows, cardRows, problemRows, assessRows, drillRows, sessionRows] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { xp: true, streakCount: true, longestStreak: true, lastStudyDate: true, dailyGoalXp: true } }),
    db.lessonProgress.findMany({ where: { userId } }),
    db.cardState.findMany({ where: { userId } }),
    db.problemAttempt.findMany({ where: { userId } }),
    db.assessmentAttempt.findMany({ where: { userId } }),
    db.drillSession.findMany({ where: { userId }, select: { correct: true, total: true } }),
    db.learningSession.findMany({ where: { userId }, select: { day: true, seconds: true } }),
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

  // v3.1: study minutes per day (last 30 days) so a fresh browser charts real history
  const cutoffDay = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const minutesByDay: Record<string, number> = {};
  for (const row of sessionRows) {
    if (row.day < cutoffDay) continue;
    minutesByDay[row.day] = (minutesByDay[row.day] ?? 0) + Math.round(row.seconds / 60);
  }

  return {
    xp: user?.xp ?? 0,
    streakCount: user?.streakCount ?? 0,
    longestStreak: user?.longestStreak ?? 0,
    lastStudyDate: user?.lastStudyDate ? user.lastStudyDate.toISOString().slice(0, 10) : null,
    dailyGoalXp: user?.dailyGoalXp ?? 60,
    minutesByDay,
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

async function applyEvent(userId: string, e: SyncEvent) {
  // idempotency per user: the same event replayed (double-send, reconnect)
  // is skipped, but another user's events never collide
  const dedupeKey = `${userId}:${e.id}`;
  const seen = await db.syncEvent.findUnique({ where: { eventId: dedupeKey } });
  if (seen) return;
  await db.syncEvent.create({ data: { eventId: dedupeKey, userId } }).catch(() => {
    /* unique race: another tab applied it first */
  });

  switch (e.kind) {
    case 'lesson_result': {
      const found = getLessonById(e.lessonId);
      if (!found) return;
      const prev = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId: e.lessonId } } });
      const next = computeStatus(
        {
          kcBestPct: prev?.kcBestPct ?? 0, kcAttempts: prev?.kcAttempts ?? 0,
          exerciseDone: prev?.exerciseDone ?? false, retrievalDone: prev?.retrievalDone ?? false,
          status: prev?.status ?? 'not_started',
        },
        { pct: e.pct },
      );
      const row = await db.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: e.lessonId } },
        create: { userId, lessonId: e.lessonId, status: next.status, kcBestPct: next.kcBestPct, kcAttempts: next.kcAttempts },
        update: { status: next.status, kcBestPct: next.kcBestPct, kcAttempts: next.kcAttempts },
      });
      if (row.status === 'passed' && row.retrievalDone) {
        await db.lessonProgress.update({ where: { id: row.id }, data: { status: 'mastered' } });
      }
      if (e.pct >= 80) {
        const firstClear = !['passed', 'mastered'].includes(prev?.status ?? 'not_started');
        await awardXp(userId, firstClear ? XP_TABLE.lessonPass : 5, 'lesson_pass', found.lesson.title).catch(() => {});
      }
      // mirror the lesson route: grow the revision deck for this lesson
      for (let i = 0; i < found.lesson.flashcards.length; i++) {
        const key = `${e.lessonId}:${i}`;
        await db.cardState.upsert({
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
      const prev = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId: e.lessonId } } });
      // exercise + a passing quiz score (possibly from an earlier event) = passed
      const bestPct = prev?.kcBestPct ?? 0;
      const retrievalDone = prev?.retrievalDone ?? false;
      let status: string = prev?.status ?? 'not_started';
      if (bestPct >= 80) status = retrievalDone ? 'mastered' : 'passed';
      else if (status === 'not_started') status = 'in_progress';
      await db.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: e.lessonId } },
        create: { userId, lessonId: e.lessonId, status, exerciseDone: true },
        update: { exerciseDone: true, status },
      });
      if (!prev?.exerciseDone) await awardXp(userId, XP_TABLE.exercise, 'exercise').catch(() => {});
      break;
    }
    case 'retrieval_done': {
      const prev = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId: e.lessonId } } });
      if (!prev) return;
      const data: Record<string, unknown> = { retrievalDone: true };
      if (['passed', 'mastered'].includes(prev.status)) data.status = 'mastered';
      await db.lessonProgress.update({ where: { id: prev.id }, data });
      break;
    }
    case 'reviews': {
      for (const r of e.reviews ?? []) {
        const card = await db.cardState.findUnique({ where: { userId_cardKey: { userId, cardKey: r.cardKey } } });
        if (!card) continue;
        const next = sm2(
          { ease: card.ease, intervalDays: card.intervalDays, repetitions: card.repetitions, lapses: card.lapses },
          r.grade,
        );
        await db.cardState.update({
          where: { id: card.id },
          data: { ease: next.ease, intervalDays: next.intervalDays, repetitions: next.repetitions, lapses: next.lapses, dueAt: next.dueAt, lastGrade: r.grade },
        });
      }
      const xp = Math.min(Math.round(((e.reviews?.length ?? 0) / 10) * XP_TABLE.revisionPer10), XP_TABLE.revisionCap);
      if (xp > 0) await awardXp(userId, xp, 'revision').catch(() => {});
      break;
    }
    case 'drill_session': {
      await db.drillSession.create({ data: { userId, mode: 'mixed', correct: e.correct, total: e.answered } });
      const xp = Math.min(XP_TABLE.drillSession + e.correct * XP_TABLE.drillPerCorrect, XP_TABLE.drillCap + XP_TABLE.drillSession);
      await awardXp(userId, xp, 'drills').catch(() => {});
      break;
    }
    case 'problem_attempt': {
      const prev = await db.problemAttempt.findFirst({ where: { userId, problemSlug: e.slug } });
      if (prev) {
        const rank = (s: string) => (s === 'passed' ? 2 : 1);
        if (rank(e.status) > rank(prev.status)) {
          await db.problemAttempt.update({ where: { id: prev.id }, data: { status: e.status } });
        }
      } else {
        await db.problemAttempt.create({ data: { userId, problemSlug: e.slug, language: 'python', status: e.status, passedTests: e.status === 'passed' ? 1 : 0, totalTests: 1 } });
      }
      if (e.status === 'passed' && prev?.status !== 'passed') {
        await awardXp(userId, XP_TABLE.problemPass, 'problem', e.slug).catch(() => {});
      }
      break;
    }
    case 'assessment_result': {
      const prev = await db.assessmentAttempt.findFirst({ where: { userId, assessmentId: e.assessmentId } });
      if (prev) {
        if (e.pct > prev.scorePct) {
          await db.assessmentAttempt.update({ where: { id: prev.id }, data: { scorePct: e.pct, submittedAt: new Date() } });
        }
      } else {
        await db.assessmentAttempt.create({ data: { userId, assessmentId: e.assessmentId, kind: 'assessment', scorePct: e.pct, detail: '{}', submittedAt: new Date() } });
      }
      if (e.pct > (prev?.scorePct ?? 0)) {
        const xp = Math.min(Math.round((e.pct / 10) * XP_TABLE.assessmentPer10pct), XP_TABLE.assessmentCap);
        if (xp > 0) await awardXp(userId, xp, 'assessment', e.assessmentId).catch(() => {});
      }
      break;
    }
  }
}

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
  const events = (body?.events ?? []) as SyncEvent[];
  if (!Array.isArray(events) || events.length > 200) {
    return NextResponse.json({ error: 'Invalid sync batch.' }, { status: 400 });
  }

  let applied = 0;
  for (const e of events) {
    if (!e || typeof e.id !== 'string' || typeof e.kind !== 'string') continue;
    try {
      await applyEvent(user.id, e);
      applied++;
    } catch {
      /* keep going: snapshot merge keeps client and server converging */
    }
  }

  const snapshot = await buildSnapshot(user.id);
  return NextResponse.json({ applied, snapshot });
}
