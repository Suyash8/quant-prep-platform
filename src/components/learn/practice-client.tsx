'use client';

/**
 * v3 practice list: problems come from the content pack, solved/attempted
 * state from the local store. Instant and offline-capable.
 */

import * as React from 'react';
import { CheckCircle2, Code2, FileTerminal, Target } from 'lucide-react';
import { getProblemsIndex } from '@/lib/client/packs';
import { getState, subscribe, hydrate } from '@/lib/client/local-state';
import { PracticeFilters } from '@/components/practice-filters';

export function PracticeClient() {
  const [problems, setProblems] = React.useState<Awaited<ReturnType<typeof getProblemsIndex>> | null>(null);
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    void hydrate();
    getProblemsIndex().then(p => { if (alive) setProblems(p); }).catch(() => setProblems([]));
    const unsub = subscribe(() => setTick(t => t + 1));
    return () => { alive = false; unsub(); };
  }, []);

  if (!problems) {
    return (
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8 animate-pulse" aria-busy="true">
        <div className="h-9 w-64 bg-surface-2 rounded mb-8" />
        <div className="grid gap-3 sm:grid-cols-3 mb-8">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-surface-2 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const s = getState();
  const solvedSlugs = new Set(Object.entries(s.problems).filter(([, p]) => p.status === 'passed').map(([slug]) => slug));
  const attemptedSlugs = new Set(Object.keys(s.problems));

  const solvedCount = solvedSlugs.size;
  const inProgressCount = Math.max(attemptedSlugs.size - solvedCount, 0);
  const solvedPct = problems.length > 0 ? Math.round((solvedCount / problems.length) * 100) : 0;
  const solvedBarWidth = solvedPct + '%';

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero">
        <span className="icon-tile icon-tile-info"><Code2 strokeWidth={2.5} /></span>
        <div>
          <h1>Practice problems</h1>
          <p className="page-sub">
            {problems.length} real-execution problems · {solvedCount} solved · {inProgressCount} in progress
          </p>
        </div>
        <div className="flex-1" />
        <span className="hud-pill hidden sm:inline-flex">
          <CheckCircle2 className="h-4 w-4 text-accent" strokeWidth={2.5} />
          <span className="tnum">{solvedCount} / {problems.length}</span> solved
        </span>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Your practice progress">
        <div className="stat-tile anim-pop-in" style={{ animationDelay: '0ms' }}>
          <span className="icon-tile-sm icon-tile-accent"><CheckCircle2 strokeWidth={2.5} /></span>
          <div className="stat-body">
            <span className="stat-value font-black tnum">
              {solvedCount}<span className="text-base font-extrabold text-muted">/{problems.length}</span>
            </span>
            <span className="stat-label">Solved · {solvedPct}% of the problem set</span>
            <div className="prog-track h-2.5">
              <div className="prog-fill" style={{ width: solvedBarWidth }} />
            </div>
          </div>
        </div>

        <div className="stat-tile anim-pop-in" style={{ animationDelay: '80ms' }}>
          <span className="icon-tile-sm icon-tile-info"><Target strokeWidth={2.5} /></span>
          <div className="stat-body">
            <span className="stat-value font-black tnum">{inProgressCount}</span>
            <span className="stat-label">In progress · attempted, not yet passed</span>
          </div>
        </div>

        <div className="stat-tile anim-pop-in" style={{ animationDelay: '160ms' }}>
          <span className="icon-tile-sm icon-tile-neutral"><FileTerminal strokeWidth={2.5} /></span>
          <div className="stat-body">
            <span className="stat-value font-black tnum">{Object.keys(s.problems).length}</span>
            <span className="stat-label">Submissions · tracked on this device</span>
          </div>
        </div>
      </section>

      <PracticeFilters
        problems={problems.map(p => ({
          slug: p.slug, title: p.title, difficulty: p.difficulty, category: p.category, tags: p.tags, estMinutes: p.estMinutes,
          xp: p.xp ?? 30, summary: p.summary ?? '',
          status: solvedSlugs.has(p.slug) ? 'solved' : attemptedSlugs.has(p.slug) ? 'attempted' : 'new',
        }))}
      />
    </div>
  );
}
