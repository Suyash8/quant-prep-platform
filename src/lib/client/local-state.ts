'use client';

/**
 * v3 local state: the client-side source of truth for progress.
 *
 * Every record* function runs instantly on this device: quiz grading, SM-2
 * reviews, XP, levels and streaks are all computed here with the same pure
 * math the server uses (mastery.ts, gamification-core.ts). Results append to
 * a persistent event queue that flushes to /api/sync in the background, so
 * the whole app works offline and reconciles with the server later.
 *
 * Storage: localStorage (qf3-state, qf3-queue). Small, synchronous, and it
 * survives restarts. The server snapshot merges in on hydrate with max-wins
 * semantics, which is safe because every counter only ever grows.
 */

import { computeStatus, sm2 } from '@/lib/mastery';
import { XP_TABLE, DAILY_GOAL_XP, levelForXp, nextStreak, dayKey } from '@/lib/gamification-core';
import { getLessonPack } from '@/lib/client/packs';

/* ---------------- types ---------------- */

export interface LessonProgressLocal {
  kcBestPct: number;
  kcAttempts: number;
  exerciseDone: boolean;
  retrievalDone: boolean;
  status: string;
  updatedAt: string;
}

export interface CardLocal {
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastGrade: number;
  updatedAt: string;
}

export interface TodayCounters {
  date: string;
  xp: number;
  lessonsPassed: number;
  practice: number;
}

export interface LocalState {
  v: 3;
  xp: number;
  streakCount: number;
  longestStreak: number;
  lastStudyDate: string | null;
  dailyGoalXp: number;
  lessons: Record<string, LessonProgressLocal>;
  cards: Record<string, CardLocal>;
  /** cardKeys the learner retired (quiz-miss cards graduated twice); hidden even if the server still has them */
  retiredCards: Record<string, true>;
  problems: Record<string, { status: string }>;
  assessments: Record<string, { bestPct: number }>;
  drills: { sessions: number; totalCorrect: number; totalAnswered: number };
  today: TodayCounters;
  /** rough study minutes per day, keyed YYYY-MM-DD */
  minutesByDay: Record<string, number>;
}

export type SyncEvent =
  | { id: string; kind: 'lesson_result'; at: string; lessonId: string; pct: number }
  | { id: string; kind: 'exercise_done'; at: string; lessonId: string }
  | { id: string; kind: 'retrieval_done'; at: string; lessonId: string }
  | { id: string; kind: 'reviews'; at: string; reviews: { cardKey: string; grade: number }[] }
  | { id: string; kind: 'drill_session'; at: string; correct: number; answered: number }
  | { id: string; kind: 'problem_attempt'; at: string; slug: string; status: 'passed' | 'attempted' }
  | { id: string; kind: 'assessment_result'; at: string; assessmentId: string; pct: number };

interface ServerSnapshot {
  xp?: number;
  streakCount?: number;
  longestStreak?: number;
  lastStudyDate?: string | null;
  dailyGoalXp?: number;
  lessons?: Record<string, { kcBestPct?: number; kcAttempts?: number; exerciseDone?: boolean; retrievalDone?: boolean; status?: string }>;
  cards?: Record<string, Partial<CardLocal>>;
  problems?: Record<string, { status?: string }>;
  assessments?: Record<string, { bestPct?: number }>;
  drills?: { sessions?: number; totalCorrect?: number; totalAnswered?: number };
}

/* ---------------- state storage ---------------- */

const STATE_KEY = 'qf3-state';
const QUEUE_KEY = 'qf3-queue';
const QUEUE_CAP = 400;

function emptyState(): LocalState {
  return {
    v: 3,
    xp: 0,
    streakCount: 0,
    longestStreak: 0,
    lastStudyDate: null,
    dailyGoalXp: DAILY_GOAL_XP,
    lessons: {},
    cards: {},
    retiredCards: {},
    problems: {},
    assessments: {},
    drills: { sessions: 0, totalCorrect: 0, totalAnswered: 0 },
    today: { date: dayKey(), xp: 0, lessonsPassed: 0, practice: 0 },
    minutesByDay: {},
  };
}

let state: LocalState | null = null;
let queue: SyncEvent[] = [];

