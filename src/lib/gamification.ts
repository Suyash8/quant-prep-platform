import type { Prisma } from '@prisma/client';
import 'server-only';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import {
  XP_TABLE,
  DAILY_CAP_BY_SOURCE,
  DAILY_TOTAL_CAP,
  levelForXp,
  levelProgress,
  dayKey,
  startOfUserDayUtc,
  nextStreak,
  type GamificationSummary,
} from '@/lib/gamification-core';

export { XP_TABLE, xpForLevel, levelForXp, levelProgress } from '@/lib/gamification-core';
export type { GamificationSummary } from '@/lib/gamification-core';

/**
 * Atomic, idempotent XP award engine (A6, A8, G1).
 * - Uses unique (userId, source, refId) so duplicate awards never pay twice.
 * - Enforces per-source and overall daily XP caps.
 * - Uses atomic `{ increment }` on User.xp.
 */
export async function awardXp(
  userId: string,
  amount: number,
  source: string,
  detail?: string,
  tx?: Prisma.TransactionClient,
  refId?: string,
): Promise<{ xp: number; streakCount: number; amount: number; level: number; leveledUp: boolean } | null> {
  if (amount <= 0) return null;

  const exec = async (c: Prisma.TransactionClient) => {
    const user = await c.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        streakCount: true,
        longestStreak: true,
        lastStudyDate: true,
        timezone: true,
        streakFreezes: true,
      },
    });
    if (!user) return null;

    const tz = user.timezone || 'UTC';
    const dayStart = startOfUserDayUtc(tz);
    const sourceCap = DAILY_CAP_BY_SOURCE[source] ?? 100;

    let grant = amount;
    if (source !== 'backfill') {
      const [todaySource, todayAll] = await Promise.all([
        c.xpEvent.aggregate({
          _sum: { amount: true },
          where: { userId, source, createdAt: { gte: dayStart } },
        }),
        c.xpEvent.aggregate({
          _sum: { amount: true },
          where: { userId, source: { not: 'backfill' }, createdAt: { gte: dayStart } },
        }),
      ]);
      const sourceRoom = Math.max(0, sourceCap - (todaySource._sum.amount ?? 0));
      const totalRoom = Math.max(0, DAILY_TOTAL_CAP - (todayAll._sum.amount ?? 0));
      grant = Math.min(amount, sourceRoom, totalRoom);
      if (grant <= 0) return null;
    }

    const effectiveRef = (refId && refId.trim()) ? refId.trim().slice(0, 180) : randomUUID();
    const inserted = await c.xpEvent.createMany({
      data: [{ userId, amount: grant, source, refId: effectiveRef, detail: detail ?? null }],
      skipDuplicates: true,
    });
    if (inserted.count === 0) {
      return null;
    }

    const beforeLevel = levelForXp(user.xp);
    const streak = nextStreak(
      {
        streakCount: user.streakCount,
        longestStreak: user.longestStreak,
        lastStudyDate: user.lastStudyDate ? dayKey(user.lastStudyDate, tz) : null,
      },
      tz,
      user.streakFreezes,
    );

    const earnFreeze =
      streak.bump && streak.streakCount > 0 && streak.streakCount % 7 === 0 && user.streakFreezes < 2;

    const updatedUser = await c.user.update({
      where: { id: userId },
      data: {
        xp: { increment: grant },
        streakCount: streak.streakCount,
        longestStreak: streak.longestStreak,
        lastStudyDate: new Date(),
        ...(streak.usedFreeze ? { streakFreezes: { decrement: 1 }, freezeUsedAt: new Date() } : {}),
        ...(earnFreeze ? { streakFreezes: { increment: 1 } } : {}),
      },
      select: { xp: true, streakCount: true },
    });

    const afterLevel = levelForXp(updatedUser.xp);
    return {
      xp: updatedUser.xp,
      streakCount: updatedUser.streakCount,
      amount: grant,
      level: afterLevel,
      leveledUp: afterLevel > beforeLevel,
    };
  };

  if (tx) return exec(tx);
  return db.$transaction((t) => exec(t));
}

