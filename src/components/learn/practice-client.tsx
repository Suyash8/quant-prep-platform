'use client';

/**
 * v3 practice list: problems come from the content pack, solved/attempted
 * state from the local store. Instant and offline-capable.
 */

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Code2, FileTerminal, Target, Cpu, FlaskConical, Dices } from 'lucide-react';
import { getProblemsIndex } from '@/lib/client/packs';
import { getState, subscribe, hydrate } from '@/lib/client/local-state';
import { PracticeFilters } from '@/components/practice-filters';
import { SectionHead, ClosingCta } from '@/components/ui/page-kit';
import { Mascot } from '@/components/brand/mascot';

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
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-8" aria-busy="true">
        <div className="page-hero">
          <div className="skeleton w-14 h-14" />
          <div className="space-y-2"><div className="skeleton h-7 w-56" /><div className="skeleton h-4 w-72" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="stat-tile"><div className="skeleton h-8 w-24 mb-2" /><div className="skeleton h-3.5 w-20" /></div>)}
        </div>
        <div className="space-y-2.5">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
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
  const recommended = problems.find(p => solvedSlugs.has(p.slug) ? false : true) ?? problems[0];

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

      <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Your practice progress">
        <div className="stat-tile anim-pop-in">
          <span className="icon-tile-sm icon-tile-info"><CheckCircle2 strokeWidth={2.5} aria-hidden="true" /></span>
          <div className="stat-value font-black tnum">
            {solvedCount}<span className="text-base font-extrabold text-muted">/{problems.length}</span>
          </div>
          <div className="stat-label">Solved</div>
          <div className="prog-track mt-2 h-2">
            <div className="prog-fill" style={{ width: solvedBarWidth }} />
          </div>
          <div className="stat-sub tnum">{solvedPct}% of the problem set</div>
        </div>

        <div className="stat-tile anim-pop-in" style={{ animationDelay: '80ms' }}>
          <span className="icon-tile-sm icon-tile-accent"><Target strokeWidth={2.5} aria-hidden="true" /></span>
          <div className="stat-value font-black tnum">{inProgressCount}</div>
          <div className="stat-label">In progress</div>
          <div className="stat-sub">attempted, not yet passed</div>
        </div>

        <div className="stat-tile anim-pop-in" style={{ animationDelay: '160ms' }}>
          <span className="icon-tile-sm icon-tile-gold"><FileTerminal strokeWidth={2.5} aria-hidden="true" /></span>
          <div className="stat-value font-black tnum">{Object.keys(s.problems).length}</div>
          <div className="stat-label">Submissions</div>
          <div className="stat-sub">tracked on this device</div>
        </div>
      </section>

      {/* recommended next + language support */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        {recommended && (
          <div className="qf-card p-5 flex items-center gap-4 flex-wrap">
            <span className="icon-tile icon-tile-gold"><Dices className="h-5 w-5" aria-hidden="true" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-faint">Recommended next</p>
              <p className="mt-0.5 text-base font-black tracking-tight truncate">{recommended.title}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className={`chip ${recommended.difficulty === 'easy' ? 'chip-success' : recommended.difficulty === 'medium' ? 'chip-warning' : 'chip-danger'}`}>{recommended.difficulty}</span>
                <span className="chip tnum"><Code2 className="h-3 w-3" aria-hidden="true" /> ~{recommended.estMinutes} min</span>
                <span className="chip chip-gold"><FlaskConical className="h-3 w-3" aria-hidden="true" /> +30 XP</span>
              </div>
            </div>
            <Link href={`/practice/${recommended.slug}`} className="btn3d">Open problem</Link>
          </div>
        )}
        <div className="qf-card-flat p-5">
          <div className="section-head">
            <span className="icon-tile-sm icon-tile-info"><Cpu className="h-4 w-4" aria-hidden="true" /></span>
            <h2>Language support</h2>
          </div>
          <p className="text-sm font-semibold text-muted leading-relaxed">
            C++17, C++20 and Python 3, compiled and executed in a sandboxed runner with CPU, memory and output limits.
          </p>
        </div>
      </section>

      <PracticeFilters
        problems={problems.map(p => ({
          slug: p.slug, title: p.title, difficulty: p.difficulty, category: p.category, tags: p.tags, estMinutes: p.estMinutes,
          status: solvedSlugs.has(p.slug) ? 'solved' : attemptedSlugs.has(p.slug) ? 'attempted' : 'new',
        }))}
      />

      <section className="mt-8">
        <ClosingCta
          icon={Code2}
          tone="accent"
          title={`${problems.length - solvedCount} problems are still yours.`}
          line="Each solve is 30 XP and a story for the interview. The easiest one takes about 10 minutes."
          cta={recommended ? <Link href={`/practice/${recommended.slug}`} className="btn3d">Open the next problem</Link> : undefined}
          ghost={<Link href="/diagnostic" className="btn3d btn3d-ghost">Not sure where to start?</Link>}
          pose="think"
        />
      </section>
    </div>
  );
}