function S(): LocalState {
  if (!state) {
    state = emptyState();
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(STATE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<LocalState>;
          state = { ...emptyState(), ...saved, drills: { ...emptyState().drills, ...(saved.drills ?? {}) } };
        }
      } catch { /* corrupt storage: start fresh */ }
    }
    queue = readQueue();
    rollToday(state);
  }
  return state;
}

function readQueue(): SyncEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    const q = raw ? (JSON.parse(raw) as SyncEvent[]) : [];
    return Array.isArray(q) ? q : [];
  } catch {
    return [];
  }
}

function rollToday(s: LocalState) {
  const today = dayKey();
  if (s.today?.date !== today) s.today = { date: today, xp: 0, lessonsPassed: 0, practice: 0 };
}

function persistState() {
  if (typeof window === 'undefined') return;
  try {
    // keep minute history bounded: 30 days is plenty for the 7-day chart
    const cutoff = dayKey(new Date(Date.now() - 30 * 86400_000));
    for (const k of Object.keys(state?.minutesByDay ?? {})) if (k < cutoff) delete state!.minutesByDay[k];
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch { /* storage full or blocked: state stays in memory */ }
}

function persistQueue() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch { /* ignore */ }
}

/* ---------------- subscribers ---------------- */

const listeners = new Set<() => void>();

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notify() {
  for (const fn of listeners) {
    try { fn(); } catch { /* a broken listener never blocks the others */ }
  }
}

/** mutate + persist + notify (every record* helper ends with this) */
function done() {
  persistState();
  notify();
}

/* ---------------- helpers ---------------- */

const nowIso = () => new Date().toISOString();

function eid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function push(e: SyncEvent) {
  queue.push(e);
  if (queue.length > QUEUE_CAP) queue = queue.slice(queue.length - QUEUE_CAP);
  persistQueue();
}

const STATUS_RANK: Record<string, number> = {
  not_started: 0, in_progress: 1, attempted: 2, needs_revision: 3, passed: 4, mastered: 5,
};
const rankOf = (s: string | undefined) => STATUS_RANK[s ?? ''] ?? 0;

/** add XP, advance the streak, credit the daily goal counters */
function award(amount: number) {
  if (amount <= 0) return;
  const s = S();
  s.xp += amount;
  rollToday(s);
  s.today.xp += amount;
  const streak = nextStreak({ streakCount: s.streakCount, longestStreak: s.longestStreak, lastStudyDate: s.lastStudyDate });
  s.streakCount = streak.streakCount;
  s.longestStreak = streak.longestStreak;
  s.lastStudyDate = dayKey();
}

function addMinutes(min: number) {
  if (!(min > 0)) return;
  const s = S();
  const k = dayKey();
  s.minutesByDay[k] = (s.minutesByDay[k] ?? 0) + Math.min(Math.round(min), 90);
  done();
}

/** best-effort study-time credit: the lesson's own estimated minutes */
function addLessonMinutes(lessonId: string) {
  getLessonPack(lessonId)
    .then(l => { if (l?.estMinutes) addMinutes(l.estMinutes); })
    .catch(() => { /* pack missing: no time credit */ });
}

/* ---------------- snapshot merge (server <-> local) ---------------- */

