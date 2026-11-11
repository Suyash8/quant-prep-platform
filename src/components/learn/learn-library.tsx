'use client';

/**
 * v3.1 lesson library for /learn: all lessons grouped by module, filterable,
 * rendered as row-cards with real status from the local store (offline-first).
 */

import * as React from 'react';
import Link from 'next/link';
import {
  BookOpenCheck, CheckCircle2, ChevronDown, ChevronRight, CircleDot, Clock,
  Library, Search, Target, Zap, Award, Flame,
} from 'lucide-react';
import { getState, subscribe, hydrate, doneSet } from '@/lib/client/local-state';
import { PageHero, StatRow, StatTile, SectionHead, ClosingCta, EmptyState } from '@/components/ui/page-kit';

export interface LibraryLesson {
  id: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
  phaseTitle: string;
  estMinutes: number;
  difficulty: string;
  status: string | null;
  published: boolean;
}

export interface LibraryModule {
  id: string;
  title: string;
  phaseTitle: string;
  lessons: LibraryLesson[];
}

const DIFF_CHIP: Record<string, string> = {
  foundation: 'chip-success',
  core: 'chip-info',
  advanced: 'chip-warning',
  specialist: 'chip-danger',
};

// vary the module tile tone by phase so the long library is not one flat color
const PHASE_TONES = ['accent', 'info', 'violet', 'warning', 'gold', 'danger', 'accent', 'info', 'violet', 'warning', 'gold'];

