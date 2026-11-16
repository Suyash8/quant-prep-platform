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
import { kvGet, kvSet, kvClearAll } from '@/lib/client/idb';
import { broadcast, onBroadcast } from '@/lib/client/broadcast';

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

export interface DrillSessionLocal {
  at: string;
  kind: string;
  level?: number;
  correct: number;
  answered: number;
  avgMs?: number;
  elapsedMs?: number;
}

export interface ProjectProgressLocal {
  status: string;
  milestonesDone: number;
  notes: string;
  updatedAt: string;
}

export interface PlanTaskLocal {
  week: number;
  day: number;
  kind: string;
  title: string;
  ref?: string;
  minutes: number;
}

export interface PlannerLocal {
  config: {
    hoursPerWeek: number;
    daysPerWeek: number;
    track: string;
    mode: string;
    targetDate: string | null;
  };
  plan: {
    tasks: PlanTaskLocal[];
    weeks: number;
    totalHours: number;
    note: string;
    feasibility: string;
  };
  updatedAt: string;
}

export interface ApplicationLocal {
  id: string;
  company: string;
  role: string;
  status: string;
  note: string;
  updatedAt: string;
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
  drillSessions: DrillSessionLocal[];
  projects: Record<string, ProjectProgressLocal>;
  planner: PlannerLocal | null;
  notes: Record<string, string>;
  bookmarks: Record<string, true>;
  applications: ApplicationLocal[];
  today: TodayCounters;
  /** rough study minutes per day, keyed YYYY-MM-DD */
  minutesByDay: Record<string, number>;
}

export type SyncEvent =
  | { id: string; kind: 'lesson_attempt'; at: string; lessonId: string; contentHash?: string; answers: Record<string, unknown> }
  | { id: string; kind: 'assessment_attempt'; at: string; assessmentId: string; answers: Record<string, unknown> }
  | { id: string; kind: 'exercise_done'; at: string; lessonId: string }
  | { id: string; kind: 'reviews'; at: string; reviews: { cardKey: string; grade: number }[] }
  | { id: string; kind: 'drill_session'; at: string; mode?: string; level?: number; correct: number; answered: number; durationS?: number };

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
const API_QUEUE_KEY = 'qf3-api-queue';
const QUEUE_CAP = 400;

interface ApiMutation {
  id: string;
  url: string;
  body: Record<string, unknown>;
}

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
    drillSessions: [],
    projects: {},
    planner: null,
    notes: {},
    bookmarks: {},
    applications: [],
    today: { date: dayKey(), xp: 0, lessonsPassed: 0, practice: 0 },
    minutesByDay: {},
  };
}

let state: LocalState | null = null;
let queue: SyncEvent[] = [];
let apiQueue: ApiMutation[] = [];
let listenersBound = false;

function readApiQueue(): ApiMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(API_QUEUE_KEY);
    const q = raw ? (JSON.parse(raw) as ApiMutation[]) : [];
    return Array.isArray(q) ? q : [];
  } catch {
    return [];
  }
}

function persistApiQueue() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(API_QUEUE_KEY, JSON.stringify(apiQueue));
  } catch { /* ignore */ }
}

function bindGlobalListeners() {
  if (listenersBound || typeof window === 'undefined') return;
  listenersBound = true;
  window.addEventListener('online', () => {
    void flush();
  });
  onBroadcast((pkt) => {
    if (
      pkt.topic === 'state-changed' ||
      pkt.topic === 'goal-changed' ||
      pkt.topic === 'planner-changed' ||
      pkt.topic === 'projects-changed'
    ) {
      state = null;
      S();
      notify();
    }
  });
}

