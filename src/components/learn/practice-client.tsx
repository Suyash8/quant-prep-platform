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
          <div className="flex items-center gap-2.5">
            <span className="icon-tile-sm icon-tile-info"><CheckCircle2 strokeWidth={2.5} /></span>
            <span className="stat-label">Solved</span>
          </div>
          <p className="mt-2.5 stat-value font-black tnum">
            {solvedCount}<span className="text-base font-extrabold text-muted">/{problems.length}</span>
          </p>
          <div className="prog-track mt-2.5 h-2.5">
            <div className="prog-fill" style={{ width: solvedBarWidth }} />
          </div>
          <p className="mt-2 stat-label tnum">{solvedPct}% of the problem set</p>
        </div>

        <div className="stat-tile anim-pop-in" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center gap-2.5">
            <span className="icon-tile-sm icon-tile-accent"><Target strokeWidth={2.5} /></span>
            <span className="stat-label">In progress</span>
          </div>
          <p className="mt-2.5 stat-value font-black tnum">{inProgressCount}</p>
          <p className="mt-2 stat-label">attempted, not yet passed</p>
        </div>

        <div className="stat-tile anim-pop-in" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center gap-2.5">
            <span className="icon-tile-sm icon-tile-gold"><FileTerminal strokeWidth={2.5} /></span>
            <span className="stat-label">Submissions</span>
          </div>
          <p className="mt-2.5 stat-value font-black tnum">{Object.keys(s.problems).length}</p>
          <p className="mt-2 stat-label">tracked on this device</p>
        </div>
      </section>

      <PracticeFilters
        problems={problems.map(p => ({
          slug: p.slug, title: p.title, difficulty: p.difficulty, category: p.category, tags: p.tags, estMinutes: p.estMinutes,
          status: solvedSlugs.has(p.slug) ? 'solved' : attemptedSlugs.has(p.slug) ? 'attempted' : 'new',
        }))}
      />
    </div>
  );
}