function applySnapshot(snap: ServerSnapshot) {
  const s = S();
  rollToday(s);

  s.xp = Math.max(s.xp, snap.xp ?? 0);
  s.streakCount = Math.max(s.streakCount, snap.streakCount ?? 0);
  s.longestStreak = Math.max(s.longestStreak, snap.longestStreak ?? 0);
  if ((snap.lastStudyDate ?? '') > (s.lastStudyDate ?? '')) s.lastStudyDate = snap.lastStudyDate ?? null;
  if (snap.dailyGoalXp) s.dailyGoalXp = snap.dailyGoalXp;

  for (const [id, r] of Object.entries(snap.lessons ?? {})) {
    const cur = s.lessons[id];
    if (!cur) {
      s.lessons[id] = {
        kcBestPct: r.kcBestPct ?? 0,
        kcAttempts: r.kcAttempts ?? 0,
        exerciseDone: !!r.exerciseDone,
        retrievalDone: !!r.retrievalDone,
        status: r.status ?? 'not_started',
        updatedAt: nowIso(),
      };
      continue;
    }
    s.lessons[id] = {
      kcBestPct: Math.max(cur.kcBestPct, r.kcBestPct ?? 0),
      kcAttempts: Math.max(cur.kcAttempts, r.kcAttempts ?? 0),
      exerciseDone: cur.exerciseDone || !!r.exerciseDone,
      retrievalDone: cur.retrievalDone || !!r.retrievalDone,
      status: rankOf(r.status) > rankOf(cur.status) ? (r.status as string) : cur.status,
      updatedAt: nowIso(),
    };
  }

  for (const [key, c] of Object.entries(snap.cards ?? {})) {
    if (s.retiredCards[key]) continue; // retired locally: keep it hidden
    const cur = s.cards[key];
    if (!cur || (c.updatedAt ?? '') >= cur.updatedAt) {
      s.cards[key] = {
        ease: c.ease ?? cur?.ease ?? 2.5,
        intervalDays: c.intervalDays ?? cur?.intervalDays ?? 0,
        repetitions: Math.max(c.repetitions ?? 0, cur?.repetitions ?? 0),
        lapses: Math.max(c.lapses ?? 0, cur?.lapses ?? 0),
        dueAt: c.dueAt ?? cur?.dueAt ?? nowIso(),
        lastGrade: c.lastGrade ?? cur?.lastGrade ?? 0,
        updatedAt: c.updatedAt ?? cur?.updatedAt ?? nowIso(),
      };
    }
  }

  for (const [slug, p] of Object.entries(snap.problems ?? {})) {
    const cur = s.problems[slug];
    if (!cur || rankOf(p.status) > rankOf(cur.status)) s.problems[slug] = { status: p.status ?? 'attempted' };
  }

  for (const [id, a] of Object.entries(snap.assessments ?? {})) {
    const best = Math.max(s.assessments[id]?.bestPct ?? 0, a.bestPct ?? 0);
    s.assessments[id] = { bestPct: best };
  }

  s.drills = {
    sessions: Math.max(s.drills.sessions, snap.drills?.sessions ?? 0),
    totalCorrect: Math.max(s.drills.totalCorrect, snap.drills?.totalCorrect ?? 0),
    totalAnswered: Math.max(s.drills.totalAnswered, snap.drills?.totalAnswered ?? 0),
  };
}

/* ---------------- sync engine ---------------- */

let syncDisabled = false; // server said 401: stay local-only until the next successful hydrate
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastHydrate = 0;

export function getQueueLength(): number {
  S();
  return queue.length;
}

export function scheduleFlush(delayMs = 1500) {
  if (typeof window === 'undefined' || syncDisabled) return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { void flush(); }, delayMs);
}

async function flush(): Promise<void> {
  if (typeof window === 'undefined' || syncDisabled || !navigator.onLine) return;
  const batch = queue.slice(0, 200);
  if (batch.length === 0) return;
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ events: batch }),
    });
    if (res.status === 401) { syncDisabled = true; return; }
    if (!res.ok) throw new Error(`sync ${res.status}`);
    const data = (await res.json()) as { snapshot?: ServerSnapshot };
    const sent = new Set(batch.map(e => e.id));
    queue = queue.filter(e => !sent.has(e.id));
    persistQueue();
    if (data.snapshot) applySnapshot(data.snapshot);
    done();
    if (queue.length > 0) scheduleFlush(400); // more to send
  } catch {
    // offline or server hiccup: retry later, nothing is lost
    scheduleFlush(15000);
  }
}

/**
 * Load persisted state, then (in the background) pull the server snapshot and
 * merge it. Rate-limited to one network round-trip per 5 minutes so page
 * navigation stays instant; the local store always renders first.
 */
export function hydrate(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (Date.now() - lastHydrate < 300_000) return Promise.resolve();
  lastHydrate = Date.now();
  S();
  return (async () => {
    try {
      const res = await fetch('/api/sync', { credentials: 'same-origin' });
      if (res.ok) {
        syncDisabled = false;
        const data = (await res.json()) as { snapshot?: ServerSnapshot };
        if (data.snapshot) {
          applySnapshot(data.snapshot);
          done();
        }
      } else if (res.status === 401) {
        syncDisabled = true; // signed out: purely local until the next login
      }
    } catch { /* offline: local state is the truth */ }
    if (queue.length > 0 && navigator.onLine && !syncDisabled) scheduleFlush(300);
  })();
}

/* ---------------- read API ---------------- */

export function getState(): LocalState {
  const s = S();
  rollToday(s);
  return s;
}