function S(): LocalState {
  bindGlobalListeners();
  if (!state) {
    state = emptyState();
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(STATE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<LocalState>;
          state = {
            ...emptyState(),
            ...saved,
            drills: { ...emptyState().drills, ...(saved.drills ?? {}) },
            drillSessions: Array.isArray(saved.drillSessions) ? saved.drillSessions : [],
            projects: saved.projects ?? {},
            planner: saved.planner ?? null,
            notes: saved.notes ?? {},
            bookmarks: saved.bookmarks ?? {},
            applications: Array.isArray(saved.applications) ? saved.applications : [],
          };
        } else {
          // Asynchronous IDB fallback recovery if localStorage was cleared
          void kvGet<LocalState>('qf-state-backup').then((backup) => {
            if (backup && !window.localStorage.getItem(STATE_KEY)) {
              state = { ...emptyState(), ...backup };
              persistState(false);
              notify();
            }
          });
        }
      } catch { /* corrupt storage: start fresh */ }
    }
    queue = readQueue();
    apiQueue = readApiQueue();
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

function persistState(mirrorIdb = true) {
  if (typeof window === 'undefined') return;
  try {
    // keep minute history bounded: 30 days is plenty for the 7-day chart
    const cutoff = dayKey(new Date(Date.now() - 30 * 86400_000));
    for (const k of Object.keys(state?.minutesByDay ?? {})) if (k < cutoff) delete state!.minutesByDay[k];
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
    if (mirrorIdb && state) void kvSet('qf-state-backup', state);
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

/** mutate + persist + notify + broadcast (every record* helper ends with this) */
function done() {
  persistState();
  notify();
  broadcast('state-changed');
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
  not_started: 0, in_progress: 1, attempted: 2, needs_revision: 3, placed_out: 4, passed: 5, mastered: 6,
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

const OWNER_KEY = 'qf3-owner';
const LAST_SYNC_KEY = 'qf3-last-sync';

/**
 * Wipe all local learning state, queues, player caches, and IndexedDB stores.
 * Called automatically when switching users or signing out (A7).
 */
export async function wipeLocalLearningData(): Promise<void> {
  state = null;
  queue = [];
  apiQueue = [];
  lastHydrate = 0;
  if (typeof window !== 'undefined') {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (!k) continue;
        if (
          k.startsWith('qf3-') ||
          k.startsWith('qf3:') ||
          k.startsWith('qf-player-') ||
          k.startsWith('qf-code-') ||
          k.startsWith('qf-draft-')
        ) {
          toRemove.push(k);
        }
      }
      for (const k of toRemove) window.localStorage.removeItem(k);
    } catch { /* ignore */ }
  }
  await kvClearAll().catch(() => {});
  notify();
  broadcast('state-changed');
}

/** Bind local storage strictly to the active signed-in userId; wipes prior user data if different (A7). */
export function bindOwner(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const prev = window.localStorage.getItem(OWNER_KEY);
    if (prev && prev !== userId) {
      void wipeLocalLearningData().then(() => {
        try { window.localStorage.setItem(OWNER_KEY, userId); } catch {}
      });
      return;
    }
    window.localStorage.setItem(OWNER_KEY, userId);
  } catch { /* ignore */ }
}

export function getLastSyncedAt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

export async function retryFlushNow(): Promise<void> {
  syncDisabled = false;
  await flush();
}

