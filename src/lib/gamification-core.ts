/**
 * Pure gamification math: XP thresholds, levels, streak logic.
 *
 * Isomorphic (no db, no server-only) so the client can mirror XP and levels
 * locally for instant feedback, while the server stays the source of truth
 * after sync. Keep this module dependency-free.
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

export const DAILY_GOAL_XP = 60;

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

export function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Streak-safe date bump. Pure: returns the next streak fields. */
export function nextStreak(current: { streakCount: number; longestStreak: number; lastStudyDate: string | null }): {
  streakCount: number; longestStreak: number; bump: boolean;
} {
  const today = dayKey();
  const last = current.lastStudyDate;
  if (last === today) return { streakCount: current.streakCount, longestStreak: current.longestStreak, bump: false };
  const yesterday = dayKey(new Date(Date.now() - 86400_000));
  const streakCount = last === yesterday ? current.streakCount + 1 : 1;
  return { streakCount: current.streakCount === streakCount ? current.streakCount : streakCount, longestStreak: Math.max(current.longestStreak, streakCount), bump: true };
}