export function lessonProgressOf(lessonId: string): LessonProgressLocal | undefined {
  return S().lessons[lessonId];
}

export function doneSet(): Set<string> {
  const s = S();
  const out = new Set<string>();
  for (const [id, l] of Object.entries(s.lessons)) {
    if (l.status === 'passed' || l.status === 'mastered') out.add(id);
  }
  return out;
}

export function dueCardKeys(limit = 100): string[] {
  const s = S();
  const now = Date.now();
  return Object.entries(s.cards)
    .filter(([, c]) => new Date(c.dueAt).getTime() <= now)
    .sort((a, b) => new Date(a[1].dueAt).getTime() - new Date(b[1].dueAt).getTime())
    .slice(0, limit)
    .map(([k]) => k);
}

export function cardStateOf(cardKey: string): CardLocal | undefined {
  return S().cards[cardKey];
}

export function xpSummary(): {
  xp: number; level: number; streakCount: number; longestStreak: number;
  todayXp: number; dailyGoalXp: number; goalReached: boolean;
} {
  const s = getState();
  const goal = s.dailyGoalXp || DAILY_GOAL_XP;
  return {
    xp: s.xp,
    level: levelForXp(s.xp),
    streakCount: s.streakCount,
    longestStreak: s.longestStreak,
    todayXp: s.today.xp,
    dailyGoalXp: goal,
    goalReached: s.today.xp >= goal,
  };
}

/** rough study minutes over the last 7 days */
export function weekMinutes(): number {
  const s = S();
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const k = dayKey(new Date(Date.now() - i * 86400_000));
    total += s.minutesByDay[k] ?? 0;
  }
  return total;
}

/* ---------------- write API (all instant, all offline) ---------------- */

export function recordLessonResult(
  lessonId: string,
  pct: number,
  prev?: LessonProgressLocal,
): { status: string; xp: number } {
  const s = S();
  const p = prev ?? s.lessons[lessonId];
  const next = computeStatus(
    {
      kcBestPct: p?.kcBestPct ?? 0,
      kcAttempts: p?.kcAttempts ?? 0,
      exerciseDone: p?.exerciseDone ?? false,
      retrievalDone: p?.retrievalDone ?? false,
      status: p?.status ?? 'not_started',
    },
    { pct },
  );
  const wasClear = p ? ['passed', 'mastered'].includes(p.status) : false;
  s.lessons[lessonId] = {
    kcBestPct: next.kcBestPct,
    kcAttempts: next.kcAttempts,
    exerciseDone: p?.exerciseDone ?? false,
    retrievalDone: p?.retrievalDone ?? false,
    status: next.status,
    updatedAt: nowIso(),
  };

  let xp = 0;
  if (pct >= 80) {
    xp = wasClear ? 5 : XP_TABLE.lessonPass;
    award(xp);
    rollToday(s);
    if (!wasClear) s.today.lessonsPassed += 1;
  }

  push({ id: eid(), kind: 'lesson_result', at: nowIso(), lessonId, pct });
  addLessonMinutes(lessonId);
  done();
  scheduleFlush();
  return { status: next.status, xp };
}

export function recordExerciseDone(lessonId: string, alreadyDone: boolean): number {
  const s = S();
  const p = s.lessons[lessonId];
  const next = computeStatus(
    {
      kcBestPct: p?.kcBestPct ?? 0,
      kcAttempts: p?.kcAttempts ?? 0,
      exerciseDone: true,
      retrievalDone: p?.retrievalDone ?? false,
      status: p?.status ?? 'not_started',
    },
    { pct: p?.kcBestPct ?? 0, exerciseDone: true },
  );
  s.lessons[lessonId] = {
    kcBestPct: next.kcBestPct,
    kcAttempts: next.kcAttempts,
    exerciseDone: true,
    retrievalDone: p?.retrievalDone ?? false,
    status: next.status,
    updatedAt: nowIso(),
  };

  let xp = 0;
  if (!alreadyDone) {
    xp = XP_TABLE.exercise;
    award(xp);
  }
  push({ id: eid(), kind: 'exercise_done', at: nowIso(), lessonId });
  done();
  scheduleFlush();
  return xp;
}

