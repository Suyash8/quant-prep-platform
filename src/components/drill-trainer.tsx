'use client';

import * as React from 'react';
import { Flame, Play, Square, Timer, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { recordDrillSession } from '@/lib/client/local-state';

type Mode = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'percentages' | 'fractions' | 'squares' | 'mixed';
interface Q { text: string; answer: number; acceptPct?: boolean }

const MODES: { id: Mode; label: string }[] = [
  { id: 'addition', label: 'Addition' },
  { id: 'subtraction', label: 'Subtraction' },
  { id: 'multiplication', label: 'Multiplication' },
  { id: 'division', label: 'Division' },
  { id: 'percentages', label: 'Percentages' },
  { id: 'fractions', label: 'Fraction ⇄ decimal' },
  { id: 'squares', label: 'Squares & roots' },
  { id: 'mixed', label: 'Mixed exam' },
];

const DURATIONS = [60, 120, 300];

function ri(rand: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rand() * (hi - lo + 1));
}

/** Deterministic-ish generator per mode and level 1-10 */
function generate(mode: Mode, level: number, rand: () => number): Q {
  const L = Math.min(level, 10);
  switch (mode) {
    case 'addition': {
      const [lo, hi] = L < 3 ? [2, 12] : L < 6 ? [10, 99] : L < 9 ? [100, 999] : [1000, 9999];
      const n = L < 4 ? 2 : 3;
      let text = '', sum = 0;
      for (let i = 0; i < n; i++) {
        const v = ri(rand, lo, hi) * (L >= 7 && rand() < 0.3 ? -1 : 1);
        text += (i === 0 ? '' : ' + ') + v;
        sum += v;
      }
      return { text, answer: sum };
    }
    case 'subtraction': {
      const [lo, hi] = L < 3 ? [5, 20] : L < 6 ? [20, 99] : [100, 999];
      const a = ri(rand, lo, hi), b = ri(rand, lo, hi);
      return { text: `${Math.max(a, b)} − ${Math.min(a, b)}`, answer: Math.abs(a - b) };
    }
    case 'multiplication': {
      const ranges: [number, number][][] = [
        [[2, 9], [2, 9]], [[2, 12], [2, 12]], [[3, 15], [3, 15]],
        [[11, 19], [11, 19]], [[2, 9], [11, 99]], [[12, 25], [12, 25]],
        [[2, 9], [100, 999]], [[11, 25], [11, 99]], [[13, 39], [13, 39]], [[11, 99], [11, 99]],
      ];
      const [[a1, a2], [b1, b2]] = ranges[L - 1];
      const a = ri(rand, a1, a2), b = ri(rand, b1, b2);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    case 'division': {
      const [lo, hi] = L < 4 ? [2, 9] : L < 7 ? [3, 12] : [7, 25];
      const b = ri(rand, lo, hi);
      const q = ri(rand, 2, L < 5 ? 12 : 40);
      return { text: `${b * q} ÷ ${b}`, answer: q };
    }
    case 'percentages': {
      const pcts = L < 3 ? [10, 50] : L < 6 ? [5, 10, 20, 25, 50, 75] : [3, 4, 6, 7, 8, 12, 15, 30, 40, 60, 80];
      const p = pcts[ri(rand, 0, pcts.length - 1)];
      const base = (L < 4 ? 10 : L < 7 ? 4 : 2) * ri(rand, 1, 50);
      return { text: `${p}% of ${base}`, answer: (p / 100) * base, acceptPct: false };
    }
    case 'fractions': {
      const table = [
        [1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [1, 10], [3, 10], [1, 8], [1, 3], [2, 3], [1, 20], [3, 5],
      ];
      const [n, d] = table[ri(rand, 0, Math.min(table.length - 1, 2 + L))];
      const toDec = rand() < 0.5;
      return toDec
        ? { text: `${n}/${d} as decimal`, answer: n / d }
        : { text: `${n / d} as fraction n/d (answer as decimal of n/d)`, answer: n / d };
    }
    case 'squares': {
      if (rand() < 0.5) {
        const a = ri(rand, 2, 4 + L * 3);
        return { text: `${a}²`, answer: a * a };
      }
      const s = ri(rand, 2, 4 + L * 3);
      return { text: `√${s * s}`, answer: s };
    }
    case 'mixed': {
      const r = rand();
      if (r < 0.3) return generate('addition', L, rand);
      if (r < 0.5) return generate('multiplication', L, rand);
      if (r < 0.7) return generate('percentages', L, rand);
      if (r < 0.85) return generate('division', L, rand);
      return generate('squares', L, rand);
    }
  }
}

export function DrillTrainer({ history }: { history: { mode: string; level: number; correct: number; total: number; avgMs: number; createdAt: string }[] }) {
  const [mode, setMode] = React.useState<Mode>('addition');
  const [level, setLevel] = React.useState(2);
  const [duration, setDuration] = React.useState(120);
  const [running, setRunning] = React.useState(false);
  const [q, setQ] = React.useState<Q | null>(null);
  const [input, setInput] = React.useState('');
  const [correct, setCorrect] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [times, setTimes] = React.useState<number[]>([]);
  const [streak, setStreak] = React.useState(0);
  const [bestStreak, setBestStreak] = React.useState(0);
  const [left, setLeft] = React.useState(0);
  const [feedback, setFeedback] = React.useState<{ ok: boolean; correctAnswer: number } | null>(null);
  const startedAt = React.useRef(0);
  const questionAt = React.useRef(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const randRef = React.useRef<() => number>(() => Math.random());

  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft(s => {
        if (s <= 1) { finish(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, total, correct, times]);

  function nextQ() {
    setQ(generate(mode, level, randRef.current));
    questionAt.current = Date.now();
    setInput('');
    setFeedback(null);
    setTimeout(() => inputRef.current?.focus(), 10);
  }

  function start() {
    randRef.current = mulberry32(Date.now() % 100000);
    setRunning(true);
    setCorrect(0); setTotal(0); setTimes([]); setStreak(0); setBestStreak(0);
    setLeft(duration);
    startedAt.current = Date.now();
    nextQ();
  }

  function finish() {
    setRunning(false);
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    if (total > 0) {
      // v3: recorded locally, instantly, offline-capable. Syncs in the background.
      const elapsed = startedAt.current ? Date.now() - startedAt.current : times.reduce((a, b) => a + b, 0);
      const xp = recordDrillSession(correct, total, elapsed);
      toast.success(`Session saved: ${correct}/${total} (${total ? Math.round((correct / total) * 100) : 0}%), ${Math.round(avg)}ms average.`);
      if (xp > 0) toast.success(`+${xp} XP`);
    }
  }

  function submitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!q || !running) return;
    const v = parseFloat(input.replace(',', '.'));
    const ok = !Number.isNaN(v) && Math.abs(v - q.answer) < Math.max(0.001, Math.abs(q.answer) * 0.005);
    setTotal(t => t + 1);
    setTimes(ts => [...ts, Date.now() - questionAt.current]);
    setFeedback({ ok, correctAnswer: q.answer });
    if (ok) {
      setCorrect(c => c + 1);
      setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n; });
      setTimeout(nextQ, 350);
    } else {
      setStreak(0);
      setTimeout(nextQ, 900);
    }
  }

  const accuracy = total ? Math.round((correct / total) * 100) : null;
  const avgMs = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  const feedbackCls = feedback?.ok
    ? 'anim-pop-in mt-4 px-4 py-2 rounded-2xl text-sm font-extrabold bg-accent-soft text-accent-deep dark:text-accent'
    : 'anim-shake mt-4 px-4 py-2 rounded-2xl text-sm font-extrabold bg-danger-soft text-danger';

  return (
    <div className="qf-card overflow-hidden">
      {/* config / HUD */}
        <div className="px-5 py-4 border-b bg-surface-2/40 flex flex-wrap items-center gap-3">
          {running ? (
            <>
              <span className="tnum text-2xl font-black">{String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}</span>
              <span className="text-sm text-muted tnum font-bold">{correct}/{total} answered</span>
              {accuracy !== null && (
                <span className={accuracy >= 80 ? 'chip chip-success tnum' : 'chip chip-warning tnum'}>{accuracy}% accuracy</span>
              )}
              {avgMs !== null && <span className="hud-pill tnum"><Timer className="h-3.5 w-3.5 text-info" />{avgMs}ms avg</span>}
              {streak >= 3 && <span className="hud-pill tnum"><Flame className="h-3.5 w-3.5 text-flame" />streak ×{streak}</span>}
              <button onClick={finish} className="btn3d btn3d-ghost btn3d-sm ml-auto">
                <Square className="h-4 w-4" /> End session
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-faint">Mode</span>
                  <select value={mode} onChange={e => setMode(e.target.value as Mode)} className="qf-select-sm h-9" aria-label="Drill mode">
                    {MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-faint">Level · <span className="text-accent-deep dark:text-accent">{level}</span></span>
                  <span className="flex items-center gap-2.5 h-9">
                    <input type="range" min={1} max={10} value={level} onChange={e => setLevel(parseInt(e.target.value))} className="qf-range w-32" aria-label="Difficulty level" style={{ '--fill': `${((level - 1) / 9) * 100}%` } as React.CSSProperties} />
                    <span className="text-[10px] font-bold text-faint tnum">1-10</span>
                  </span>
                </label>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-faint">Duration</span>
                  <div className="flex gap-1.5 h-9 items-center">
                    {DURATIONS.map(d => (
                      <button key={d} onClick={() => setDuration(d)}
                        className={duration === d ? 'text-xs px-3 h-full rounded-xl bg-accent text-accent-foreground font-black press' : 'text-xs px-3 h-full rounded-xl border-2 border-border bg-surface text-muted font-bold hover:bg-surface-2 press'}>
                        {d < 60 ? `${d}s` : `${d / 60}m`}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={start} className="btn3d btn3d-sm h-9 ml-auto">
                  <Play className="h-4 w-4" strokeWidth={2.5} /> Start drill
                </button>
              </div>
            </>
          )}
        </div>

        {/* question area */}
        <div className="p-8 min-h-[260px] flex flex-col items-center justify-center">
          {running && q ? (
            <>
              <p className="text-4xl font-black tnum tracking-tight" aria-live="polite">{q.text}</p>
              <form onSubmit={submitAnswer} className="mt-6 flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  className="qf-input !h-12 w-44 !rounded-2xl text-lg tnum text-center font-semibold"
                  placeholder="answer"
                  aria-label="Your answer"
                  autoComplete="off"
                />
                <button type="submit" className="btn3d !px-5">↵</button>
              </form>
              {feedback && (
                <p className={feedbackCls}>
                  {feedback.ok ? '✓ correct' : `✗, answer: ${Number(feedback.correctAnswer.toFixed(4))}`}
                </p>
              )}
            </>
          ) : (
            <div className="w-full max-w-md">
              <div className="flex items-center justify-center gap-3">
                <span className="h-14 w-14 rounded-3xl bg-accent text-white flex items-center justify-center shadow-[0_5px_0_0_var(--accent-deep)]">
                  <Zap className="h-7 w-7" strokeWidth={2.5} />
                </span>
                <div className="text-left">
                  <p className="text-lg font-black tracking-tight">{MODES.find(m => m.id === mode)?.label} · level {level}</p>
                  <p className="text-xs font-bold text-muted tnum">{duration < 60 ? `${duration} seconds` : `${duration / 60} minute`} · answers typed, ↵ submits</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2.5 text-center">
                {[
                  { sample: generate(mode, Math.max(1, level - 1), () => 0.42), tag: 'easier', tagCls: 'chip-success' },
                  { sample: generate(mode, level, () => 0.17), tag: 'at your level', tagCls: 'chip-info' },
                  { sample: generate(mode, Math.min(10, level + 1), () => 0.83), tag: 'harder', tagCls: 'chip-warning' },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl border-2 border-border bg-surface-2/50 px-3 py-3 flex flex-col items-center gap-2">
                    <p className="text-base font-black tnum leading-tight">{s.sample.text}</p>
                    <span className={'chip !text-[10px] !px-2 !py-0.5 ' + s.tagCls}>{s.tag}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm font-semibold text-muted leading-relaxed text-center">
                Accuracy and speed both count, the goal is genuine numerical fluency, the kind trading-firm screens
                and production debugging both demand. Sessions are saved to your analytics.
              </p>
            </div>
          )}
        </div>
    </div>
  );
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
