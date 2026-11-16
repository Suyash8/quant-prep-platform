// Mastery engine (server-authoritative scoring):
//   passed         = knowledge check >= PASS_THRESHOLD (80%)
//   placed_out     = diagnostic placement or module test-out (satisfies prereqs, 0 XP)
//   mastered       = passed AND spaced retrieval earned (>=2 reviews >=3d apart OR covering assessment)
//   needs_revision = two or more failed knowledge-check attempts below threshold

export const PASS_THRESHOLD = 80;
export const GUESS_GUARD_MIN_QUESTIONS = 3;

export type Status =
  | 'not_started'
  | 'in_progress'
  | 'attempted'
  | 'passed'
  | 'mastered'
  | 'needs_revision'
  | 'placed_out';

export function scoreQuiz(
  questions: { id: string; type: string }[],
  answers: Record<string, unknown>,
  grade: (q: { id: string; type: string }, a: unknown) => boolean,
): { correct: number; total: number; pct: number } {
  const total = questions.length;
  let correct = 0;
  for (const q of questions) {
    if (grade(q, answers[q.id])) correct++;
  }
  return { correct, total, pct: total ? Math.round((correct / total) * 100) : 0 };
}

export function hasEarnedSpacedMastery(
  cards: { repetitions: number; intervalDays: number }[],
): boolean {
  return cards.some((c) => c.repetitions >= 2 && c.intervalDays >= 3);
}

export function computeStatus(
  prev: { kcBestPct: number; kcAttempts: number; exerciseDone: boolean; retrievalDone: boolean; status: string },
  next: { pct: number; exerciseDone?: boolean },
): { status: Status; kcBestPct: number; kcAttempts: number } {
  const kcBestPct = Math.max(prev.kcBestPct, next.pct);
  const kcAttempts = prev.kcAttempts + 1;
  // A5: quiz passing threshold determines lesson pass; exercise remains an ungraded study checklist
  const passed = kcBestPct >= PASS_THRESHOLD;
  let status: Status;
  if (prev.status === 'mastered' || (passed && prev.retrievalDone)) {
    status = 'mastered';
  } else if (passed) {
    status = 'passed';
  } else if (kcAttempts >= 2 && kcBestPct < PASS_THRESHOLD) {
    status = 'needs_revision';
  } else if (kcAttempts >= 1) {
    status = 'attempted';
  } else {
    status = 'in_progress';
  }
  return { status, kcBestPct, kcAttempts };
}

// ---------- SM-2 spaced repetition ----------

export interface Sm2State {
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
}

export function sm2(state: Sm2State, grade: number): Sm2State & { dueAt: Date } {
  let { ease, intervalDays, repetitions, lapses } = state;
  if (grade < 3) {
    repetitions = 0;
    intervalDays = grade === 0 ? 0 : 0.5;
    lapses += 1;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    ease = Math.max(1.3, ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease * 100) / 100;
    if (intervalDays > 365) intervalDays = 365;
  }
  const dueAt = new Date(Date.now() + Math.max(intervalDays, 0) * 86400_000);
  return { ease, intervalDays, repetitions, lapses, dueAt };
}