function applySnapshot(snap: ServerSnapshot) {
  const s = S();
  rollToday(s);

  // Server snapshot is authoritative (A9): replace scalar & per-entity records cleanly.
  if (typeof snap.xp === 'number') s.xp = snap.xp;
  if (typeof snap.streakCount === 'number') s.streakCount = snap.streakCount;
  if (typeof snap.longestStreak === 'number') s.longestStreak = snap.longestStreak;
  if (snap.lastStudyDate !== undefined) s.lastStudyDate = snap.lastStudyDate;
  if (snap.dailyGoalXp) s.dailyGoalXp = snap.dailyGoalXp;

  if (snap.lessons) {
    const nextLessons: Record<string, LessonProgressLocal> = {};
    for (const [id, r] of Object.entries(snap.lessons)) {
      nextLessons[id] = {
        kcBestPct: r.kcBestPct ?? 0,
        kcAttempts: r.kcAttempts ?? 0,
        exerciseDone: !!r.exerciseDone,
        retrievalDone: !!r.retrievalDone,
        status: r.status ?? 'not_started',
        updatedAt: nowIso(),
      };
    }
    // Preserve any un-flushed offline lesson attempts/exercises optimistically
    for (const ev of queue) {
      if (ev.kind === 'lesson_attempt' && !nextLessons[ev.lessonId]) {
        nextLessons[ev.lessonId] = s.lessons[ev.lessonId] ?? {
          kcBestPct: 0, kcAttempts: 1, exerciseDone: false, retrievalDone: false, status: 'attempted', updatedAt: nowIso(),
        };
      }
    }
    s.lessons = nextLessons;
  }

  if (snap.cards) {
    for (const [key, c] of Object.entries(snap.cards)) {
      if (s.retiredCards[key]) continue;
      s.cards[key] = {
        ease: c.ease ?? 2.5,
        intervalDays: c.intervalDays ?? 0,
        repetitions: c.repetitions ?? 0,
        lapses: c.lapses ?? 0,
        dueAt: c.dueAt ?? nowIso(),
        lastGrade: c.lastGrade ?? 0,
        updatedAt: c.updatedAt ?? nowIso(),
      };
    }
  }

  if (snap.problems) {
    const nextProblems: Record<string, { status: string }> = {};
    for (const [slug, p] of Object.entries(snap.problems)) {
      nextProblems[slug] = { status: p.status ?? 'attempted' };
    }
    s.problems = nextProblems;
  }

  if (snap.assessments) {
    const nextAssess: Record<string, { bestPct: number }> = {};
    for (const [id, a] of Object.entries(snap.assessments)) {
      nextAssess[id] = { bestPct: a.bestPct ?? 0 };
    }
    s.assessments = nextAssess;
  }

  if (snap.drills) {
    s.drills = {
      sessions: snap.drills.sessions ?? 0,
      totalCorrect: snap.drills.totalCorrect ?? 0,
      totalAnswered: snap.drills.totalAnswered ?? 0,
    };
  }
}

/* ---------------- sync engine ---------------- */

let syncDisabled = false; // server said 401: stay local-only until the next successful hydrate
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastHydrate = 0;

export function getQueueLength(): number {
  S();
  return queue.length + apiQueue.length;
}

function pushApi(url: string, body: Record<string, unknown>) {
  apiQueue.push({ id: eid(), url, body });
  if (apiQueue.length > QUEUE_CAP) apiQueue = apiQueue.slice(apiQueue.length - QUEUE_CAP);
  persistApiQueue();
}

async function flushApiQueue(): Promise<void> {
  if (apiQueue.length === 0 || syncDisabled || !navigator.onLine) return;
  const remaining: ApiMutation[] = [];
  for (let i = 0; i < apiQueue.length; i++) {
    const item = apiQueue[i];
    try {
      const res = await fetch(item.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(item.body),
      });
      if (res.status === 401) {
        syncDisabled = true;
        remaining.push(...apiQueue.slice(i));
        break;
      }
      if (!res.ok && res.status >= 500) {
        remaining.push(item);
      }
      // 4xx validation errors are dropped to prevent blocking later valid writes
    } catch {
      remaining.push(...apiQueue.slice(i));
      break;
    }
  }
  apiQueue = remaining;
  persistApiQueue();
}

export function scheduleFlush(delayMs = 1500) {
  if (typeof window === 'undefined' || syncDisabled) return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { void flush(); }, delayMs);
}

const syncAttempts = new Map<string, number>();