export function LearnLibrary({ modules, name }: { modules: LibraryModule[]; name: string }) {
  const [q, setQ] = React.useState('');
  const [phase, setPhase] = React.useState('all');
  const [diff, setDiff] = React.useState('all');
  const [open, setOpen] = React.useState<Set<string>>(() => new Set(modules.slice(0, 2).map(m => m.id)));
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    void hydrate();
    const unsub = subscribe(() => { if (alive) setTick(t => t + 1); });
    return () => { alive = false; unsub(); };
  }, []);

  const s = getState();
  const localStatus = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const [id, l] of Object.entries(s.lessons)) m.set(id, l.status);
    return m;
  }, [s]);

  const statusOf = (l: LibraryLesson): string => localStatus.get(l.id) ?? l.status ?? 'not_started';
  const passedIds = React.useMemo(() => {
    const passed = new Set<string>();
    for (const mod of modules) for (const l of mod.lessons) if (['passed', 'mastered'].includes(statusOf(l))) passed.add(l.id);
    return passed;
  }, [modules, localStatus]);

  const phases = React.useMemo(() => {
    const seen: string[] = [];
    for (const m of modules) if (!seen.includes(m.phaseTitle)) seen.push(m.phaseTitle);
    return seen;
  }, [modules]);
  const phaseTone = (phaseTitle: string) => {
    const idx = phases.indexOf(phaseTitle);
    return PHASE_TONES[(idx >= 0 ? idx : 0) % PHASE_TONES.length];
  };

  const allLessons = modules.flatMap(m => m.lessons);
  const passedCount = passedIds.size;
  const inProgressCount = allLessons.filter(l => {
    const st = statusOf(l);
    return st && !['passed', 'mastered', 'not_started'].includes(st);
  }).length;
  const remainingMin = allLessons.filter(l => !passedIds.has(l.id)).reduce((n, l) => n + l.estMinutes, 0);
  const xpAvailable = (allLessons.length - passedCount) * 20; // XP_TABLE.lessonPass

  const filtered = modules
    .map(m => ({
      ...m,
      lessons: m.lessons.filter(l =>
        (phase === 'all' || m.phaseTitle === phase) &&
        (diff === 'all' || l.difficulty === diff) &&
        (q === '' || `${l.title} ${m.title}`.toLowerCase().includes(q.toLowerCase())),
      ),
    }))
    .filter(m => m.lessons.length > 0);

  function toggle(id: string) {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8 space-y-8">
      <PageHero
        icon={Library}
        tone="accent"
        title="All lessons"
        sub={`${allLessons.length} lessons across ${modules.length} modules. Every one is fully authored, offline-capable and about 20 minutes.`}
      />

      <StatRow>
        <StatTile icon={CheckCircle2} tone="accent" value={passedCount} label="Lessons passed" sub={`${masteredOf(modules, localStatus)} mastered`} />
        <StatTile icon={CircleDot} tone="info" value={inProgressCount} label="In progress" sub="attempted, not yet passed" />
        <StatTile icon={Clock} tone="warning" value={`${Math.round(remainingMin / 60)}h`} label="Minutes remaining" sub="core lesson time ahead" />
        <StatTile icon={Zap} tone="gold" value={`+${xpAvailable}`} label="XP available" sub="20 XP per lesson pass" />
      </StatRow>

      {/* filter bar */}
      <div className="qf-card-flat p-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search lessons or modules"
            className="qf-input text-sm"
            style={{ paddingLeft: '2.5rem' }}
            aria-label="Search lessons"
          />
        </div>
        <select value={phase} onChange={e => setPhase(e.target.value)} className="qf-select-sm" aria-label="Phase filter">
          <option value="all">All phases</option>
          {phases.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="qf-segmented" role="group" aria-label="Difficulty filter">
          {[['all', 'All'], ['foundation', 'Foundation'], ['core', 'Core'], ['advanced', 'Advanced'], ['specialist', 'Specialist']].map(([v, label]) => (
            <button key={v} type="button" aria-pressed={diff === v} onClick={() => setDiff(v)}>{label}</button>
          ))}
        </div>
      </div>

      {/* grouped modules */}
      <div className="space-y-4">
        {filtered.map((m, i) => {
          const done = m.lessons.filter(l => passedIds.has(l.id)).length;
          const pct = m.lessons.length ? Math.round((done / m.lessons.length) * 100) : 0;
          const isOpen = open.has(m.id) || q !== '' || phase !== 'all' || diff !== 'all';
          const tone = phaseTone(m.phaseTitle);
          return (
            <section key={m.id} className="qf-card-flat overflow-hidden anim-slide-up" style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }} aria-label={m.title}>
              <button
                type="button"
                onClick={() => toggle(m.id)}
                className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 bg-surface-2/50 hover:bg-surface-2 transition-colors text-left"
                aria-expanded={isOpen}
              >
                {isOpen ? <ChevronDown className="h-4 w-4 text-faint shrink-0" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 text-faint shrink-0" aria-hidden="true" />}
                <span className={`icon-tile-sm icon-tile-${tone}`}><BookOpenCheck className="h-4 w-4" aria-hidden="true" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block font-black text-sm truncate">{m.title}</span>
                  <span className="block text-xs font-semibold text-faint truncate">{m.phaseTitle}</span>
                </span>
                <span className="prog-track hidden sm:block w-28"><span className="prog-fill" style={{ width: `${Math.max(pct, pct === 0 ? 0 : 3)}%` }} /></span>
                <span className={`chip tnum ${pct === 100 ? 'chip-success' : ''}`}>{done}/{m.lessons.length}</span>
              </button>
              {isOpen && (
                <ol className="divide-y">
                  {m.lessons.map(l => <LessonRow key={l.id} l={l} status={statusOf(l)} passed={passedIds.has(l.id)} />)}
                </ol>
              )}
            </section>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            emoji="🔍"
            title="No lessons match those filters"
            line={`${allLessons.length} lessons exist. Clear a filter or two and they come back.`}
            cta={
              <button type="button" className="btn3d btn3d-ghost btn3d-sm" onClick={() => { setQ(''); setPhase('all'); setDiff('all'); }}>
                Clear filters
              </button>
            }
          />
        )}
      </div>

      <ClosingCta
        icon={Flame}
        tone="accent"
        title={`${allLessons.length - passedCount} lessons stand between you and the finish.`}
        line={`About ${Math.round(remainingMin / 60)} hours of core content, 20 XP at a time. The next one is 20 minutes or less.`}
        cta={<Link href={`/learn/${firstUnlocked(modules, passedIds)}`} className="btn3d">Start the next lesson</Link>}
        ghost={<Link href="/curriculum" className="btn3d btn3d-ghost">See the full path</Link>}
        pose="cheer"
      />
    </div>
  );
}

function LessonRow({ l, status, passed }: { l: LibraryLesson; status: string | null; passed: boolean }) {
  const st = status ?? (l.published ? 'not_started' : null);
  const icon = st === 'mastered' ? <Award className="h-5 w-5" aria-hidden="true" />
    : st === 'passed' ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
    : st === 'needs_revision' ? <Target className="h-5 w-5" aria-hidden="true" />
    : <CircleDot className="h-5 w-5" aria-hidden="true" />;
  const tile = st === 'mastered' ? 'icon-tile-gold' : st === 'passed' ? 'icon-tile-accent' : st === 'needs_revision' ? 'icon-tile-danger' : 'icon-tile-info';
  return (
    <li>
      <Link href={`/learn/${l.id}`} className="flex items-center gap-3 px-4 sm:px-5 py-2.5 hover:bg-surface-2/60 transition-colors group">
        <span className={`icon-tile-sm ${tile} shrink-0`}>{icon}</span>
        <span className="flex-1 min-w-0">
          <span className={`block text-sm font-bold truncate ${passed ? 'text-accent-deep dark:text-accent' : 'group-hover:text-accent-deep dark:group-hover:text-accent'}`}>{l.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`chip ${DIFF_CHIP[l.difficulty] ?? ''}`}>{l.difficulty}</span>
            <span className="chip tnum"><Clock className="h-3 w-3" aria-hidden="true" /> {l.estMinutes} min</span>
          </span>
        </span>
        {st === 'needs_revision' && <span className="chip chip-danger shrink-0">revise</span>}
        {st === 'mastered' && <span className="chip chip-gold shrink-0">mastered</span>}
        <ChevronRight className="h-5 w-5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </li>
  );
}

function masteredOf(modules: LibraryModule[], localStatus: Map<string, string>): number {
  let n = 0;
  for (const m of modules) for (const l of m.lessons) {
    const st = localStatus.get(l.id) ?? l.status;
    if (st === 'mastered') n++;
  }
  return n;
}

function firstUnlocked(modules: LibraryModule[], passed: Set<string>): string {
  for (const m of modules) for (const l of m.lessons) {
    if (l.published && !passed.has(l.id)) return l.id;
  }
  return modules[0]?.lessons[0]?.id ?? '/curriculum';
}
