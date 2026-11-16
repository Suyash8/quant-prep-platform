'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Flame, Sparkles, XCircle, Zap } from 'lucide-react';
import { Ring } from '@/components/page-kit';

const SAMPLE_CARDS = [
  {
    tag: 'Probability · Card 1 of 3',
    prompt: 'Two fair 6-sided dice are rolled. What is P(sum = 7)?',
    options: ['1/12', '1/6 (6/36 outcomes)', '1/9', '7/36'],
    correctIndex: 1,
    explanation: 'Six ordered pairs sum to 7 — (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) — out of 36.',
  },
  {
    tag: 'C++ Internals · Card 2 of 3',
    prompt: 'Which container stores elements contiguously in memory for cache locality?',
    options: ['std::list<double>', 'std::map<int, double>', 'std::vector<double>', 'std::deque<double>'],
    correctIndex: 2,
    explanation: 'std::vector guarantees contiguous heap storage, keeping spatial cache prefetching fast.',
  },
  {
    tag: 'Stochastic Calculus · Card 3 of 3',
    prompt: 'Under Brownian motion W(t), what does (dW_t)^2 converge to in quadratic variation?',
    options: ['0', 'dt', 'dW_t', 't^2'],
    correctIndex: 1,
    explanation: 'Itô calculus identity: (dW_t)^2 = dt in mean square, driving the extra ½σ²S² term in Itô’s lemma.',
  },
];

export function TryLessonWidget({ publishedLessons }: { publishedLessons: number }) {
  const [step, setStep] = React.useState(0);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [xp, setXp] = React.useState(0);

  const card = SAMPLE_CARDS[step];
  const isCorrect = picked === card.correctIndex;

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === card.correctIndex) setXp((v) => v + 20);
  }

  function nextCard() {
    setPicked(null);
    setStep((s) => (s + 1) % SAMPLE_CARDS.length);
  }

  return (
    <div className="qf-card p-6">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-[13px] font-black uppercase tracking-wide text-accent flex items-center gap-1.5 truncate">
          <Sparkles className="h-3.5 w-3.5 shrink-0" /> Interactive preview · {card.tag}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="hud-pill"><Flame className="h-3.5 w-3.5 text-flame" /><span className="text-[13px] tnum">Try it</span></span>
          <span className="hud-pill"><Zap className="h-3.5 w-3.5 text-warning" /><span className="text-[13px] tnum">{xp}</span></span>
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Ring value={Math.round(((step + 1) / SAMPLE_CARDS.length) * 100)} size={44} thickness={5} tone="var(--accent)">
          <span className="text-[12px] font-black tnum">{step + 1}/{SAMPLE_CARDS.length}</span>
        </Ring>
        <p className="text-[15px] font-extrabold leading-snug">{card.prompt}</p>
      </div>

      <div className="mt-4 space-y-2">
        {card.options.map((opt, i) => {
          const isChosen = picked === i;
          const revealRight = picked !== null && i === card.correctIndex;
          const revealWrong = picked !== null && isChosen && !revealRight;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => choose(i)}
              disabled={picked !== null}
              className={`qf-answer-tile w-full text-left ${revealRight ? 'qf-correct qf-selected' : revealWrong ? 'qf-wrong' : ''}`}
            >
              <span className="qf-answer-badge">{String.fromCharCode(65 + i)}</span>
              <span className="min-w-0 flex-1 text-[14px] font-semibold">{opt}</span>
              {revealRight && <CheckCircle2 className="h-4 w-4 flex-none text-accent" />}
              {revealWrong && <XCircle className="h-4 w-4 flex-none text-danger" />}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className={`mt-3 rounded-xl p-3 text-[13px] font-semibold ${isCorrect ? 'bg-accent-soft text-accent-deep dark:text-accent' : 'bg-danger-soft text-danger-strong dark:text-danger'}`}>
          {isCorrect ? 'Correct (+20 preview XP): ' : 'Not quite: '}
          <span className="text-muted">{card.explanation}</span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-border">
        <button type="button" onClick={nextCard} className="btn3d btn3d-ghost btn3d-sm">
          Next sample card <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <Link href="/curriculum" className="text-[13px] font-extrabold text-accent hover:underline">
          Browse all {publishedLessons} lessons →
        </Link>
      </div>
    </div>
  );
}
