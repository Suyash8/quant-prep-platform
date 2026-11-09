import 'server-only';
import { db } from '@/lib/db';

/**
 * Gamification core: XP ledger, streaks, levels.
 *
 * Design rules:
 * - The ledger (XpEvent) is append-only; User.xp is a materialised sum.
 * - Streaks update on any XP award: same-day idempotent, yesterday +1, gap resets.
 * - Existing learners get a one-time backfill so the counter is never a fresh,
 *   demotivating zero after weeks of work.
 */

export interface GamificationSummary {
  xp: number;
  level: number;
  levelProgress: { into: number; needed: number; pct: number };
  streakCount: number;
  longestStreak: number;
  todayXp: number;
  dailyGoalXp: number;
  goalReached: boolean;
  recentEvents: { amount: number; source: string; detail: string | null; at: string }[];
}

/** Cumulative XP required to *reach* level L (L >= 1). Level 1 is free. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  // 100 for L2, +30 per additional level: 100, 230, 390, 580, ...
  let total = 0;
  for (let l = 2; l <= level; l++) total += 100 + (l - 2) * 30;
  return total;
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function levelProgress(xp: number): { into: number; needed: number; pct: number } {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const into = xp - base;
  const needed = next - base;
  return { into, needed, pct: Math.min(100, Math.round((into / needed) * 100)) };
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Streak-safe date bump. Returns new streak fields for the user. */
function nextStreak(current: { streakCount: number; longestStreak: number; lastStudyDate: Date | null }): {
  streakCount: number; longestStreak: number; bump: boolean;
} {
  const today = dayKey(new Date());
  const last = current.lastStudyDate ? dayKey(current.lastStudyDate) : null;
  if (last === today) return { streakCount: current.streakCount, longestStreak: current.longestStreak, bump: false };
  const yesterday = dayKey(new Date(Date.now() - 86400_000));
  const streakCount = last === yesterday ? current.streakCount + 1 : 1;
  return { streakCount, longestStreak: Math.max(current.longestStreak, streakCount), bump: current.streakCount !== streakCount };
}

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
  const streak = nextStreak(user);
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

/** XP amounts for each activity — keep these in one place so they feel coherent. */
export const XP_TABLE = {
  lessonPass: 20,
  lessonMaster: 10, // bonus on top of pass
  exercise: 10,
  drillSession: 5,
  drillPerCorrect: 2,
  drillCap: 15,
  problemPass: 30,
  assessmentPer10pct: 2,
  assessmentCap: 20,
  revisionPer10: 5,
  revisionCap: 15,
} as const;