async function flush(): Promise<void> {
  if (typeof window === 'undefined' || syncDisabled || !navigator.onLine) return;
  await flushApiQueue();
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
    const data = (await res.json()) as {
      snapshot?: ServerSnapshot;
      acked?: string[];
      accepted?: string[];
      duplicates?: string[];
      failed?: string[];
      rejected?: { id: string | null; reason: string }[];
    };
    const acked = new Set([...(data.acked ?? []), ...(data.accepted ?? []), ...(data.duplicates ?? [])]);
    const failedIds = new Set(data.failed ?? []);
    for (const id of failedIds) syncAttempts.set(id, (syncAttempts.get(id) ?? 0) + 1);
    // Schema-invalid events can never succeed: move them out of the retry queue into a
    // visible quarantine record instead of blocking or silently deleting them.
    const rejectedIds = new Set((data.rejected ?? []).map(r => r.id).filter((x): x is string => !!x));
    if (rejectedIds.size > 0) {
      try {
        const old = JSON.parse(localStorage.getItem('qf3-rejected') || '[]') as unknown[];
        const moved = queue.filter(e => rejectedIds.has(e.id));
        localStorage.setItem('qf3-rejected', JSON.stringify([...old, ...moved.map(e => ({ rejectedAt: new Date().toISOString(), event: e, reason: data.rejected?.find(r => r.id === e.id)?.reason }))].slice(-50)));
      } catch { /* storage unavailable */ }
    }
    queue = queue.filter(e => !acked.has(e.id) && !rejectedIds.has(e.id));
    try {
      if (failedIds.size > 0 || rejectedIds.size > 0) {
        // durable error visibility: survives reloads and can be shown in Settings
        localStorage.setItem('qf3:sync-error', JSON.stringify({ at: new Date().toISOString(), failed: failedIds.size, rejected: rejectedIds.size, queued: queue.length }));
      } else {
        localStorage.removeItem('qf3:sync-error');
      }
    } catch { /* storage unavailable */ }
    persistQueue();
    try { localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()); } catch {}
    if (data.snapshot) applySnapshot(data.snapshot);
    done();
    if (queue.length > 0) scheduleFlush(failedIds.size > 0 ? Math.min(15000 * Math.max(...[...failedIds].map(id => syncAttempts.get(id) ?? 1)), 600000) : 400); // back off after failures
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
    else if (apiQueue.length > 0 && navigator.onLine && !syncDisabled) scheduleFlush(300);
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
    if (l.status === 'passed' || l.status === 'mastered' || l.status === 'placed_out') out.add(id);
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

/**
 * Update local UI mirror from a server-graded lesson result (online), OR queue raw answers
 * as evidence for offline reconciliation (`lesson_attempt`, never trusting client pct).
 */
export function recordLessonAttempt(
  lessonId: string,
  answers: Record<string, unknown>,
  serverResult?: { pct: number; status: string; xpAwarded?: number; exerciseDone?: boolean },
  contentHash?: string,
): { status: string; xp: number } {
  const s = S();
  const p = s.lessons[lessonId];
  if (serverResult) {
    const wasClear = p ? ['passed', 'mastered'].includes(p.status) : false;
    s.lessons[lessonId] = {
      kcBestPct: Math.max(p?.kcBestPct ?? 0, serverResult.pct),
      kcAttempts: (p?.kcAttempts ?? 0) + 1,
      exerciseDone: serverResult.exerciseDone ?? p?.exerciseDone ?? false,
      retrievalDone: serverResult.status === 'mastered' || p?.retrievalDone || false,
      status: serverResult.status,
      updatedAt: nowIso(),
    };
    const xp = serverResult.xpAwarded ?? 0;
    if (xp > 0) {
      award(xp);
      rollToday(s);
      if (!wasClear && ['passed', 'mastered'].includes(serverResult.status)) s.today.lessonsPassed += 1;
    }
    addLessonMinutes(lessonId);
    done();
    return { status: serverResult.status, xp };
  }

  // Offline provisional mirror: queues raw answers evidence for authoritative server grading on reconnect
  s.lessons[lessonId] = {
    kcBestPct: p?.kcBestPct ?? 0,
    kcAttempts: (p?.kcAttempts ?? 0) + 1,
    exerciseDone: p?.exerciseDone ?? false,
    retrievalDone: p?.retrievalDone ?? false,
    status: p && ['passed', 'mastered'].includes(p.status) ? p.status : 'attempted',
    updatedAt: nowIso(),
  };
  push({ id: eid(), kind: 'lesson_attempt', at: nowIso(), lessonId, contentHash, answers });
  addLessonMinutes(lessonId);
  done();
  scheduleFlush();
  return { status: s.lessons[lessonId].status, xp: 0 };
}

/** Local mirror update from verified score only (does not emit client-scored sync events). */
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
  s.lessons[lessonId] = {
    kcBestPct: next.kcBestPct,
    kcAttempts: next.kcAttempts,
    exerciseDone: p?.exerciseDone ?? false,
    retrievalDone: p?.retrievalDone ?? false,
    status: next.status,
    updatedAt: nowIso(),
  };
  done();
  return { status: next.status, xp: 0 };
}