/** create the lesson's revision cards (server mirrors this on lesson_result) */
export function ensureLocalCards(
  lessonId: string,
  flashcards: { type: string; front: string; back: string }[],
): void {
  const s = S();
  let changed = false;
  for (let i = 0; i < flashcards.length; i++) {
    const key = `${lessonId}:${i}`;
    if (s.cards[key] || s.retiredCards[key]) continue;
    s.cards[key] = {
      ease: 2.5,
      intervalDays: 0,
      repetitions: 0,
      lapses: 0,
      dueAt: new Date(Date.now() + 86400_000).toISOString(),
      lastGrade: 0,
      updatedAt: nowIso(),
    };
    changed = true;
  }
  if (changed) done();
}

export function recordReviews(reviews: { cardKey: string; grade: number }[]): void {
  const s = S();
  let reviewed = 0;
  const applied: { cardKey: string; grade: number }[] = [];
  for (const r of reviews) {
    const c = s.cards[r.cardKey];
    if (!c) continue;
    const next = sm2(
      { ease: c.ease, intervalDays: c.intervalDays, repetitions: c.repetitions, lapses: c.lapses },
      r.grade,
    );
    s.cards[r.cardKey] = {
      ease: next.ease,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      lapses: next.lapses,
      dueAt: next.dueAt.toISOString(),
      lastGrade: r.grade,
      updatedAt: nowIso(),
    };
    applied.push(r);
    reviewed++;

    // reviewing a card of a passed lesson completes retrieval: passed -> mastered
    const lessonId = r.cardKey.includes(':') ? r.cardKey.slice(0, r.cardKey.lastIndexOf(':')) : '';
    const lp = lessonId ? s.lessons[lessonId] : undefined;
    if (lp && ['passed', 'mastered'].includes(lp.status) && !lp.retrievalDone) {
      lp.retrievalDone = true;
      lp.status = 'mastered';
      lp.updatedAt = nowIso();
      push({ id: eid(), kind: 'retrieval_done', at: nowIso(), lessonId });
    }
  }
  if (reviewed === 0) return;

  const xp = Math.min(Math.round((reviewed / 10) * XP_TABLE.revisionPer10), XP_TABLE.revisionCap);
  if (xp > 0) award(xp);
  push({ id: eid(), kind: 'reviews', at: nowIso(), reviews: applied });
  addMinutes(Math.max(1, Math.round(reviewed / 5))); // about 5 cards a minute
  done();
  scheduleFlush();
}

export function deleteCard(cardKey: string): void {
  const s = S();
  if (!s.cards[cardKey]) return;
  delete s.cards[cardKey];
  s.retiredCards[cardKey] = true;
  done();
}

export function recordDrillSession(correct: number, answered: number, elapsedMs?: number): number {
  const s = S();
  s.drills.sessions += 1;
  s.drills.totalCorrect += correct;
  s.drills.totalAnswered += answered;
  rollToday(s);
  s.today.practice += 1;

  const xp = Math.min(XP_TABLE.drillSession + correct * XP_TABLE.drillPerCorrect, XP_TABLE.drillCap + XP_TABLE.drillSession);
  award(xp);

  push({ id: eid(), kind: 'drill_session', at: nowIso(), correct, answered });
  if (elapsedMs && elapsedMs > 0) addMinutes(elapsedMs / 60000);
  done();
  scheduleFlush();
  return xp;
}

export function recordProblemAttempt(slug: string, status: 'passed' | 'attempted'): void {
  const s = S();
  const prev = s.problems[slug];
  const newlyPassed = status === 'passed' && prev?.status !== 'passed';
  if (!prev || rankOf(status) > rankOf(prev.status)) s.problems[slug] = { status };
  if (newlyPassed) {
    award(XP_TABLE.problemPass);
    rollToday(s);
    s.today.practice += 1;
  }
  push({ id: eid(), kind: 'problem_attempt', at: nowIso(), slug, status });
  done();
  scheduleFlush();
}

export function recordAssessmentResult(assessmentId: string, pct: number): number {
  const s = S();
  const prevBest = s.assessments[assessmentId]?.bestPct ?? 0;
  let xp = 0;
  if (pct > prevBest) {
    s.assessments[assessmentId] = { bestPct: pct };
    xp = Math.min(Math.round((pct / 10) * XP_TABLE.assessmentPer10pct), XP_TABLE.assessmentCap);
    award(xp);
  }
  push({ id: eid(), kind: 'assessment_result', at: nowIso(), assessmentId, pct });
  done();
  scheduleFlush();
  return xp;
}
