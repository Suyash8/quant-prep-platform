'use client';

import * as React from 'react';
import { Check, CheckCircle2, Flag, Info, Plus, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

export function ProjectTracker({ slug, milestones, initialDone, initialStatus, initialNotes }: {
  slug: string; milestones: { title: string; estHours: number }[]; initialDone: number; initialStatus: string; initialNotes: string;
}) {
  const milestoneCount = milestones.length;
  const [done, setDone] = React.useState(Math.min(initialDone, milestoneCount));
  const [status, setStatus] = React.useState(initialStatus);
  const [notes, setNotes] = React.useState(initialNotes);
  const [busy, setBusy] = React.useState(false);

  async function save(patch: { milestonesDone?: number; status?: string; notes?: string }) {
    setBusy(true);
    try {
      const res = await fetch('/api/projects/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectSlug: slug, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to save.'); return; }
      toast.success('Project progress saved.');
    } catch { toast.error('Network error.'); } finally { setBusy(false); }
  }

  const pct = Math.min(Math.round((done / milestoneCount) * 100), 100);
  const fillWidth = Math.max(pct, 2) + '%';
  const pctBadge = pct >= 100 ? 'chip chip-success anim-pop-in' : 'tnum font-bold text-faint text-sm';

  return (
    <div className="mt-4 qf-card p-5 anim-slide-up">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="section-head mb-0 flex-1 min-w-[14rem]">
          <span className="icon-tile icon-tile-sm icon-tile-accent"><Flag /></span>
          <h2 className="whitespace-nowrap">Tracker</h2>
          <span className="chip chip-accent tnum">{done} of {milestoneCount} milestones</span>
        </div>
        <div className="w-full sm:w-auto">
          <div className="flex rounded-2xl border-2 border-border-strong bg-surface p-1 gap-1" role="radiogroup" aria-label="Project status">
            {[
              { v: 'not_started', label: 'Not started' },
              { v: 'in_progress', label: 'In progress' },
              { v: 'completed', label: 'Completed' },
            ].map(opt => (
              <button
                key={opt.v}
                role="radio"
                aria-checked={status === opt.v}
                disabled={busy}
                onClick={() => { setStatus(opt.v); save({ status: opt.v }); }}
                className={`press rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                  status === opt.v
                    ? 'bg-accent text-white shadow-[0_3px_0_0_var(--accent-deep)]'
                    : 'text-muted hover:bg-surface-2'
                }`}
              >
                {opt.label}
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

      {/* vertical milestone stepper */}
      <ol className="relative mt-5">
        <div aria-hidden className="absolute left-4 top-5 bottom-5 w-0.5 bg-border" />
        {milestones.map((m, i) => {
          const isDone = i < done;
          const isCurrent = i === done;
          return (
            <li key={i} className="relative flex items-center gap-3 py-1.5">
              <span
                className={`relative z-10 w-8 h-8 rounded-full font-black text-sm flex items-center justify-center shrink-0 tnum ${
                  isDone
                    ? 'bg-accent text-white'
                    : isCurrent
                      ? 'border-2 border-accent text-accent bg-surface anim-pulse-ring'
                      : 'border-2 border-border text-faint bg-surface'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <span className={`text-sm ${isDone ? 'line-through text-muted' : isCurrent ? 'font-bold' : 'font-semibold text-muted'}`}>
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
          onClick={() => { const n = Math.min(done + 1, milestoneCount); setDone(n); save({ milestonesDone: n }); }}
          disabled={busy || done >= milestoneCount}
          className="btn3d btn3d-sm"
        ><Plus className="h-3.5 w-3.5" /> Milestone done</button>
        <button
          onClick={() => { const n = Math.max(0, done - 1); setDone(n); save({ milestonesDone: n }); }}
          disabled={busy || done === 0}
          className="btn3d btn3d-sm btn3d-ghost"
        ><Undo2 className="h-3.5 w-3.5" /> Undo</button>
        <span className="text-xs text-faint inline-flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0" /> Self-logged against the criteria below, be honest with yourself.
        </span>
      </div>

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={() => save({ notes })}
        rows={3}
        placeholder="Design decisions, benchmarks achieved, open questions… (saved on blur)"
        className="qf-textarea mt-4 text-sm"
        aria-label="Project notes"
      />
    </div>
  );
}
