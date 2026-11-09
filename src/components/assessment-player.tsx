'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, ListChecks, RotateCcw, Send, Target, Timer, Trophy, XCircle, Zap,
} from 'lucide-react';
import { QMath, type SafeQuestion } from '@/components/quiz';
import { Confetti } from '@/components/gamified/confetti';
import { toast } from 'sonner';

export interface PlayerAssessment {
  id: string; title: string; kind: string;
  timeLimitMinutes: number;
  description: string;
  sections: { title: string; questions: SafeQuestion[] }[];
  areaLabels?: string[];
}

interface PlayerResult {
  pct: number; correct: number; total: number;
  sectionResults: { title: string; correct: number; total: number; pct: number }[];
  perQuestion: Record<string, { correct: boolean; explanation: string }>;
  areaTotals?: Record<string, { correct: number; total: number }>;
  xpAwarded?: number;
}

const RING_RADIUS = 62;
const RING_C = 2 * Math.PI * RING_RADIUS;
const RESULT_DELAYS = ['0ms', '70ms', '140ms', '210ms'];

export function AssessmentPlayer({ assessment, compactIntro = false }: { assessment: PlayerAssessment; compactIntro?: boolean }) {
  const [started, setStarted] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string | string[]>>({});
  const [secondsLeft, setSecondsLeft] = React.useState(assessment.timeLimitMinutes * 60);
  const [result, setResult] = React.useState<PlayerResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const startedAt = React.useRef<number>(0);

  const allQuestions = React.useMemo(() => assessment.sections.flatMap(s => s.questions), [assessment.sections]);
  const total = allQuestions.length;

  React.useEffect(() => {
    if (!started || result) return;
    const t = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(t);
          toast.info('Time is up — submitting automatically.');
          setTimeout(() => submitRef.current?.(), 100);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, result]);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch('/api/assessments/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: assessment.id,
          answers,
          timeSpentS: Math.round((Date.now() - startedAt.current) / 1000),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Submission failed.'); return; }
      setResult(data as PlayerResult);
      const xp = (data as PlayerResult).xpAwarded ?? 0;
      if (xp > 0) {
        toast.success(`Assessment complete — +${xp} XP`);
        window.dispatchEvent(new CustomEvent('qf:hud-refresh'));
      }
    } catch { toast.error('Network error.'); } finally { setBusy(false); }
  }

  const submitRef = React.useRef(submit);
  React.useEffect(() => { submitRef.current = submit; });

  function retake() {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setSecondsLeft(assessment.timeLimitMinutes * 60);
    setBusy(false);
    startedAt.current = Date.now();
  }

  const kindLabel = assessment.kind === 'diagnostic'
    ? 'Diagnostic'
    : assessment.kind === 'screening'
      ? 'Screening simulation'
      : 'Subject assessment';

  if (!started) {
    if (compactIntro) {
      return (
        <div className="qf-card-flat p-5 flex flex-col sm:flex-row sm:items-center gap-4 anim-slide-up">
          <span className="icon-tile icon-tile-info h-12 w-12 shrink-0"><ListChecks className="h-6 w-6" /></span>
          <div className="flex-1 min-w-0">
            <h2 className="font-black tracking-tight">{assessment.title}</h2>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <span className="chip tnum"><ListChecks className="h-3 w-3" /> {total} questions · {assessment.sections.length} sections</span>
              <span className="chip tnum"><Clock className="h-3 w-3" /> {assessment.timeLimitMinutes > 0 ? assessment.timeLimitMinutes + ' min' : 'untimed'}</span>
              <span className="chip chip-success"><Check className="h-3 w-3" /> server-scored</span>
            </div>
          </div>
          <button
            onClick={() => { setStarted(true); startedAt.current = Date.now(); }}
            className="btn3d btn3d-lg shrink-0"
          >
            Start <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-2xl">
        <div className="qf-card relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-info-soft anim-float-slow" aria-hidden />
          <div className="absolute -left-8 -bottom-10 h-28 w-28 rounded-full bg-accent-soft anim-float" aria-hidden />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip chip-info">{kindLabel}</span>
              <span className="chip"><ListChecks className="h-3 w-3" /> {total} questions</span>
              <span className="chip"><Clock className="h-3 w-3" /> {assessment.timeLimitMinutes > 0 ? assessment.timeLimitMinutes + ' min' : 'untimed'}</span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight">{assessment.title}</h1>
            <div className="prose-qf mt-3 text-sm"><QMath text={assessment.description} /></div>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-muted">
              <li className="flex items-center gap-2.5 rounded-xl bg-surface-2/60 px-3 py-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0" /> {total} questions across {assessment.sections.length} sections</li>
              <li className="flex items-center gap-2.5 rounded-xl bg-surface-2/60 px-3 py-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0" /> Time limit: <strong>{assessment.timeLimitMinutes} minutes</strong> — a timer runs once you start</li>
              <li className="flex items-center gap-2.5 rounded-xl bg-surface-2/60 px-3 py-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0" /> Scoring happens server-side; explanations appear after submission</li>
              <li className="flex items-center gap-2.5 rounded-xl bg-surface-2/60 px-3 py-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0" /> You can move back and forth between questions before submitting</li>
            </ul>
            <button
              onClick={() => { setStarted(true); startedAt.current = Date.now(); }}
              className="btn3d btn3d-lg mt-6"
            >
              Start {assessment.kind === 'diagnostic' ? 'diagnostic' : 'assessment'} <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return <AssessmentResult assessment={assessment} result={result} onRetake={retake} timeSpentS={Math.max(0, Math.round((Date.now() - startedAt.current) / 1000))} />;
  }

  const q = allQuestions[index];
  const sectionTitle = assessment.sections.find(s => s.questions.some(x => x.id === q.id))?.title ?? assessment.sections[0]?.title ?? '';
  const answeredCount = Object.keys(answers).filter(k => {
    const v = answers[k];
    return Array.isArray(v) ? v.length > 0 : String(v ?? '').length > 0;
  }).length;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const totalTime = assessment.timeLimitMinutes * 60;
  const timeRatio = totalTime > 0 ? secondsLeft / totalTime : 1;
  const urgent = timeRatio < 0.2;
  const timerPillCls = 'hud-pill tnum shrink-0 ' + (urgent ? 'text-danger anim-pulse' : '');
  const progressPct = total > 0 ? Math.round((index / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl pb-10">
      {/* HUD: progress + question counter + timer */}
      <div className="sticky top-14 z-30 -mx-4 border-b-2 border-border bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="prog-track h-2.5 flex-1">
            <div className="prog-fill" style={{ width: progressPct + '%' }} />
          </div>
          <span className="chip tnum shrink-0">{index + 1} / {total}</span>
          <span className={timerPillCls}>
            <Clock className="h-3.5 w-3.5" /> {mm}:{ss}
          </span>
        </div>
      </div>

      {/* Question card */}
      <div key={index} className="qf-card anim-slide-up mx-auto mt-6 max-w-2xl p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip chip-info">{sectionTitle}</span>
          <span className="chip tnum">answered {answeredCount}/{total}</span>
        </div>
        <p className="prose-qf mt-3 text-base font-semibold">
          <QMath text={q.prompt} />
        </p>
        {q.code && <div className="code-block mt-3"><code>{q.code}</code></div>}
        <div className="mt-5">
          <QuestionInput
            q={q}
            value={answers[q.id]}
            onChange={v => setAnswers(m => ({ ...m, [q.id]: v }))}
          />
        </div>
      </div>

      {/* Navigation / submit */}
      <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0}
          className="btn3d btn3d-ghost"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        {index < total - 1 ? (
          <button onClick={() => setIndex(i => i + 1)} className="btn3d w-full sm:w-auto sm:min-w-48">
            Next question <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={submit} disabled={busy} className="btn3d w-full sm:w-auto sm:min-w-48">
            <Send className="h-4 w-4" /> {busy ? 'Scoring…' : 'Submit assessment'}
          </button>
        )}
      </div>
      <p className="mx-auto mt-3 max-w-2xl text-center text-xs font-semibold text-faint">
        Scoring happens server-side — correct answers never reach the browser before submission.
      </p>
    </div>
  );
}

function QuestionInput({ q, value, onChange }: { q: SafeQuestion; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  if (q.type === 'mcq') {
    return (
      <div className="space-y-2.5">
        {(q.options ?? []).map((opt, i) => {
          const selected = value === String(i);
          const btnCls = 'w-full text-left rounded-2xl border-2 p-4 font-bold transition-all flex items-center gap-3 '
            + (selected ? 'border-accent bg-accent-soft' : 'border-border hover:border-accent');
          const badgeCls = 'grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-xs font-black tnum '
            + (selected ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-faint');
          return (
            <button key={i} type="button" onClick={() => onChange(String(i))} className={btnCls} aria-pressed={selected}>
              <span className={badgeCls}>{String.fromCharCode(65 + i)}</span>
              <span className="min-w-0 flex-1 text-[15px]"><QMath text={opt} /></span>
              {selected && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-accent" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === 'ms') {
    const sel = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2.5">
        {(q.options ?? []).map((opt, i) => {
          const selected = sel.includes(String(i));
          const btnCls = 'w-full text-left rounded-2xl border-2 p-4 font-bold transition-all flex items-center gap-3 '
            + (selected ? 'border-accent bg-accent-soft' : 'border-border hover:border-accent');
          const badgeCls = 'grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 '
            + (selected ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-faint');
          return (
            <button
              key={i} type="button" aria-pressed={selected}
              onClick={() => onChange(selected ? sel.filter(x => x !== String(i)) : [...sel, String(i)])}
              className={btnCls}
            >
              <span className={badgeCls}>{selected ? <Check className="h-4 w-4" strokeWidth={3} /> : String.fromCharCode(65 + i)}</span>
              <span className="min-w-0 flex-1 text-[15px]"><QMath text={opt} /></span>
              {selected && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-accent" strokeWidth={2.5} />}
            </button>
          );
        })}
        <p className="text-xs font-semibold text-faint">Select all that apply.</p>
      </div>
    );
  }

  const val = typeof value === 'string' ? value : '';
  if (q.type === 'code-output') {
    return (
      <textarea
        rows={3} value={val} onChange={e => onChange(e.target.value)}
        className="qf-textarea font-mono text-sm"
        placeholder="Exact output (one line per output line)"
        aria-label="Answer"
      />
    );
  }
  if (q.type === 'short') {
    return (
      <textarea
        rows={3} value={val} onChange={e => onChange(e.target.value)}
        className="qf-textarea"
        placeholder="Answer in your own words…"
        aria-label="Answer"
      />
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input
        type="text" inputMode="decimal" value={val}
        onChange={e => onChange(e.target.value)}
        className="qf-input tnum max-w-56"
        placeholder="Numeric answer"
        aria-label="Answer"
      />
      {q.unit && <span className="chip">{q.unit}</span>}
    </div>
  );
}

function AssessmentResult({ assessment, result, onRetake, timeSpentS }: {
  assessment: PlayerAssessment;
  result: PlayerResult;
  onRetake: () => void;
  timeSpentS: number;
}) {
  const isDiagnostic = assessment.id.startsWith('diag-');
  const passed = result.pct >= 70;
  const ringColor = passed ? 'var(--accent)' : 'var(--warning)';
  const wrong = Math.max(result.total - result.correct, 0);
  const timeLabel = String(Math.floor(timeSpentS / 60)).padStart(2, '0') + ':' + String(timeSpentS % 60).padStart(2, '0');
  const xp = result.xpAwarded ?? 0;

  const bannerTitle = isDiagnostic
    ? 'Baseline complete'
    : passed
      ? 'Passed — nicely done!'
      : 'Below the 70% pass mark';
  const bannerSub = isDiagnostic
    ? 'Advisory only — it maps your gaps, it does not gate anything.'
    : passed
      ? 'This result marks your passed lessons as retrieval-verified for mastery.'
      : 'Review the explanations below and retake in a few days.';

  const bannerCls = 'mt-6 mx-auto flex max-w-md items-start gap-3 rounded-2xl border-2 p-4 text-left '
    + (passed ? 'border-accent bg-accent-soft' : 'border-warning bg-warning-soft');
  const bannerTitleCls = passed ? 'font-black text-accent-deep dark:text-accent' : 'font-black text-warning-strong';

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      {passed && <Confetti />}

      {/* Score */}
      <div className="qf-card relative overflow-hidden p-6 text-center sm:p-8">
        <div className="absolute -left-10 -bottom-12 h-40 w-40 rounded-full bg-accent-soft anim-float-slow" aria-hidden />
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-info-soft anim-float" aria-hidden />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-faint">{assessment.title} — result</p>

          <div className="anim-pop-in relative mx-auto mt-5 h-44 w-44">
            <svg viewBox="0 0 160 160" className="h-44 w-44 -rotate-90">
              <circle cx="80" cy="80" r={RING_RADIUS} fill="none" stroke="var(--surface-3)" strokeWidth="14" />
              <motion.circle
                cx="80" cy="80" r={RING_RADIUS} fill="none" stroke={ringColor} strokeWidth="14" strokeLinecap="round"
                strokeDasharray={RING_C}
                initial={{ strokeDashoffset: RING_C }}
                animate={{ strokeDashoffset: RING_C * (1 - result.pct / 100) }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.35 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black tnum">{result.pct}%</span>
              <span className="mt-1 text-xs font-bold text-muted tnum">{result.correct}/{result.total} correct</span>
            </div>
          </div>

          <div className={bannerCls}>
            {passed
              ? <Trophy className="h-6 w-6 shrink-0 text-warning anim-bob" strokeWidth={2.5} />
              : <AlertTriangle className="h-6 w-6 shrink-0 text-warning-strong" strokeWidth={2.5} />}
            <div>
              <p className={bannerTitleCls}>{bannerTitle}</p>
              <p className="mt-0.5 text-xs font-semibold text-muted">{bannerSub}</p>
            </div>
          </div>

          {isDiagnostic && (
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
              Use this baseline to pick where to start on the{' '}
              <Link href="/curriculum" className="font-bold text-accent hover:underline">curriculum</Link>{' '}
              (weak areas first), and retake it later to measure movement.
            </p>
          )}
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="stat-tile anim-pop-in" style={{ animationDelay: RESULT_DELAYS[0] }}>
          <div className="flex items-center gap-2">
            <span className="icon-tile-sm icon-tile-accent"><CheckCircle2 strokeWidth={2.5} /></span>
            <span className="stat-label">Correct</span>
          </div>
          <p className="mt-2 stat-value font-black tnum">{result.correct}</p>
        </div>
        <div className="stat-tile anim-pop-in" style={{ animationDelay: RESULT_DELAYS[1] }}>
          <div className="flex items-center gap-2">
            <span className="icon-tile-sm icon-tile-danger"><XCircle strokeWidth={2.5} /></span>
            <span className="stat-label">Wrong</span>
          </div>
          <p className="mt-2 stat-value font-black tnum">{wrong}</p>
        </div>
        <div className="stat-tile anim-pop-in" style={{ animationDelay: RESULT_DELAYS[2] }}>
          <div className="flex items-center gap-2">
            <span className="icon-tile-sm icon-tile-info"><Timer strokeWidth={2.5} /></span>
            <span className="stat-label">Time</span>
          </div>
          <p className="mt-2 stat-value font-black tnum">{timeLabel}</p>
        </div>
        <div className="stat-tile anim-pop-in" style={{ animationDelay: RESULT_DELAYS[3] }}>
          <div className="flex items-center gap-2">
            <span className="icon-tile-sm icon-tile-gold"><Zap strokeWidth={2.5} /></span>
            <span className="stat-label">XP</span>
          </div>
          <p className="mt-2 stat-value font-black tnum">+{xp}</p>
        </div>
      </div>

      {/* Competency map */}
      {result.areaTotals && (
        <div className="qf-card p-5">
          <div className="section-head">
            <span className="icon-tile-sm icon-tile-violet"><Target strokeWidth={2.5} /></span>
            <h2>Competency map</h2>
            <span className="chip chip-info ml-auto">baseline by area</span>
          </div>
          <div className="space-y-3">
            {Object.entries(result.areaTotals).map(([area, t]) => {
              const pct = Math.round((t.correct / t.total) * 100);
              const barCls = 'prog-fill h-full ' + (pct >= 75 ? '' : pct >= 40 ? 'prog-fill-gold' : 'prog-fill-danger');
              return (
                <div key={area}>
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span className="capitalize">{area.replace(/-/g, ' ')}</span>
                    <span className="tnum text-faint">{t.correct}/{t.total} · {pct}%</span>
                  </div>
                  <div className="prog-track h-2.5">
                    <div className={barCls} style={{ width: Math.max(pct, 2) + '%' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs font-semibold text-faint">
            Recommended: start with your two weakest areas. The curriculum sequencer already orders prerequisites for you.
          </p>
        </div>
      )}

      {/* Section breakdown */}
      <div className="qf-card p-5">
        <div className="section-head">
          <span className="icon-tile-sm icon-tile-info"><ListChecks strokeWidth={2.5} /></span>
          <h2>Section breakdown</h2>
        </div>
        <ul className="space-y-2 text-sm font-semibold">
          {result.sectionResults.map(s => (
            <li key={s.title} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
              <span>{s.title}</span>
              <span className={'chip tnum ' + (s.pct >= 70 ? 'chip-success' : 'chip-warning')}>{s.correct}/{s.total} · {s.pct}%</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Explanations */}
      <div className="space-y-3">
        <div className="section-head">
          <span className="icon-tile-sm icon-tile-gold"><Zap strokeWidth={2.5} /></span>
          <h2>Explanations</h2>
        </div>
        {assessment.sections.flatMap(sec => sec.questions).map(q => {
          const r = result.perQuestion[q.id];
          const cardCls = 'qf-card-flat anim-slide-up p-4 text-sm ' + (r?.correct ? 'border-accent' : '');
          return (
            <div key={q.id} className={cardCls}>
              <div className="flex items-start gap-2.5">
                {r?.correct
                  ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={2.5} />
                  : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" strokeWidth={2.5} />}
                <div className="min-w-0 flex-1">
                  <p className="font-bold"><QMath text={q.prompt} /></p>
                  {q.code && <div className="code-block mt-2"><code>{q.code}</code></div>}
                  <p className="mt-1.5 leading-relaxed text-muted"><QMath text={r?.explanation ?? ''} /></p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onRetake} className="btn3d btn3d-ghost">
          <RotateCcw className="h-4 w-4" /> Retake
        </button>
        <Link href="/assessments" className="btn3d">
          Back to centre <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/curriculum" className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-accent hover:underline">
          Review curriculum <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
