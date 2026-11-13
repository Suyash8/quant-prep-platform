'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/** Segmented tab bar for long detail pages. Panels are server-rendered children, one per label. */
export function ProjectTabs({ labels, counts, children }: { labels: string[]; counts?: (number | string)[]; children: React.ReactNode }) {
  const [active, setActive] = React.useState(0);
  const panels = React.Children.toArray(children);
  return (
    <div className="mt-8">
      <div role="tablist" aria-label="Project sections" className="flex flex-wrap gap-2 rounded-2xl border-2 border-border-strong bg-surface p-2 shadow-[0_4px_0_0_var(--shadow-hard)]">
        {labels.map((l, i) => (
          <button
            key={l} type="button" role="tab" id={`pt-tab-${i}`} aria-selected={active === i} aria-controls={`pt-panel-${i}`}
            onClick={() => setActive(i)}
            className={cn(
              'flex-1 min-w-[140px] rounded-xl px-4 py-3 text-[16px] font-extrabold transition-colors',
              active === i ? 'bg-accent text-on-accent shadow-[0_3px_0_0_var(--accent-deep)]' : 'text-muted hover:bg-surface-2',
            )}
          >
            {l}{counts?.[i] !== undefined && <span className="ml-2 tnum text-[13px] opacity-80">{counts[i]}</span>}
          </button>
        ))}
      </div>
      {panels.map((p, i) => (
        <div key={i} role="tabpanel" id={`pt-panel-${i}`} aria-labelledby={`pt-tab-${i}`} hidden={active !== i}>{p}</div>
      ))}
    </div>
  );
}
