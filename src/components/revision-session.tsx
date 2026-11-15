'use client';

import * as React from 'react';
import Link from 'next/link';
import { Eye, Check, X, Sparkles, Clock, Undo2, BookOpen, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { QMath } from '@/components/quiz';
import {
  recordReviews, deleteCard, cardStateOf, snoozeCard, restoreCardSnapshot,
  dueCardKeys, hydrate, type CardLocal,
} from '@/lib/client/local-state';
import { getLessonPack } from '@/lib/client/packs';

export interface DueCard {
  cardKey: string; front: string; back: string; cardType: string; source: string;
  intervalDays: number; repetitions: number; lapses: number;
}

function sourceLessonId(cardKey: string): string | null {
  const raw = cardKey.startsWith('quiz:') ? cardKey.slice(5) : cardKey;
  const idx = raw.lastIndexOf(':');
  return idx > 0 ? raw.slice(0, idx) : null;
}

const GRADE_BTN = 'w-full py-2.5 rounded-xl text-[13px] font-black hover:brightness-105 active:translate-y-[3px] active:shadow-none transition-all';

const GRADES = [
  { g: 0, label: 'Blackout', desc: 'No recall at all', cls: `bg-danger text-white shadow-[0_3px_0_0_#c93a3f] ${GRADE_BTN}` },
  { g: 2, label: 'Hard miss', desc: 'Wrong, but familiar', cls: `bg-warning text-white shadow-[0_3px_0_0_var(--warning-strong)] ${GRADE_BTN}` },
  { g: 3, label: 'Recalled, hard', desc: 'Correct with effort', cls: `bg-info text-white shadow-[0_3px_0_0_#1580b8] ${GRADE_BTN}` },
  { g: 4, label: 'Recalled', desc: 'Correct with some hesitation', cls: `bg-accent text-white shadow-[0_3px_0_0_var(--accent-deep)] ${GRADE_BTN}` },
  { g: 5, label: 'Instant', desc: 'Perfect, immediate recall', cls: `bg-gold text-[#4a3800] shadow-[0_3px_0_0_#d9ab00] ${GRADE_BTN}` },
];

export function RevisionSession({ cards, onComplete }: { cards?: DueCard[]; onComplete?: () => void }) {
  const [queue, setQueue] = React.useState<DueCard[]>(cards ?? []);
  const [loading, setLoading] = React.useState(!cards);
  const [idx, setIdx] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [snoozeHours, setSnoozeHours] = React.useState(24);
  const [done, setDone] = React.useState(0);
  const [lastAction, setLastAction] = React.useState<{
    card: DueCard;
    before: CardLocal | undefined;
    removed: boolean;
    prevIdx: number;
    prevDone: number;
  } | null>(null);

  React.useEffect(() => {
    if (cards) return;
    let alive = true;
    (async () => {
      await hydrate().catch(() => {});
      const keys = dueCardKeys(40);
      if (keys.length === 0) {
        if (alive) { setQueue([]); setLoading(false); }
        return;
      }
      const byLesson = new Map<string, { key: string; idxStr: string; source: string }[]>();
      for (const k of keys) {
        const isQuiz = k.startsWith('quiz:');
        const raw = isQuiz ? k.slice(5) : k;
        const colon = raw.lastIndexOf(':');
        if (colon <= 0) continue;
        const lessonId = raw.slice(0, colon);
        const idxStr = raw.slice(colon + 1);
        const list = byLesson.get(lessonId) ?? [];
        list.push({ key: k, idxStr, source: isQuiz ? 'quiz_miss' : 'flashcard' });
        byLesson.set(lessonId, list);
      }
      const resolved: DueCard[] = [];
      await Promise.all(
        [...byLesson.entries()].map(async ([lessonId, entries]) => {
          try {
            const lesson = await getLessonPack(lessonId);
            for (const entry of entries) {
              const st = cardStateOf(entry.key);
              if (entry.source === 'quiz_miss') {
                const q = lesson.quiz.find((x) => x.id === entry.idxStr);
                if (!q) continue;
                resolved.push({
                  cardKey: entry.key,
                  front: q.prompt,
                  back: q.explanation,
                  cardType: 'concept',
                  source: 'quiz_miss',
                  intervalDays: st?.intervalDays ?? 0,
                  repetitions: st?.repetitions ?? 0,
                  lapses: st?.lapses ?? 0,
                });
              } else {
                const i = parseInt(entry.idxStr, 10);
                const fc = lesson.flashcards[i];
                if (!fc) continue;
                resolved.push({
                  cardKey: entry.key,
                  front: fc.front,
                  back: fc.back,
                  cardType: fc.type || 'concept',
                  source: 'flashcard',
                  intervalDays: st?.intervalDays ?? 0,
                  repetitions: st?.repetitions ?? 0,
                  lapses: st?.lapses ?? 0,
                });
              }
            }
          } catch { /* skip missing pack */ }
        }),
      );
      if (alive) {
        setQueue(resolved);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cards]);

  const card = queue[idx];
  const progressPct = queue.length > 0 ? Math.min(100, Math.round(((idx + 1) / queue.length) * 100)) : 0;
  const progressWidth = `${progressPct}%`;

  function grade(g: number) {
    if (!card) return;
    // SM-2 runs locally, instantly, offline. Reviews sync in the background.
    const before = cardStateOf(card.cardKey);
    recordReviews([{ cardKey: card.cardKey, grade: g }]);
    const after = cardStateOf(card.cardKey);
    const graduated = card.source === 'quiz_miss' && !!before && !!after && g >= 4 && after.repetitions >= 2;
    setLastAction({ card, before, removed: graduated, prevIdx: idx, prevDone: done });
    if (graduated) {
      // solid twice in a row: retire the card (same rule the server used for quiz-miss cards)
      deleteCard(card.cardKey);
      setQueue(q => q.filter(c => c.cardKey !== card.cardKey));
      if (idx >= queue.length - 1) setIdx(0);
    } else {
      setIdx(i => i + 1);
    }
    setRevealed(false);
    setNote('');
    setDone(d => d + 1);
  }

  function snooze(hours = snoozeHours) {
    if (!card) return;
    const before = cardStateOf(card.cardKey);
    snoozeCard(card.cardKey, hours / 24);
    setLastAction({ card, before, removed: false, prevIdx: idx, prevDone: done });
    setIdx(i => i + 1);
    setRevealed(false);
    setNote('');
    const label = hours === 1 ? '1 hour' : hours === 24 ? '24 hours' : '7 days';
    toast.info(`Snoozed card for ${label}.`);
  }

  function retireCurrent() {
    if (!card) return;
    const before = cardStateOf(card.cardKey);
    deleteCard(card.cardKey);
    setLastAction({ card, before, removed: true, prevIdx: idx, prevDone: done });
    setQueue(q => q.filter(c => c.cardKey !== card.cardKey));
    if (idx >= queue.length - 1) setIdx(0);
    setRevealed(false);
    setNote('');
    toast.info('Retired card from due queue. You can restore it anytime below.');
  }

  function undoLast() {
    if (!lastAction) return;
    if (lastAction.before) restoreCardSnapshot(lastAction.card.cardKey, lastAction.before);
    if (lastAction.removed) {
      setQueue(q => {
        const next = [...q];
        next.splice(Math.min(lastAction.prevIdx, next.length), 0, lastAction.card);
        return next;
      });
    }
    setIdx(lastAction.prevIdx);
    setDone(lastAction.prevDone);
    setRevealed(false);
    setNote('');
    setLastAction(null);
    toast.info('Reverted last card.');
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-3 w-full bg-surface-2 rounded mb-4" />
        <div className="h-56 bg-surface-2 rounded-2xl" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="qf-card p-8 text-center anim-pop-in">
        <span className="mx-auto h-14 w-14 rounded-3xl bg-accent text-white flex items-center justify-center shadow-[0_5px_0_0_var(--accent-deep)] anim-bob">
          <Sparkles className="h-7 w-7" strokeWidth={2.5} />
        </span>
        <h2 className="mt-4 text-xl font-black tracking-tight">Session complete, {done} card{done === 1 ? '' : 's'} reviewed.</h2>
        <p className="mt-1.5 text-[15px] font-semibold text-muted max-w-md mx-auto">
          The scheduler has re-spaced everything you touched. Cards return as their intervals grow; lapsed cards come back sooner.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {lastAction && (
            <button type="button" onClick={undoLast} className="btn3d btn3d-ghost btn3d-sm">
              <Undo2 className="h-4 w-4" /> Undo last card
            </button>
          )}
          {onComplete && (
            <button type="button" onClick={onComplete} className="btn3d btn3d-ghost">
              Refresh summary
            </button>
          )}
          <Link href="/curriculum" className="btn3d">Browse curriculum</Link>
        </div>
      </div>
    );
  }

  const typeWords = card.cardType.replace(/-/g, ' ');
  const typeTitle = typeWords.charAt(0).toUpperCase() + typeWords.slice(1);
  const lessonRef = sourceLessonId(card.cardKey);

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between gap-2 mb-2 text-[12px] font-bold text-muted">
        <span className="tnum">Card {idx + 1} of {queue.length}</span>
        <div className="flex items-center gap-2">
          {lastAction && (
            <button type="button" onClick={undoLast} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-0.5 text-muted hover:text-foreground hover:bg-surface-2 transition-colors">
              <Undo2 className="h-3 w-3" /> Undo
            </button>
          )}
          <button type="button" onClick={() => snooze(24)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-0.5 text-muted hover:text-foreground hover:bg-surface-2 transition-colors" title="Defer card 24 hours">
            <Clock className="h-3 w-3" /> Snooze +1d
          </button>
        </div>
      </div>
      <div className="h-2.5 rounded-full gauge-track mb-4">
        <div className="gauge-fill bg-accent" style={{ width: progressWidth }} />
      </div>
      <div className="qf-card overflow-hidden">
        <div className="p-6 min-h-[140px] flex flex-col items-center justify-center text-center">
          <p className="text-2xl font-black leading-snug"><QMath text={card.front} /></p>
          <p className="mt-3 text-[12px] font-black uppercase tracking-[0.12em] text-faint">
            Card {idx + 1} of {queue.length} · {typeTitle}{card.source === 'quiz_miss' ? ' · from a missed question' : ''}
          </p>
          <div className="mt-4 w-full text-left">
            <label className="block text-[12px] font-bold text-faint mb-1.5">
              Optional scratch space <span className="font-semibold">(private to this device)</span>
            </label>
            <textarea
              aria-label="Optional scratch space"
              rows={2}
              maxLength={4000}
              disabled={revealed}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write your recall attempt before revealing..."
              className="w-full rounded-xl border-2 border-border bg-surface-2/60 px-3 py-2 text-[13px] font-medium text-foreground placeholder:text-faint focus:border-accent focus:outline-none disabled:opacity-75"
            />
          </div>
          {revealed && (
            <div className="anim-slide-up mt-5 pt-5 border-t w-full text-[15px] text-muted leading-relaxed font-semibold text-left">
              <QMath text={card.back} />
              {lessonRef && (
                <div className="mt-3 pt-2.5 border-t border-border/60">
                  <Link href={`/learn/${encodeURIComponent(lessonRef)}`} className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-accent-deep dark:text-accent hover:underline">
                    <BookOpen className="h-3.5 w-3.5" /> Revisit source lesson
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="border-t px-4 py-3.5 bg-surface-2/40">
          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="btn3d btn3d-ghost w-full !py-3">
              <Eye className="h-4 w-4" strokeWidth={2.5} /> Reveal answer
            </button>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {GRADES.map(g => (
                <button key={g.g} onClick={() => grade(g.g)}
                  title={g.desc}
                  className={g.cls}>
                  {g.g === 0 ? <X className="h-4 w-4 mx-auto" strokeWidth={2.5} /> : g.g === 2 ? <X className="h-4 w-4 mx-auto" strokeWidth={2.5} /> : <Check className="h-4 w-4 mx-auto" strokeWidth={2.5} />}
                  <span className="block mt-0.5">{g.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <details className="mt-4 qf-card-flat px-4 py-3 text-[13px]">
        <summary className="cursor-pointer font-extrabold text-muted select-none">Manage this review</summary>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-end gap-2">
            <label className="text-[12px] font-bold text-faint">
              Snooze for
              <select
                value={snoozeHours}
                onChange={(e) => setSnoozeHours(Number(e.target.value))}
                className="mt-1 block qf-select !h-9 !text-[13px]"
              >
                <option value={1}>1 hour</option>
                <option value={24}>24 hours</option>
                <option value={168}>7 days</option>
              </select>
            </label>
            <button type="button" onClick={() => snooze(snoozeHours)} className="btn3d btn3d-ghost btn3d-sm">
              <Clock className="h-3.5 w-3.5" /> Snooze
            </button>
          </div>
          <button type="button" onClick={retireCurrent} className="btn3d btn3d-ghost btn3d-sm text-muted">
            <Archive className="h-3.5 w-3.5" /> Retire card
          </button>
        </div>
      </details>
      {!revealed && <p className="mt-3 text-[13px] text-faint text-center font-semibold">Try to recall before revealing, retrieval effort is what builds memory.</p>}
      {revealed && <p className="mt-3 text-[13px] text-faint text-center font-semibold">Grade honestly: the SM-2 scheduler uses it to set the next interval.</p>}
    </div>
  );
}
