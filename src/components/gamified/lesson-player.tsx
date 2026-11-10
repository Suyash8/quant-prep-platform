'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Check, ChevronRight, Flame, Zap, Star, Clock, Target, Lightbulb,
  AlertTriangle, Building2, TrendingUp, GraduationCap, BookOpen, RotateCcw,
  Home, Map as MapIcon, Lock, Sparkles, Trophy,
} from 'lucide-react';
import type { PlayerCard } from '@/lib/lesson-cards';
import { cardLabel } from '@/lib/lesson-cards';
import type { QuizQuestion } from '@/lib/content';
import { gradeAnswer } from '@/lib/grading';
import { scoreQuiz } from '@/lib/mastery';
import { recordLessonResult, recordExerciseDone, lessonProgressOf, xpSummary, subscribe, ensureLocalCards } from '@/lib/client/local-state';
import { ClientMd, ClientMathFigure } from '@/components/gamified/client-md';
import { ClientBlock } from '@/components/gamified/player-blocks';
import { Confetti } from '@/components/gamified/confetti';
import { InteractiveBlock } from '@/components/interactive/registry';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FinishResult {
  pct: number;
  correct?: number;
  total: number;
  status: string;
  xpAwarded: number;
  streakCount?: number | null;
  perQuestion?: Record<string, { correct: boolean; explanation: string }>;
}

interface PlayerState {
  idx: number;
  answers: Record<string, string | string[]>;
  feedback: Record<string, { correct: boolean; explanation: string } | undefined>;
  exercises: { guided: boolean; independent: boolean };
}

interface MiniHud { streakCount: number; xp: number }

