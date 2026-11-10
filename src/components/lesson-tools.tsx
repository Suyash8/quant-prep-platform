'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, BookmarkPlus, BookmarkCheck, NotebookPen, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { QMath } from '@/components/quiz';
import { recordExerciseDone, lessonProgressOf } from '@/lib/client/local-state';

export function ExerciseCard({ lessonId, kind, title, prompt, hints, solution, initialDone }: {
  lessonId: string; kind: 'guided' | 'independent'; title: string;
  prompt: string; hints: string[]; solution: string; initialDone: boolean;
}) {
  const [showHints, setShowHints] = React.useState(false);
  const [showSolution, setShowSolution] = React.useState(false);
  const [done, setDone] = React.useState(initialDone);

  function markDone() {
    // v3: recorded locally, instant and offline-capable, synced in the background
    setDone(true);
    recordExerciseDone(lessonId, !!lessonProgressOf(lessonId)?.exerciseDone || initialDone);
    toast.success(kind === 'guided' ? 'Guided exercise complete.' : 'Independent exercise complete.');
  }

  return (
    <div className="border rounded-xl bg-surface overflow-hidden my-5">
      <div className="px-4 py-2.5 border-b bg-surface-2/50 flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2">
          <span className={`chip ${done ? 'chip-success' : ''}`}>{done ? 'complete' : kind}</span>
          {title}
        </span>
        {!done && (
          <button onClick={markDone} className="text-xs px-3 py-1.5 rounded-md bg-accent text-accent-foreground hover:bg-accent-strong disabled:opacity-50">
            Mark complete
          </button>
        )}
      </div>
      <div className="p-4">
        <div className="prose-qf text-sm"><QMath text={prompt} /></div>
        {hints.length > 0 && (
          <div className="mt-3">
            <button onClick={() => setShowHints(h => !h)} className="text-xs text-accent hover:underline">
              {showHints ? 'Hide hints' : `Show hint${hints.length > 1 ? 's' : ''} (${hints.length})`}
            </button>
            {showHints && (
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                {hints.map((h, i) => <li key={i} className="pl-4 border-l-2 border-border-strong"><QMath text={h} /></li>)}
              </ul>
            )}
          </div>
        )}
        <div className="mt-3">
          <button onClick={() => setShowSolution(s => !s)} className="text-xs text-accent hover:underline inline-flex items-center gap-1">
            {showSolution ? <><EyeOff className="h-3.5 w-3.5" /> Hide worked solution</> : <><Eye className="h-3.5 w-3.5" /> Show worked solution</>}
          </button>
          {showSolution && (
            <div className="mt-2 rounded-lg bg-surface-2/60 border px-3 py-2.5 text-sm prose-qf">
              <QMath text={solution} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LessonFooterTools({ lessonId, initiallyBookmarked, note, prevHref, prevTitle, nextHref, nextTitle, nextLabel }: {
  lessonId: string; initiallyBookmarked: boolean; note: string;
  prevHref?: string; prevTitle?: string; nextHref?: string; nextTitle?: string; nextLabel?: string;
}) {
  const [bookmarked, setBookmarked] = React.useState(initiallyBookmarked);
  const [notes, setNotes] = React.useState(note);
  const [saved, setSaved] = React.useState(false);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  async function toggleBookmark() {
    const res = await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'bookmark', lessonId }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? 'Failed.'); return; }
    setBookmarked(data.bookmarked);
  }

  function onNotesChange(v: string) {
    setNotes(v);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const res = await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'note', lessonId, body: v }),
      });
      if (res.ok) setSaved(true);
    }, 800);
  }

  return (
    <div className="mt-10 space-y-6">
      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        <button onClick={toggleBookmark} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border hover:bg-surface-2">
          {bookmarked ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <BookmarkPlus className="h-4 w-4" />}
          {bookmarked ? 'Bookmarked' : 'Bookmark lesson'}
        </button>
        <div className="flex-1" />
        {prevHref && (
          <Link href={prevHref} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border hover:bg-surface-2 max-w-[220px]">
            <ChevronLeft className="h-4 w-4 shrink-0" /> <span className="truncate">{prevTitle}</span>
          </Link>
        )}
        {nextHref && (
          <Link href={nextHref} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent-strong max-w-[240px]">
            <span className="truncate">{nextLabel ?? nextTitle}</span> <ChevronRight className="h-4 w-4 shrink-0" />
          </Link>
        )}
      </div>
      <details className="border rounded-xl bg-surface overflow-hidden" open={!!note}>
        <summary className="px-4 py-2.5 cursor-pointer text-sm font-medium flex items-center gap-2 select-none">
          <NotebookPen className="h-4 w-4 text-accent" /> Lesson notes {saved && <span className="text-xs text-success font-normal">saved</span>}
        </summary>
        <div className="p-4 pt-0">
          <textarea
            value={notes} onChange={e => onNotesChange(e.target.value)} rows={4}
            placeholder="Write your own summary, questions, or things to revisit…"
            className="w-full mt-3 px-3 py-2 rounded-lg border bg-background text-sm"
            aria-label="Lesson notes"
          />
        </div>
      </details>
    </div>
  );
}

export function MasteryBanner({ status, pct, exerciseDone }: { status: string; pct: number; exerciseDone: boolean }) {
  const map: Record<string, { label: string; cls: string }> = {
    not_started: { label: 'Not started', cls: '' },
    in_progress: { label: 'In progress', cls: 'chip-accent' },
    attempted: { label: 'Attempted', cls: 'chip-warning' },
    passed: { label: 'Passed', cls: 'chip-success' },
    mastered: { label: 'Mastered', cls: 'chip-success' },
    needs_revision: { label: 'Needs revision', cls: 'chip-danger' },
  };
  const m = map[status] ?? map.not_started;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className={`chip ${m.cls}`}>{m.label}</span>
      {pct > 0 && <span className="text-faint text-xs">best knowledge-check: <span className="tnum">{pct}%</span></span>}
      {status === 'passed' && !exerciseDone === false && <CheckCircle2 className="h-4 w-4 text-success" />}
      {status === 'needs_revision' && <span className="text-xs text-faint">score ≥ 80% and complete the exercises to pass</span>}
    </div>
  );
}