export function recordExerciseDone(lessonId: string, _alreadyDone: boolean): number {
  const s = S();
  const p = s.lessons[lessonId];
  s.lessons[lessonId] = {
    kcBestPct: p?.kcBestPct ?? 0,
    kcAttempts: p?.kcAttempts ?? 0,
    exerciseDone: true,
    retrievalDone: p?.retrievalDone ?? false,
    status: p?.status && p.status !== 'not_started' ? p.status : 'in_progress',
    updatedAt: nowIso(),
  };
  // A5: study checklist pays 0 XP
  push({ id: eid(), kind: 'exercise_done', at: nowIso(), lessonId });
  done();
  scheduleFlush();
  return 0;
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

export function recordDrillSession(
  correct: number,
  answered: number,
  elapsedMs?: number,
  kind = 'mental-math',
  meta?: { level?: number; avgMs?: number },
): number {
  const s = S();
  s.drills.sessions += 1;
  s.drills.totalCorrect += correct;
  s.drills.totalAnswered += answered;
  s.drillSessions = [
    { at: nowIso(), kind, level: meta?.level ?? 1, correct, answered, avgMs: meta?.avgMs, elapsedMs },
    ...s.drillSessions,
  ].slice(0, 100);
  rollToday(s);
  s.today.practice += 1;

  const xp = Math.min(XP_TABLE.drillSession + correct * XP_TABLE.drillPerCorrect, XP_TABLE.drillCap + XP_TABLE.drillSession);
  award(xp);

  const durationS = elapsedMs && elapsedMs > 0 ? Math.max(1, Math.round(elapsedMs / 1000)) : 30;
  push({
    id: eid(),
    kind: 'drill_session',
    at: nowIso(),
    mode: kind,
    level: meta?.level ?? 1,
    correct,
    answered,
    durationS,
  });
  if (elapsedMs && elapsedMs > 0) addMinutes(elapsedMs / 60000);
  done();
  scheduleFlush();
  return xp;
}

export function snoozeCard(cardKey: string, days = 1): void {
  const s = S();
  const c = s.cards[cardKey];
  if (!c) return;
  const due = new Date(Date.now() + days * 86400_000).toISOString();
  s.cards[cardKey] = { ...c, dueAt: due, updatedAt: nowIso() };
  done();
}

export function restoreCardSnapshot(cardKey: string, snapshot: CardLocal): void {
  const s = S();
  s.cards[cardKey] = { ...snapshot, updatedAt: nowIso() };
  delete s.retiredCards[cardKey];
  done();
}

export function unretireCard(cardKey: string): void {
  const s = S();
  delete s.retiredCards[cardKey];
  if (!s.cards[cardKey]) {
    s.cards[cardKey] = { ease: 2.5, intervalDays: 1, repetitions: 0, lapses: 0, lastGrade: 0, dueAt: nowIso(), updatedAt: nowIso() };
  }
  done();
}

export function setDailyGoalXp(dailyGoalXp: number): void {
  const s = S();
  s.dailyGoalXp = Math.max(10, Math.min(400, Math.round(dailyGoalXp)));
  done();
  broadcast('goal-changed', { dailyGoalXp: s.dailyGoalXp });
  pushApi('/api/gamification', { dailyGoalXp: s.dailyGoalXp });
  scheduleFlush(400);
}

export function saveProjectProgress(
  slug: string,
  patch: { milestonesDone?: number; status?: 'not_started' | 'in_progress' | 'completed'; notes?: string },
): void {
  const s = S();
  const cur = s.projects[slug] ?? { status: 'not_started', milestonesDone: 0, notes: '', updatedAt: nowIso() };
  const nextStatus = patch.status ?? cur.status;
  s.projects[slug] = {
    status: nextStatus,
    milestonesDone: nextStatus === 'completed' ? 999 : (patch.milestonesDone ?? cur.milestonesDone),
    notes: patch.notes ?? cur.notes,
    updatedAt: nowIso(),
  };
  done();
  broadcast('projects-changed', { slug });
  pushApi('/api/projects/progress', { projectSlug: slug, ...patch });
  scheduleFlush(500);
}

export function saveLocalPlan(
  config: PlannerLocal['config'],
  plan: PlannerLocal['plan'],
  alreadySynced = false,
): void {
  const s = S();
  s.planner = { config, plan, updatedAt: nowIso() };
  done();
  broadcast('planner-changed');
  if (!alreadySynced) {
    pushApi('/api/planner', {
      hoursPerWeek: config.hoursPerWeek,
      daysPerWeek: config.daysPerWeek,
      track: config.track,
      mode: config.mode,
      ...(config.targetDate ? { targetDate: config.targetDate } : {}),
    });
    scheduleFlush(500);
  }
}

export function saveNote(lessonId: string, body: string): void {
  const s = S();
  if (body.trim() === '') delete s.notes[lessonId];
  else s.notes[lessonId] = body;
  done();
  pushApi('/api/notes', { type: 'note', lessonId, body });
  scheduleFlush(800);
}

export function toggleBookmark(lessonId: string): boolean {
  const s = S();
  const next = !s.bookmarks[lessonId];
  if (next) s.bookmarks[lessonId] = true;
  else delete s.bookmarks[lessonId];
  done();
  pushApi('/api/notes', { type: 'bookmark', lessonId });
  scheduleFlush(400);
  return next;
}

export function upsertApplicationLocal(app: { company: string; role: string; status: string; note?: string }): ApplicationLocal {
  const s = S();
  const item: ApplicationLocal = {
    id: `local-${eid()}`,
    company: app.company,
    role: app.role,
    status: app.status,
    note: app.note ?? '',
    updatedAt: nowIso(),
  };
  s.applications = [item, ...s.applications];
  done();
  pushApi('/api/applications', app);
  scheduleFlush(400);
  return item;
}

export function patchApplicationLocal(patch: { id: string; status?: string; note?: string; delete?: boolean }): void {
  const s = S();
  if (patch.delete) {
    s.applications = s.applications.filter((a) => a.id !== patch.id);
  } else {
    s.applications = s.applications.map((a) =>
      a.id === patch.id
        ? { ...a, status: patch.status ?? a.status, note: patch.note ?? a.note, updatedAt: nowIso() }
        : a,
    );
  }
  done();
  if (!patch.id.startsWith('local-')) {
    pushApi('/api/applications', patch);
    scheduleFlush(400);
  }
}

export function recordProblemAttempt(slug: string, status: 'passed' | 'attempted', xpAwarded = 0): void {
  const s = S();
  const prev = s.problems[slug];
  const newlyPassed = status === 'passed' && prev?.status !== 'passed';
  if (!prev || rankOf(status) > rankOf(prev.status)) s.problems[slug] = { status };
  if (newlyPassed) {
    if (xpAwarded > 0) award(xpAwarded);
    rollToday(s);
    s.today.practice += 1;
  }
  done();
}

export function recordAssessmentAttempt(assessmentId: string, answers: Record<string, unknown>): void {
  push({ id: eid(), kind: 'assessment_attempt', at: nowIso(), assessmentId, answers });
  done();
  scheduleFlush();
}

export function recordAssessmentResult(assessmentId: string, pct: number, xpAwarded = 0): number {
  const s = S();
  const prevBest = s.assessments[assessmentId]?.bestPct ?? 0;
  if (pct > prevBest) {
    s.assessments[assessmentId] = { bestPct: pct };
    if (xpAwarded > 0) award(xpAwarded);
  }
  done();
  return xpAwarded;
}

export function applyPlacementLocal(lessonIds: string[]): void {
  const s = S();
  for (const id of lessonIds) {
    const prev = s.lessons[id];
    if (!prev || !['passed', 'mastered'].includes(prev.status)) {
      s.lessons[id] = {
        kcBestPct: prev?.kcBestPct ?? 0,
        kcAttempts: prev?.kcAttempts ?? 0,
        exerciseDone: prev?.exerciseDone ?? false,
        retrievalDone: prev?.retrievalDone ?? false,
        status: 'placed_out',
        updatedAt: nowIso(),
      };
    }
  }
  done();
}
