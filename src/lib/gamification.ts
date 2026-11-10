import 'server-only';
import { db } from '@/lib/db';
import {
  XP_TABLE, levelForXp, levelProgress, dayKey, nextStreak,
  type GamificationSummary,
} from '@/lib/gamification-core';

export { XP_TABLE, xpForLevel, levelForXp, levelProgress } from '@/lib/gamification-core';
export type { GamificationSummary } from '@/lib/gamification-core';

/**
 * Gamification core: XP ledger, streaks, levels.
 *
 * Design rules:
 * - The ledger (XpEvent) is append-only; User.xp is a materialised sum.
 * - Streaks update on any XP award: same-day idempotent, yesterday +1, gap resets.
 * - Existing learners get a one-time backfill so the counter is never a fresh,
 *   demotivating zero after weeks of work.
 */

/** Award XP and refresh the streak. Returns the award summary (for toasts/HUD). */
export async function awardXp(
  userId: string,
  amount: number,
  source: string,
  detail?: string,
): Promise<{ xp: number; streakCount: number; amount: number; level: number; leveledUp: boolean } | null> {
  if (amount <= 0) return null;
  const user = await db.user.findUnique({ where: { id: userId }, select: { xp: true, streakCount: true, longestStreak: true, lastStudyDate: true } });
  if (!user) return null;

  const beforeLevel = levelForXp(user.xp);
  const streak = nextStreak({ streakCount: user.streakCount, longestStreak: user.longestStreak, lastStudyDate: user.lastStudyDate ? dayKey(user.lastStudyDate) : null });
  const newXp = user.xp + amount;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        streakCount: streak.streakCount,
        longestStreak: streak.longestStreak,
        lastStudyDate: new Date(),
      },
    }),
    db.xpEvent.create({ data: { userId, amount, source, detail: detail ?? null } }),
  ]);

  const afterLevel = levelForXp(newXp);
  return { xp: newXp, streakCount: streak.streakCount, amount, level: afterLevel, leveledUp: afterLevel > beforeLevel };
}

/**
 * One-time XP backfill for learners who made progress before gamification
 * shipped. Runs at most once (guarded by absence of any XpEvent for the user).
 */
export async function backfillXpIfNeeded(userId: string): Promise<number> {
  const existing = await db.xpEvent.findFirst({ where: { userId, source: 'backfill' } });
  if (existing) return 0;

  const [lessonRows, drillRows, problemRows, assessRows, cardStates] = await Promise.all([
    db.lessonProgress.findMany({ where: { userId }, select: { status: true, kcBestPct: true, exerciseDone: true } }),
    db.drillSession.findMany({ where: { userId }, select: { correct: true } }),
    db.problemAttempt.findMany({ where: { userId }, select: { problemSlug: true, status: true } }),
    db.assessmentAttempt.findMany({ where: { userId }, select: { assessmentId: true, scorePct: true } }),
    db.cardState.count({ where: { userId, repetitions: { gt: 0 } } }),
  ]);

  const passed = lessonRows.filter(l => ['passed', 'mastered'].includes(l.status)).length;
  const mastered = lessonRows.filter(l => l.status === 'mastered').length;
  const exercises = lessonRows.filter(l => l.exerciseDone).length;
  const solvedProblems = new Set(problemRows.filter(p => p.status === 'passed').map(p => p.problemSlug)).size;
  const drillCorrect = drillRows.reduce((n, d) => n + d.correct, 0);
  const bestAssess = new Map<string, number>();
  for (const a of assessRows) bestAssess.set(a.assessmentId, Math.max(bestAssess.get(a.assessmentId) ?? 0, a.scorePct));

  const total =
    passed * 20 + mastered * 10 + exercises * 10 +
    solvedProblems * 30 +
    Math.min(drillCorrect * 2, 200) +
    [...bestAssess.values()].reduce((n, s) => n + Math.round(s / 10), 0) +
    Math.min(cardStates, 100) * 2;

  if (total <= 0) return 0;
  await awardXp(userId, total, 'backfill', 'Recognised your progress before XP tracking existed');
  return total;
}

/** Full HUD payload. Runs the backfill first so the numbers are honest. */
export async function getGamificationSummary(userId: string): Promise<GamificationSummary> {
  await backfillXpIfNeeded(userId);

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [user, todayEvents, recent] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { xp: true, streakCount: true, longestStreak: true, dailyGoalXp: true, lastStudyDate: true },
    }),
    db.xpEvent.findMany({ where: { userId, createdAt: { gte: startOfDay } }, select: { amount: true } }),
    db.xpEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 12, select: { amount: true, source: true, detail: true, createdAt: true } }),
  ]);

  const xp = user?.xp ?? 0;
  const todayXp = todayEvents.reduce((n, e) => n + e.amount, 0);

  // A streak shows as live only if the last study day is today or yesterday.


  let streakCount = user?.streakCount ?? 0;
  const last = user?.lastStudyDate ? dayKey(user.lastStudyDate) : null;
  const yesterday = dayKey(new Date(Date.now() - 86400_000));
  if (last !== dayKey(new Date()) && last !== yesterday) streakCount = 0;

  return {
    xp,
    level: levelForXp(xp),
    levelProgress: levelProgress(xp),
    streakCount,
    longestStreak: user?.longestStreak ?? 0,
    todayXp,
    dailyGoalXp: user?.dailyGoalXp ?? 50,
    goalReached: todayXp >= (user?.dailyGoalXp ?? 50),
    recentEvents: recent.map(e => ({ amount: e.amount, source: e.source, detail: e.detail, at: e.createdAt.toISOString() })),
  };
}
