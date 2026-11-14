/** Pure, versioned spaced-repetition scheduler (SM-2 style). No I/O. Times are epoch ms. */
export const SCHEDULER_VERSION = 1;
export type Outcome = 'again' | 'hard' | 'good' | 'easy';
export type SchedCard = { interval: number; ease: number; lapses: number; due: number; schedulerVersion: number };
const DAY = 86_400_000;
export const newCard = (now: number): SchedCard => ({ interval: 0, ease: 2.5, lapses: 0, due: now, schedulerVersion: SCHEDULER_VERSION });
/** interval in days. Same inputs always give the same card. */
export function schedule(c: SchedCard, outcome: Outcome, now: number): SchedCard {
  let { interval, ease, lapses } = c;
  if (outcome === 'again') { lapses += 1; ease = Math.max(1.3, ease - 0.2); interval = 0; return { interval, ease, lapses, due: now + 10 * 60_000, schedulerVersion: SCHEDULER_VERSION }; }
  if (outcome === 'hard') { ease = Math.max(1.3, ease - 0.15); interval = Math.max(1, Math.round(interval * 1.2)); }
  else if (outcome === 'good') { interval = interval === 0 ? 1 : interval === 1 ? 3 : Math.round(interval * ease); }
  else { ease = ease + 0.15; interval = interval === 0 ? 3 : Math.round(interval * ease * 1.3); }
  interval = Math.min(interval, 365);
  return { interval, ease, lapses, due: now + interval * DAY, schedulerVersion: SCHEDULER_VERSION };
}
/** Only graded outcomes schedule. needs-review, not-assessed, invalid, pending, runtime-unavailable never do. */
export const outcomeFromVerdict = (v: string): Outcome | null => (v === 'correct' ? 'good' : v === 'incorrect' ? 'again' : null);
