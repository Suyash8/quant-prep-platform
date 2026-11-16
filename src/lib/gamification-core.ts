/**
 * Pure gamification math: XP thresholds, levels, timezone-aware streak logic.
 *
 * Isomorphic (no db, no server-only) so the client can display provisional feedback
 * immediately while the server ledger stays authoritative after sync.
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
  streakFreezes?: number;
  timezone?: string;
  recentEvents: { amount: number; source: string; detail: string | null; at: string }[];
}

export const XP_TABLE = {
  lessonPass: 20,
  lessonMaster: 10,
  exercise: 0, // A5: self-attested checklist awards 0 XP
  drillSession: 5,
  drillPerCorrect: 2,
  drillCap: 15,
  problemPass: 30,
  assessmentPer10pct: 2,
  assessmentCap: 20,
  revisionPer10: 5,
  revisionCap: 15,
} as const;

export const DAILY_CAP_BY_SOURCE: Record<string, number> = {
  lesson_pass: 240,
  lesson_master: 150,
  exercise: 0,
  drill: 60,
  drills: 60,
  revision: 45,
  assessment: 120,
  diagnostic: 60,
  problem: 300,
  backfill: 50000,
};

export const DAILY_TOTAL_CAP = 400;
export const DAILY_GOAL_XP = 50;

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
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

/** Format YYYY-MM-DD in the learner's configured IANA timezone (A8). */
export function dayKey(d: Date = new Date(), timeZone = 'UTC'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Offset start-of-day UTC Date approximation for querying today's ledger in user's timezone. */
export function startOfUserDayUtc(timeZone = 'UTC', now: Date = new Date()): Date {
  const localDay = dayKey(now, timeZone);
  // Look back up to 24h from UTC midnight around localDay cleanly
  const midnightUtc = new Date(`${localDay}T00:00:00.000Z`);
  // Determine offset by comparing formatted date at midnightUtc
  const testDay = dayKey(midnightUtc, timeZone);
  if (testDay > localDay) return new Date(midnightUtc.getTime() - 12 * 3600_000);
  if (testDay < localDay) return new Date(midnightUtc.getTime() + 12 * 3600_000);
  return midnightUtc;
}

export function nextStreak(
  current: { streakCount: number; longestStreak: number; lastStudyDate: string | null },
  timeZone = 'UTC',
  streakFreezesAvailable = 0,
): {
  streakCount: number;
  longestStreak: number;
  bump: boolean;
  usedFreeze: boolean;
} {
  const today = dayKey(new Date(), timeZone);
  const last = current.lastStudyDate;
  if (last === today) {
    return {
      streakCount: current.streakCount,
      longestStreak: current.longestStreak,
      bump: false,
      usedFreeze: false,
    };
  }
  const yesterday = dayKey(new Date(Date.now() - 86400_000), timeZone);
  const twoDaysAgo = dayKey(new Date(Date.now() - 2 * 86400_000), timeZone);

  if (last === yesterday) {
    const streakCount = current.streakCount + 1;
    return {
      streakCount,
      longestStreak: Math.max(current.longestStreak, streakCount),
      bump: true,
      usedFreeze: false,
    };
  }
  if (last === twoDaysAgo && streakFreezesAvailable > 0 && current.streakCount > 0) {
    // Auto-apply one weekly streak freeze across a single missed calendar day
    const streakCount = current.streakCount + 1;
    return {
      streakCount,
      longestStreak: Math.max(current.longestStreak, streakCount),
      bump: true,
      usedFreeze: true,
    };
  }

  return {
    streakCount: 1,
    longestStreak: Math.max(current.longestStreak, 1),
    bump: true,
    usedFreeze: false,
  };
}
