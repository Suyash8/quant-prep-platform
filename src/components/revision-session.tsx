'use client';

import * as React from 'react';
import { Eye, EyeOff, Check, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { QMath } from '@/components/quiz';
import { recordReviews, deleteCard, cardStateOf } from '@/lib/client/local-state';

export interface DueCard {
  cardKey: string; front: string; back: string; cardType: string; source: string;
  intervalDays: number; repetitions: number; lapses: number;
}

const GRADE_BTN = 'w-full py-2.5 rounded-xl text-[13px] font-black hover:brightness-105 active:translate-y-[3px] active:shadow-none transition-all';

const GRADES = [
  { g: 0, label: 'Blackout', desc: 'No recall at all', cls: `bg-danger text-white shadow-[0_3px_0_0_#c93a3f] ${GRADE_BTN}` },
  { g: 2, label: 'Hard miss', desc: 'Wrong, but familiar', cls: `bg-warning text-white shadow-[0_3px_0_0_var(--warning-strong)] ${GRADE_BTN}` },
  { g: 3, label: 'Recalled, hard', desc: 'Correct with effort', cls: `bg-info text-white shadow-[0_3px_0_0_#1580b8] ${GRADE_BTN}` },
  { g: 4, label: 'Recalled', desc: 'Correct with some hesitation', cls: `bg-accent text-white shadow-[0_3px_0_0_var(--accent-deep)] ${GRADE_BTN}` },
  { g: 5, label: 'Instant', desc: 'Perfect, immediate recall', cls: `bg-gold text-[#4a3800] shadow-[0_3px_0_0_#d9ab00] ${GRADE_BTN}` },
];

export function RevisionSession({ cards }: { cards: DueCard[] }) {
  const [queue, setQueue] = React.useState<DueCard[]>(cards);
  const [idx, setIdx] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [done, setDone] = React.useState(0);

  const card = queue[idx];
  const progressPct = queue.length > 0 ? Math.min(100, Math.round(((idx + 1) / queue.length) * 100)) : 0;
  const progressWidth = `${progressPct}%`;

  function grade(g: number) {
    if (!card) return;
    // v3: SM-2 runs locally, instantly, offline. Reviews sync in the background.
    const before = cardStateOf(card.cardKey);
    recordReviews([{ cardKey: card.cardKey, grade: g }]);
    const after = cardStateOf(card.cardKey);
    const graduated = card.source === 'quiz_miss' && !!before && !!after && g >= 4 && after.repetitions >= 2;
    if (graduated) {
      // solid twice in a row: retire the card (same rule the server used for quiz-miss cards)
      deleteCard(card.cardKey);
      setQueue(q => q.filter(c => c.cardKey !== card.cardKey));
      if (idx >= queue.length - 1) setIdx(0);
    } else {
      setIdx(i => i + 1);
    }
    setRevealed(false);
    setDone(d => d + 1);
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
        <a href="/revision" className="btn3d mt-4">Back to revision centre</a>
      </div>
    );
  }

  const typeWords = card.cardType.replace(/-/g, ' ');
  const typeTitle = typeWords.charAt(0).toUpperCase() + typeWords.slice(1);

  return (
    <div className="max-w-xl mx-auto">
      <div className="h-2.5 rounded-full gauge-track mb-4">
        <div className="gauge-fill bg-accent" style={{ width: progressWidth }} />
      </div>
      <div className="qf-card overflow-hidden">
        <div className="p-6 min-h-[140px] flex flex-col items-center justify-center text-center">
          <p className="text-2xl font-black leading-snug"><QMath text={card.front} /></p>
          <p className="mt-3 text-[12px] font-black uppercase tracking-[0.12em] text-faint">
            Card {idx + 1} of {queue.length} · {typeTitle}{card.source === 'quiz_miss' ? ' · from a missed question' : ''}
          </p>
          {revealed && (
            <div className="anim-slide-up mt-5 pt-5 border-t w-full text-[15px] text-muted leading-relaxed font-semibold">
              <QMath text={card.back} />
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
      {!revealed && <p className="mt-3 text-[13px] text-faint text-center font-semibold">Try to recall before revealing, retrieval effort is what builds memory.</p>}
      {revealed && <p className="mt-3 text-[13px] text-faint text-center font-semibold">Grade honestly: the SM-2 scheduler uses it to set the next interval.</p>}
    </div>
  );
}