export async function backfillXpIfNeeded(userId: string): Promise<number> {
  const existing = await db.xpEvent.findFirst({ where: { userId, source: 'backfill' } });
  if (existing) return 0;

  const [lessonRows, drillRows, problemRows, assessRows, cardStates] = await Promise.all([
    db.lessonProgress.findMany({ where: { userId }, select: { status: true } }),
    db.drillSession.findMany({ where: { userId }, select: { correct: true } }),
    db.problemAttempt.findMany({ where: { userId, status: 'passed' }, select: { problemSlug: true } }),
    db.assessmentAttempt.findMany({ where: { userId }, select: { assessmentId: true, scorePct: true } }),
    db.cardState.count({ where: { userId, repetitions: { gt: 0 } } }),
  ]);

  const passed = lessonRows.filter((l) => ['passed', 'mastered'].includes(l.status)).length;
  const mastered = lessonRows.filter((l) => l.status === 'mastered').length;
  const solvedProblems = new Set(problemRows.map((p) => p.problemSlug)).size;
  const drillCorrect = drillRows.reduce((n, d) => n + d.correct, 0);
  const bestAssess = new Map<string, number>();
  for (const a of assessRows) bestAssess.set(a.assessmentId, Math.max(bestAssess.get(a.assessmentId) ?? 0, a.scorePct));

  const total =
    passed * XP_TABLE.lessonPass +
    mastered * XP_TABLE.lessonMaster +
    solvedProblems * XP_TABLE.problemPass +
    Math.min(drillCorrect * 2, 200) +
    [...bestAssess.values()].reduce((n, s) => n + Math.round(s / 10), 0) +
    Math.min(cardStates, 100) * 2;

  if (total <= 0) return 0;
  await awardXp(userId, total, 'backfill', 'Recognised your progress before XP tracking existed', undefined, 'initial-backfill');
  return total;
}

export async function getGamificationSummary(userId: string): Promise<GamificationSummary> {
  await backfillXpIfNeeded(userId);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      xp: true,
      streakCount: true,
      longestStreak: true,
      dailyGoalXp: true,
      lastStudyDate: true,
      timezone: true,
      streakFreezes: true,
    },
  });

  const tz = user?.timezone || 'UTC';
  const startOfDay = startOfUserDayUtc(tz);

  const [todayEvents, recent] = await Promise.all([
    db.xpEvent.findMany({ where: { userId, source: { not: 'backfill' }, createdAt: { gte: startOfDay } }, select: { amount: true } }),
    db.xpEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { amount: true, source: true, detail: true, createdAt: true },
    }),
  ]);

  const xp = user?.xp ?? 0;
  const todayXp = todayEvents.reduce((n, e) => n + e.amount, 0);

  let streakCount = user?.streakCount ?? 0;
  const last = user?.lastStudyDate ? dayKey(user.lastStudyDate, tz) : null;
  const today = dayKey(new Date(), tz);
  const yesterday = dayKey(new Date(Date.now() - 86400_000), tz);
  const twoDaysAgo = dayKey(new Date(Date.now() - 2 * 86400_000), tz);
  const freezeCoversGap = last === twoDaysAgo && (user?.streakFreezes ?? 0) > 0;
  if (last !== today && last !== yesterday && !freezeCoversGap) {
    streakCount = 0;
  }

  return {
    xp,
    level: levelForXp(xp),
    levelProgress: levelProgress(xp),
    streakCount,
    longestStreak: user?.longestStreak ?? 0,
    todayXp,
    dailyGoalXp: user?.dailyGoalXp ?? 50,
    goalReached: todayXp >= (user?.dailyGoalXp ?? 50),
    streakFreezes: user?.streakFreezes ?? 0,
    timezone: tz,
    recentEvents: recent.map((r) => ({ ...r, at: r.createdAt.toISOString() })),
  };
}
