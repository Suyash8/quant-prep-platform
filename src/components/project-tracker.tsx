'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Check, CheckCircle2, Info, Plus, Undo2 } from 'lucide-react';
import { getState, saveProjectProgress, subscribe } from '@/lib/client/local-state';

const STATUSES = ['not_started', 'in_progress', 'completed'] as const;
const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

export function ProjectTracker({
  slug,
  milestones,
  initialDone,
  initialStatus,
  initialNotes,
}: {
  slug: string;
  milestones: { title: string; estHours: number }[];
  initialDone: number;
  initialStatus: string;
  initialNotes: string;
}) {
  const milestoneCount = milestones.length;
  const [done, setDone] = React.useState(initialDone);
  const [status, setStatus] = React.useState(initialStatus);
  const [notes, setNotes] = React.useState(initialNotes);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const syncLocal = () => {
      const p = getState().projects[slug];
      if (!p) return;
      setStatus(p.status);
      setDone(Math.min(p.milestonesDone, milestoneCount));
      setNotes(p.notes);
    };
    syncLocal();
    return subscribe(syncLocal);
  }, [slug, milestoneCount]);

  function save(patch: { milestonesDone?: number; status?: 'not_started' | 'in_progress' | 'completed'; notes?: string }) {
    setBusy(true);
    saveProjectProgress(slug, patch);
    setBusy(false);
    if (patch.status === 'completed') toast.success('Project marked completed.');
    else if (patch.milestonesDone !== undefined) toast.success('Milestone saved.');
    else if (patch.notes !== undefined) toast.success('Notes saved.');
  }

  const pct = milestoneCount ? Math.round((Math.min(done, milestoneCount) / milestoneCount) * 100) : 0;
  const fillWidth = `${pct}%`;
  const pctBadge = `chip tnum ${pct === 100 ? 'chip-success' : 'chip-info'}`;

  return (
    <div className="qf-card p-5 mt-6 anim-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-lg">Your project progress</h2>
          <p className="text-[13px] font-semibold text-muted">
            {milestoneCount} milestones · saves locally &amp; syncs automatically
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl border-2 border-border bg-surface-2 p-0.5 gap-0.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  const nextDone = s === 'completed' ? milestoneCount : done;
                  if (s === 'completed') setDone(milestoneCount);
                  save({ status: s, ...(s === 'completed' ? { milestonesDone: milestoneCount } : {}) });
                  void nextDone;
                }}
                className={`px-2.5 py-1 rounded-lg text-[13px] font-extrabold transition-colors ${
                  status === s ? 'bg-accent text-on-accent' : 'text-muted hover:text-foreground'
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="prog-track flex-1">
          <div className="prog-fill" style={{ width: fillWidth }} />
        </div>
        <span className={pctBadge}>{pct}%</span>
      </div>

      <ol className="relative mt-5">
        <div aria-hidden className="absolute left-4 top-5 bottom-5 w-0.5 bg-border" />
        {milestones.map((m, i) => {
          const isDone = i < done;
          const isCurrent = i === done;
          return (
            <li key={i} className="relative flex items-center gap-3 py-1.5">
              <span
                className={`relative z-10 w-8 h-8 rounded-full font-black text-[15px] flex items-center justify-center shrink-0 tnum ${
                  isDone
                    ? 'bg-accent text-on-accent'
                    : isCurrent
                      ? 'border-2 border-accent text-accent bg-surface anim-pulse-ring'
                      : 'border-2 border-border text-faint bg-surface'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <span className={`text-[15px] ${isDone ? 'line-through text-muted' : isCurrent ? 'font-bold' : 'font-semibold text-muted'}`}>
                  {m.title}
                </span>
                {isDone && <CheckCircle2 className="h-4 w-4 text-accent" />}
                {isCurrent && <span className="chip chip-accent">up next</span>}
                <span className="chip tnum ml-auto shrink-0">~{m.estHours}h</span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            const n = Math.min(done + 1, milestoneCount);
            const nextStatus = n >= milestoneCount ? 'completed' : 'in_progress';
            setDone(n);
            setStatus(nextStatus);
            save({ milestonesDone: n, status: nextStatus });
          }}
          disabled={busy || done >= milestoneCount}
          className="btn3d btn3d-sm"
        >
          <Plus className="h-3.5 w-3.5" /> Milestone done
        </button>
        <button
          onClick={() => {
            const n = Math.max(0, done - 1);
            const nextStatus = n === 0 ? 'not_started' : 'in_progress';
            setDone(n);
            setStatus(nextStatus);
            save({ milestonesDone: n, status: nextStatus });
          }}
          disabled={busy || done === 0}
          className="btn3d btn3d-sm btn3d-ghost"
        >
          <Undo2 className="h-3.5 w-3.5" /> Undo
        </button>
        <span className="text-[13px] text-faint inline-flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0" /> Self-logged against the criteria below, be honest with yourself.
        </span>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => save({ notes })}
        rows={3}
        placeholder="Design decisions, benchmarks achieved, open questions… (saved on blur)"
        className="qf-textarea mt-4 text-[15px]"
        aria-label="Project notes"
      />
    </div>
  );
}