export function LessonPlayer({
  lessonId, title, moduleTitle, cards, fullQuiz, flashcards, nextHref, nextTitle,
}: {
  lessonId: string;
  title: string;
  moduleTitle: string;
  cards: PlayerCard[];
  fullQuiz: QuizQuestion[];
  flashcards: { type: string; front: string; back: string }[];
  nextHref?: string;
  nextTitle?: string;
}) {
  const router = useRouter();
  const storageKey = `qf-player-${lessonId}`;

  const [state, setState] = React.useState<PlayerState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const saved = JSON.parse(raw) as PlayerState;
          if (Number.isInteger(saved.idx) && saved.idx >= 0 && saved.idx < cards.length) {
            return saved;
          }
        }
      } catch { /* fresh start */ }
    }
    return { idx: 0, answers: {}, feedback: {}, exercises: { guided: false, independent: false } };
  });
  const [result, setResult] = React.useState<FinishResult | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [exitAsk, setExitAsk] = React.useState(false);
  const [shakeKey, setShakeKey] = React.useState(0);
  const [hud, setHud] = React.useState<MiniHud | null>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // v3: HUD mirrors the local XP store, instant and offline-capable
    const pull = () => { const s = xpSummary(); setHud({ streakCount: s.streakCount, xp: s.xp }); };
    pull();
    const unsub = subscribe(pull);
    return () => unsub();
  }, []);

  const finished = result !== null;
  const card = cards[state.idx];
  const total = cards.length;
  const progressPct = finished ? 100 : Math.round(((state.idx + 1) / total) * 100);

  // persist position for resume


  React.useEffect(() => {
    if (!finished) {
      try { window.localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* ignore */ }
    }
  }, [state, storageKey, finished]);

  React.useEffect(() => {
    cardRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [state.idx]);

  function patch(next: Partial<PlayerState>) {
    setState(s => ({ ...s, ...next }));
  }

  function goNext() {
    if (state.idx >= total - 1) return;
    patch({ idx: state.idx + 1 });
  }

  const quizCards = cards.filter(c => c.kind === 'quiz').length;

  function checkAnswer(qid: string, answer: string | string[]): { correct: boolean; explanation: string } {
    // v3: graded locally from the content pack. Instant, works offline,
    // same grader the server uses (gradeAnswer), so results match.
    const full = fullQuiz.find(q => q.id === qid);
    const correct = full ? gradeAnswer(full, answer) : false;
    const explanation = full?.explanation ?? '';
    setState(s => ({ ...s, feedback: { ...s.feedback, [qid]: { correct, explanation } } }));
    if (!correct) setShakeKey(k => k + 1);
    return { correct, explanation };
  }

  function submitQuiz() {
    // v3: scored locally, recorded locally, synced in the background.
    setSubmitting(true);
    try {
      const r = scoreQuiz(fullQuiz, state.answers, (q, a) => {
        const full = fullQuiz.find(x => x.id === q.id)!;
        return gradeAnswer(full, a);
      });
      const perQuestion: Record<string, { correct: boolean; explanation: string }> = {};
      for (const q of fullQuiz) {
        const a = state.answers[q.id];
        perQuestion[q.id] = { correct: a !== undefined ? gradeAnswer(q, a) : false, explanation: q.explanation };
      }
      const rec = recordLessonResult(lessonId, r.pct, lessonProgressOf(lessonId));
      ensureLocalCards(lessonId, flashcards);
      const data: FinishResult = {
        pct: r.pct, correct: r.correct, total: r.total,
        status: rec.status, xpAwarded: rec.xp, perQuestion,
      };
      setResult(data);
      try { window.localStorage.removeItem(storageKey); } catch { /* ignore */ }
    } finally {
      setSubmitting(false);
    }
  }

  function markExercise(exKind: 'guided' | 'independent', done: boolean) {
    setState(s => ({ ...s, exercises: { ...s.exercises, [exKind]: done } }));
    if (done) {
      const alreadyDone = !!lessonProgressOf(lessonId)?.exerciseDone;
      const xp = recordExerciseDone(lessonId, alreadyDone);
      if (xp > 0) toast.success(`Exercise logged, +${xp} XP`);
    }
  }

  // keyboard: Enter continues


  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' || finished || exitAsk) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) return;
      const btn = document.getElementById('player-primary') as HTMLButtonElement | null;
      if (btn && !btn.disabled) btn.click();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finished, exitAsk]);

  if (finished && result) {
    return (
      <FinishScreen
        result={result}
        quizCards={quizCards}
        nextHref={nextHref}
        nextTitle={nextTitle}
        referenceHref={`/learn/${lessonId}?mode=reference`}
        title={title}
      />
    );
  }

  const isQuiz = card.kind === 'quiz';
  const hasFeedback = isQuiz && !!state.feedback[card.question.id];
  const answered = isQuiz ? isAnswered(card.question, state.answers[card.question.id]) : false;

  const primaryAction = (() => {
    if (isQuiz) {
      if (!hasFeedback) return { label: 'CHECK', disabled: !answered, onClick: () => checkAnswer(card.question.id, state.answers[card.question.id]!) };
      return { label: 'CONTINUE', disabled: false, onClick: goNext };
    }
    if (card.kind === 'summary') {
      return { label: quizCards > 0 ? 'FINISH LESSON' : 'COMPLETE', disabled: submitting, onClick: submitQuiz };
    }
    return { label: state.idx === 0 ? "LET'S GO" : 'CONTINUE', disabled: false, onClick: goNext };
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-label={`Lesson player: ${title}`}>
      {/* progress header */}
      <header className="border-b-2 border-border bg-surface">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setExitAsk(true)}
            className="press h-10 w-10 shrink-0 rounded-xl border-2 border-border flex items-center justify-center text-muted hover:bg-surface-2"
            aria-label="Exit lesson"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex-1 h-5 gauge-track" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="gauge-fill bg-accent xp-stripes !rounded-full" style={{ width: `${progressPct}%`, minWidth: progressPct > 0 ? '18px' : undefined }} />
          </div>
          {hud && (
            <span className="hidden sm:inline-flex hud-pill !py-1 shrink-0" title="Day streak">
              <Flame className="h-4 w-4 text-flame anim-flame" />
              <span className="tnum">{hud.streakCount}</span>
            </span>
          )}
          {hud && (
            <span className="hidden sm:inline-flex hud-pill !py-1 shrink-0" title="Total XP">
              <Zap className="h-4 w-4 text-warning" />
              <span className="tnum">{hud.xp.toLocaleString()}</span>
            </span>
          )}
          <span className="text-xs font-extrabold text-muted tnum shrink-0">{state.idx + 1}/{total}</span>
        </div>
      </header>

      {/* card stage */}
      <div ref={cardRef} className="flex-1 overflow-y-auto thin-scroll">
        <div className="max-w-3xl mx-auto px-4 py-6 pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.idx}
              initial={{ opacity: 0, x: 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -48 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-accent-deep dark:text-accent mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> {cardLabel(card)}
                {card.kind === 'quiz' && <span className="text-faint">· {card.index + 1} of {card.total}</span>}
              </p>
              <div key={`c${shakeKey}`} className={cn(shakeKey > 0 && hasFeedback && !state.feedback[isQuiz ? card.question.id : '']?.correct && 'anim-shake')}>
                <CardBody
                  card={card}
                  state={state}
                  onAnswer={(qid, v) => setState(s => ({ ...s, answers: { ...s.answers, [qid]: v } }))}
                  onExercise={markExercise}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* feedback banner + action bar */}
      <div className="border-t bg-surface">
        {isQuiz && hasFeedback && (
          <AnimatePresence>
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={cn(
                'max-w-3xl mx-auto px-4 pt-4',
              )}
            >
              <div className={cn(
                'rounded-2xl border-2 p-4 flex gap-3 items-start',
                state.feedback[card.question.id]?.correct
                  ? 'border-transparent bg-accent-soft'
                  : 'border-transparent bg-danger-soft',
              )}>
                <span className={cn(
                  'h-9 w-9 shrink-0 rounded-full flex items-center justify-center anim-bounce-in',
                  state.feedback[card.question.id]?.correct ? 'bg-accent text-white' : 'bg-danger text-white',
                )}>
                  {state.feedback[card.question.id]?.correct ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </span>
                <div className="text-sm">
                  <p className={cn('font-extrabold', state.feedback[card.question.id]?.correct ? 'text-accent-deep dark:text-accent' : 'text-danger-strong dark:text-danger')}>
                    {state.feedback[card.question.id]?.correct ? 'Correct!' : 'Not quite'}
                  </p>
                  <p className="mt-0.5 leading-relaxed text-muted"><ClientMd text={state.feedback[card.question.id]?.explanation ?? ''} /></p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          {state.idx > 0 && !hasFeedback && (
            <button
              onClick={() => patch({ idx: state.idx - 1 })}
              className="btn3d btn3d-ghost btn3d-sm hidden sm:inline-flex"
            >
              Back
            </button>
          )}
          <button
            id="player-primary"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled || submitting}
            className={cn('btn3d btn3d-player flex-1', !hasFeedback && isQuiz ? 'btn3d-blue' : '')}
          >
            {submitting ? 'Scoring…' : primaryAction.label}
            {!isQuiz && <ChevronRight className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* exit confirmation */}
      <AnimatePresence>
        {exitAsk && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setExitAsk(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="qf-card p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg font-extrabold">Leave the lesson?</h2>
              <p className="mt-1.5 text-sm text-muted">
                Your place and answers are saved, you can pick up right here later.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={() => setExitAsk(false)} className="btn3d btn3d-ghost">Keep learning</button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="btn3d btn3d-danger"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CardBody({
  card, state, onAnswer, onExercise,
}: {
  card: PlayerCard;
  state: PlayerState;
  onAnswer: (qid: string, v: string | string[]) => void;
  onExercise: (kind: 'guided' | 'independent', done: boolean) => void;
}) {
  switch (card.kind) {
    case 'intro':
      return <IntroCard card={card} />;
    case 'concept':
      return (
        <div>
          {card.title && <h2 className="text-xl font-extrabold tracking-tight mb-3">{stripMd(card.title)}</h2>}
          {card.blocks.map((b, i) => <ClientBlock key={i} block={b} />)}
        </div>
      );
    case 'lab':
      return (
        <div>
          <InteractiveBlock component={card.block.component} params={card.block.params} caption={card.block.caption} />
          <p className="mt-3 text-xs text-faint text-center">Play with the lab, then continue when the idea clicks.</p>
        </div>
      );
    case 'exercise':
      return <ExerciseCard card={card} done={card.exKind === 'guided' ? state.exercises.guided : state.exercises.independent} onDone={onExercise} />;
    case 'quiz':
      return <QuizCard question={card.question} value={state.answers[card.question.id]} onAnswer={onAnswer} revealed={!!state.feedback[card.question.id]} />;
    case 'mistakes':
      return (
        <div>
          <h2 className="text-xl font-extrabold tracking-tight mb-3">Common mistakes</h2>
          <ul className="space-y-2.5">
            {card.items.map((m, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border-2 border-transparent bg-danger-soft px-4 py-3 text-sm anim-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
                <span><ClientMd text={m} /></span>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'reality':
      return (
        <div>
          <h2 className="text-xl font-extrabold tracking-tight mb-3">Where you will use this</h2>
          <div className="space-y-3">
            {card.realWorld && (
              <div className="flex gap-3 rounded-2xl border-2 border-border bg-surface p-4 text-sm">
                <Building2 className="h-5 w-5 text-info shrink-0 mt-0.5" />
                <span><ClientMd text={card.realWorld} /></span>
              </div>
            )}
            {card.quant && (
              <div className="flex gap-3 rounded-2xl border-2 border-transparent bg-accent-soft p-4 text-sm">
                <TrendingUp className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span><ClientMd text={card.quant} /></span>
              </div>
            )}
          </div>
        </div>
      );
    case 'summary':
      return (
        <div>
          <h2 className="text-xl font-extrabold tracking-tight mb-3">Wrap-up</h2>
          <ul className="space-y-2">
            {card.items.map((s, i) => (
              <li key={i} className="flex gap-2.5 items-start rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm anim-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span><ClientMd text={s} /></span>
              </li>
            ))}
          </ul>
          {card.flashcardCount > 0 && (
            <div className="mt-4 rounded-2xl border-2 border-border bg-surface p-4 flex items-center gap-3 text-sm">
              <BookOpen className="h-5 w-5 text-violet shrink-0" />
              <span><strong>{card.flashcardCount} revision cards</strong> were scheduled into your spaced-repetition deck.</span>
            </div>
          )}
        </div>
      );
  }
}

function IntroCard({ card }: { card: Extract<PlayerCard, { kind: 'intro' }> }) {
  return (
    <div className="py-1">
      <div className="flex items-center justify-center gap-4">
        <div className="h-14 w-14 rounded-3xl bg-accent-soft flex items-center justify-center anim-bob shrink-0">
          <GraduationCap className="h-7 w-7 text-accent" />
        </div>
        <div className="text-left">
          <p className="text-[11px] font-bold text-faint uppercase tracking-[0.14em]">Lesson briefing</p>
          <h1 className="text-2xl sm:text-[1.7rem] font-black tracking-tight leading-tight">{card.title}</h1>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <span className="chip chip-info"><Clock className="h-3 w-3" /> ~{card.estMinutes} min</span>
        <span className="chip chip-warning"><Target className="h-3 w-3" /> {card.difficulty}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 md:text-left">
        <div className="text-left rounded-2xl border-2 border-transparent bg-accent-soft p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-accent-deep dark:text-accent mb-1.5">Why this matters</p>
          <p className="text-sm leading-relaxed font-semibold"><ClientMd text={card.motivation} /></p>
        </div>
        <div className="text-left rounded-2xl border-2 border-border bg-surface-2/60 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-faint mb-2">By the end you can</p>
          <ul className="space-y-2">
            {card.objectives.map((o, i) => (
              <li key={i} className="flex gap-2.5 items-start text-sm">
                <span className="h-5 w-5 shrink-0 rounded-full bg-info-soft text-info-strong dark:text-info text-[10px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                <span><ClientMd text={o} /></span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {card.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
          {card.skills.map(s => <span key={s} className="chip">{s.replace(/-/g, ' ')}</span>)}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ card, done, onDone }: {
  card: Extract<PlayerCard, { kind: 'exercise' }>;
  done: boolean;
  onDone: (kind: 'guided' | 'independent', done: boolean) => void;
}) {
  const [hintsOpen, setHintsOpen] = React.useState(0);
  const [solutionOpen, setSolutionOpen] = React.useState(false);
  return (
    <div>
      <h2 className="text-xl font-extrabold tracking-tight mb-3">{card.exKind === 'guided' ? 'Guided exercise' : 'Your turn'}</h2>
      <div className="rounded-2xl border-2 border-border bg-surface p-4">
        <div className="flex gap-2.5 items-start text-sm leading-relaxed">
          <Lightbulb className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="prose-qf"><ClientMd text={card.prompt} /></div>
        </div>
      </div>
      {card.hints.length > 0 && (
        <div className="mt-3">
          {card.hints.slice(0, hintsOpen).map((h, i) => (
            <div key={i} className="mt-2 rounded-2xl border-2 border-transparent bg-warning-soft px-4 py-3 text-sm anim-pop-in">
              <strong className="text-warning-strong dark:text-warning">Hint {i + 1}. </strong>
              <ClientMd text={h} />
            </div>
          ))}
          {hintsOpen < card.hints.length && (
            <button onClick={() => setHintsOpen(h => h + 1)} className="btn3d btn3d-gold btn3d-sm mt-2">
              <Lightbulb className="h-3.5 w-3.5" /> Reveal hint {hintsOpen + 1}/{card.hints.length}
            </button>
          )}
        </div>
      )}
      {solutionOpen ? (
        <div className="mt-3 rounded-2xl border-2 border-border bg-code-bg p-4 anim-pop-in">
          <p className="text-xs font-extrabold uppercase tracking-wide text-faint mb-2">Worked solution</p>
          <pre className="code-block !bg-transparent !border-0 !p-0"><code>{card.solution}</code></pre>
        </div>
      ) : (
        <button onClick={() => setSolutionOpen(true)} className="btn3d btn3d-ghost btn3d-sm mt-3">
          <Lock className="h-3.5 w-3.5" /> Show worked solution
        </button>
      )}
      <label className={cn(
        'mt-4 flex items-center gap-3 rounded-2xl border-2 p-4 cursor-pointer select-none transition-colors',
        done ? 'border-transparent bg-accent-soft' : 'border-dashed border-border-strong bg-surface hover:bg-surface-2',
      )}>
        <input
          type="checkbox"
          checked={done}
          onChange={e => onDone(card.exKind, e.target.checked)}
          className="h-5 w-5 accent-[var(--accent)]"
        />
        <span className="text-sm font-bold">{done ? 'Exercise completed, nice work!' : 'I worked through this exercise (pen and paper or editor)'}</span>
      </label>
    </div>
  );
}

function QuizCard({ question, value, onAnswer, revealed }: {
  question: Extract<PlayerCard, { kind: 'quiz' }>['question'];
  value: string | string[] | undefined;
  onAnswer: (qid: string, v: string | string[]) => void;
  revealed: boolean;
}) {
  const qid = question.id;
  return (
    <div>
      <p className="text-lg font-extrabold leading-snug"><ClientMd text={question.prompt} /></p>
      {question.code && (
        <div className="code-block mt-3"><code>{question.code}</code></div>
      )}
      <div className="mt-4 space-y-2.5">
        {question.type === 'mcq' && question.options?.map((opt, i) => (
          <button
            key={i}
            disabled={revealed}
            onClick={() => onAnswer(qid, String(i))}
            className={cn(
              'w-full text-left flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition-all press',
              value === String(i)
                ? 'border-info bg-info-soft shadow-[0_3px_0_0_var(--border-strong)]'
                : 'border-border bg-surface hover:bg-surface-2',
              revealed && value === String(i) && 'border-accent bg-accent-soft',
            )}
          >
            <span className={cn(
              'h-7 w-7 shrink-0 rounded-xl border-2 flex items-center justify-center text-xs font-black',
              value === String(i) ? 'border-info bg-info text-white' : 'border-border-strong text-muted',
            )}>
              {String.fromCharCode(65 + i)}
            </span>
            <span className="prose-qf"><ClientMd text={opt} /></span>
          </button>
        ))}
        {question.type === 'ms' && question.options?.map((opt, i) => {
          const sel = ((value as string[]) ?? []).includes(String(i));
          return (
            <button
              key={i}
              disabled={revealed}
              onClick={() => onAnswer(qid, sel
                ? ((value as string[]) ?? []).filter(x => x !== String(i))
                : [...((value as string[]) ?? []), String(i)])}
              className={cn(
                'w-full text-left flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition-all press',
                sel ? 'border-info bg-info-soft' : 'border-border bg-surface hover:bg-surface-2',
              )}
            >
              <span className={cn(
                'h-7 w-7 shrink-0 rounded-lg border-2 flex items-center justify-center',
                sel ? 'border-info bg-info text-white' : 'border-border-strong',
              )}>
                {sel && <Check className="h-4 w-4" />}
              </span>
              <span className="prose-qf"><ClientMd text={opt} /></span>
            </button>
          );
        })}
        {question.type === 'numeric' && (
          <div className="flex items-center gap-3">
            <input
              type="text" inputMode="decimal" disabled={revealed}
              value={(value as string) ?? ''}
              onChange={e => onAnswer(qid, e.target.value)}
              placeholder="Your answer"
              className="w-44 h-14 px-4 rounded-2xl border-2 border-border bg-surface text-lg font-bold tnum text-center focus:border-info focus:outline-none"
            />
            {question.unit && <span className="text-sm font-bold text-muted">{question.unit}</span>}
          </div>
        )}
        {question.type === 'code-output' && (
          <textarea
            rows={3} disabled={revealed}
            value={(value as string) ?? ''}
            onChange={e => onAnswer(qid, e.target.value)}
            placeholder="Exact output, one line per output line"
            className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-surface text-sm font-mono focus:border-info focus:outline-none"
          />
        )}
        {question.type === 'short' && (
          <textarea
            rows={3} disabled={revealed}
            value={(value as string) ?? ''}
            onChange={e => onAnswer(qid, e.target.value)}
            placeholder="Answer in your own words…"
            className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-surface text-sm focus:border-info focus:outline-none"
          />
        )}
      </div>
      <p className="mt-3 text-xs text-faint">Answer honestly, the point is finding your gaps, not the green tick.</p>
    </div>
  );
}

/* ---------- finish screen ---------- */

function FinishScreen({ result, quizCards, nextHref, nextTitle, referenceHref, title }: {
  result: FinishResult;
  quizCards: number;
  nextHref?: string;
  nextTitle?: string;
  referenceHref: string;
  title: string;
}) {
  const passed = result.status === 'passed' || result.status === 'mastered';
  const master = result.status === 'mastered';
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      {passed && <Confetti />}
      <div className="max-w-lg mx-auto px-4 py-10 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className={cn('mx-auto h-24 w-24 rounded-full flex items-center justify-center', passed ? 'bg-accent' : 'bg-warning')}>
          {passed ? <Trophy className="h-12 w-12 text-white" /> : <RotateCcw className="h-11 w-11 text-white" />}
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mt-6 text-3xl font-black tracking-tight">
          {master ? 'Mastered!' : passed ? 'Lesson passed!' : 'Keep going'}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="mt-2 text-sm text-muted font-semibold">
          {master
            ? 'You retained this material across a later check, the strongest signal there is.'
            : passed
              ? 'Solid work. This unlocks the next lessons in your path.'
              : 'Below the 80% pass mark. Skim the explanations in reference view and run it again.'}
        </motion.p>

        {/* score ring */}
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}
          className="mt-8 mx-auto relative h-40 w-40">
            <ScoreRing pct={result.pct} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black tnum">{result.pct}%</span>
            {result.correct !== undefined && (
              <span className="text-xs font-bold text-muted">{result.correct}/{result.total} correct</span>
            )}
          </div>
        </motion.div>

        {/* stat chips */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="mt-8 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border-2 border-border bg-surface p-3">
            <Zap className="h-5 w-5 mx-auto text-warning" />
            <p className="mt-1 text-xl font-black tnum">+{result.xpAwarded}</p>
            <p className="text-[11px] font-bold text-muted">XP EARNED</p>
          </div>
          <div className="rounded-2xl border-2 border-border bg-surface p-3">
            <Flame className={cn('h-5 w-5 mx-auto text-flame', result.streakCount ? 'anim-flame' : 'opacity-40')} />
            <p className="mt-1 text-xl font-black tnum">{result.streakCount ?? ', '}</p>
            <p className="text-[11px] font-bold text-muted">DAY STREAK</p>
          </div>
          <div className="rounded-2xl border-2 border-border bg-surface p-3">
            <Star className={cn('h-5 w-5 mx-auto text-violet', master && 'anim-wiggle')} />
            <p className="mt-1 text-xl font-black">{master ? 'MASTERED' : passed ? 'PASSED' : 'RETRY'}</p>
            <p className="text-[11px] font-bold text-muted">STATUS</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          className="mt-8 space-y-3">
          {nextHref && (
            <Link href={nextHref} className="btn3d w-full text-base">
              Next lesson {nextTitle ? `· ${trunc(nextTitle, 28)}` : ''} <ChevronRight className="h-5 w-5" />
            </Link>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Link href={referenceHref} className="btn3d btn3d-ghost">
              <BookOpen className="h-4 w-4" /> Reference view
            </Link>
            <Link href="/dashboard" className="btn3d btn3d-blue">
              <MapIcon className="h-4 w-4" /> Learning path
            </Link>
          </div>
        </motion.div>

        <p className="mt-6 text-xs text-faint">Quiz score is graded on the server, {quizCards} question{quizCards === 1 ? '' : 's'} in this lesson.</p>
      </div>
    </div>
  );
}

function ScoreRing({ pct }: { pct: number }) {
  const r = 62;
  const c = 2 * Math.PI * r;
  const color = pct >= 80 ? 'var(--accent)' : 'var(--warning)';
  return (
    <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
      <circle cx="80" cy="80" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="14" />
      <motion.circle
        cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - pct / 100) }}
        transition={{ duration: 1.1, ease: 'easeOut', delay: 0.4 }}
      />
    </svg>
  );
}

/* ---------- helpers ---------- */

function isAnswered(q: Extract<PlayerCard, { kind: 'quiz' }>['question'], v: string | string[] | undefined): boolean {
  if (v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).length > 0;
}

function stripMd(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`([^`]+)`/g, '$1');
}

function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
