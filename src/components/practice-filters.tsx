'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, ChevronRight, CirclePlay, Clock, Dices, Hash, Braces, Repeat, Search, TreePine,
  Network, Layers, Sigma, Cpu, Zap, Server, LineChart, Rocket, RotateCcw, Search as SearchIcon,
} from 'lucide-react';

interface Row {
  slug: string; title: string; difficulty: string; category: string; tags: string[];
  estMinutes: number; status: string; xp: number; summary: string;
}

const CATEGORIES = [
  'all', 'fundamentals', 'arrays-strings', 'hashing', 'recursion', 'binary-search', 'trees', 'graphs',
  'dynamic-programming', 'advanced', 'mathematics', 'probability', 'cpp-internals', 'concurrency',
  'systems-design', 'quant-finance',
];

// per-category icons, visual rhythm instead of 28 identical play buttons


const CATEGORY_ICON: Record<string, typeof CirclePlay> = {
  fundamentals: CirclePlay,
  'arrays-strings': Braces,
  hashing: Hash,
  recursion: Repeat,
  'binary-search': Search,
  trees: TreePine,
  graphs: Network,
  'dynamic-programming': Layers,
  advanced: Rocket,
  mathematics: Sigma,
  probability: Dices,
  'cpp-internals': Cpu,
  concurrency: Zap,
  'systems-design': Server,
  'quant-finance': LineChart,
};

export function PracticeFilters({ problems }: { problems: Row[] }) {
  const router = useRouter();
  const [q, setQ] = React.useState('');
  const [difficulty, setDifficulty] = React.useState('all');
  const [category, setCategory] = React.useState('all');
  const [status, setStatus] = React.useState('all');
  const [showAll, setShowAll] = React.useState(false);

  function surpriseMe() {
    const pool = problems.filter(p => p.status !== 'solved');
    const pick = (pool.length ? pool : problems)[Math.floor(Math.random() * (pool.length || problems.length))];
    if (pick) router.push(`/practice/${pick.slug}`);
  }

  const rows = problems.filter(p =>
    (difficulty === 'all' || p.difficulty === difficulty) &&
    (category === 'all' || p.category === category) &&
    (status === 'all' || p.status === status) &&
    (q === '' || `${p.title} ${p.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  );

  const counts = {
    solved: problems.filter(p => p.status === 'solved').length,
    attempted: problems.filter(p => p.status === 'attempted').length,
  };

  function clearFilters() {
    setQ('');
    setDifficulty('all');
    setCategory('all');
    setStatus('all');
  }

  // group by category when browsing everything, keeps a 28-problem wall scannable


  const grouped = category === 'all';
  const groups: { key: string; rows: Row[] }[] = React.useMemo(() => {
    if (!grouped) return [{ key: category, rows }];
    const order: string[] = [];
    const map = new Map<string, Row[]>();
    for (const p of rows) {
      if (!map.has(p.category)) { map.set(p.category, []); order.push(p.category); }
      map.get(p.category)!.push(p);
    }
    // sort groups: solved-first categories then by count desc


    return order.map(k => ({ key: k, rows: map.get(k)! }))
      .sort((a, b) => {
        const sa = a.rows.filter(r => r.status === 'solved').length / a.rows.length;
        const sb = b.rows.filter(r => r.status === 'solved').length / b.rows.length;
        if (sa !== sb) return sb - sa;
        return b.rows.length - a.rows.length;
      });
  }, [grouped, rows, category]);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search problems or tags…"
            className="qf-input py-2.5 pl-10 text-[15px]" aria-label="Search problems" />
        </div>
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="qf-select-sm w-auto" aria-label="Difficulty">
          <option value="all">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} className="qf-select-sm w-auto" aria-label="Category">
          {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All categories' : c.replace(/-/g, ' ')}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="qf-select-sm w-auto" aria-label="Status">
          <option value="all">Any status</option>
          <option value="solved">Solved ({counts.solved})</option>
          <option value="attempted">Attempted ({counts.attempted})</option>
          <option value="new">Untried</option>
        </select>
        <span className="tnum ml-auto text-[13px] font-bold text-faint hidden sm:block">{rows.length} of {problems.length} shown</span>
        <button onClick={surpriseMe} className="btn3d btn3d-sm ml-auto sm:ml-0 shrink-0">
          <Dices className="h-3.5 w-3.5" /> Surprise me
        </button>
      </div>

      {q === '' && difficulty === 'all' && category === 'all' && status === 'all' && (() => {
        const next = problems.find(p => p.status === 'attempted') ?? problems.find(p => p.status === 'new');
        if (!next) return null;
        const Icon = CATEGORY_ICON[next.category] ?? CirclePlay;
        return (
          <Link href={`/practice/${next.slug}`} className="qf-card mt-5 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4 p-5 sm:p-6 !border-accent !bg-accent-soft/50">
            <span className="icon-tile icon-tile-accent !h-16 !w-16"><Icon strokeWidth={2.5} /></span>
            <span className="min-w-0 w-full sm:w-auto sm:flex-1">
              <span className="block text-[13px] font-black text-accent-deep dark:text-accent">{next.status === 'attempted' ? 'Pick up where you left off' : 'Up next for you'}</span>
              <span className="mt-0.5 block text-2xl font-black leading-tight">{next.title}</span>
              {next.summary && <span className="mt-1 block text-[15px] font-semibold text-muted line-clamp-2">{next.summary}</span>}
              <span className="mt-2 flex flex-wrap items-center gap-2">
                <span className={'chip ' + (next.difficulty === 'easy' ? 'chip-success' : next.difficulty === 'medium' ? 'chip-warning' : 'chip-danger')}>{next.difficulty}</span>
                <span className="inline-flex items-center gap-1 text-[14px] font-bold text-muted tnum"><Clock className="h-3.5 w-3.5" /> about {next.estMinutes} min</span>
                <span className="chip chip-gold"><Zap className="h-3 w-3" /> {next.xp} XP</span>
              </span>
            </span>
            <span className="btn3d">Start problem <ChevronRight className="h-4 w-4" /></span>
          </Link>
        );
      })()}

      <div className="mt-6 space-y-8">
        {(grouped && !showAll && groups.length > 4 && q === '' && difficulty === 'all' && status === 'all' ? groups.slice(0, 4) : groups).map(g => {
          const solvedInGroup = g.rows.filter(r => r.status === 'solved').length;
          const GroupIcon = CATEGORY_ICON[g.key] ?? CirclePlay;
          return (
            <section key={g.key} aria-label={g.key.replace(/-/g, ' ')}>
              {grouped && (
                <div className="flex items-center gap-2.5 mb-2.5 px-1">
                  <span className="icon-tile-sm icon-tile-info"><GroupIcon aria-hidden /></span>
                  <h2 className="text-xl font-black text-foreground capitalize">{g.key.replace(/-/g, ' ')}</h2>
                  <span className="chip tnum">{g.rows.length}</span>
                  <span className="flex-1 h-0.5 rounded-full bg-border" />
                  <span className="text-[12px] font-black text-faint tnum">{solvedInGroup}/{g.rows.length} solved</span>
                </div>
              )}
              <div className="grid gap-3 lg:grid-cols-2">
                {g.rows.map((p, i) => (
                  <ProblemRow key={p.slug} p={p} delay={Math.min(i * 35, 280) + 'ms'} />
                ))}
              </div>
            </section>
          );
        })}

        {grouped && !showAll && groups.length > 4 && q === '' && difficulty === 'all' && status === 'all' && (
          <div className="qf-card flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-[16px] font-bold text-muted">{groups.length - 4} more categories, {groups.slice(4).reduce((a, g) => a + g.rows.length, 0)} more problems</p>
            <button onClick={() => setShowAll(true)} className="btn3d btn3d-ghost">Show all categories ({groups.length})</button>
          </div>
        )}

        {rows.length === 0 && (
          <div className="qf-empty anim-pop-in">
            <span className="empty-emoji" role="img" aria-label="magnifying glass">🔍</span>
            <p className="text-lg font-extrabold">No problems match those filters</p>
            <p className="mx-auto mt-1 max-w-sm text-[15px] font-semibold text-muted">
              Try a different difficulty or category, {problems.length} problems are waiting for you.
            </p>
            <button onClick={clearFilters} className="btn3d btn3d-ghost btn3d-sm mt-5">
              <RotateCcw className="h-4 w-4" /> Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProblemRow({ p, delay }: { p: Row; delay: string }) {
  const tileCls = p.difficulty === 'easy' ? 'icon-tile-accent' : p.difficulty === 'medium' ? 'icon-tile-warning' : 'icon-tile-danger';
  const diffChip = p.difficulty === 'easy' ? 'chip chip-success' : p.difficulty === 'medium' ? 'chip chip-warning' : 'chip chip-danger';
  const RowIcon = CATEGORY_ICON[p.category] ?? CirclePlay;
  const solved = p.status === 'solved';
  const attempted = p.status === 'attempted';
  // status colouring: solved rows get a tint + accent edge, attempted a gold
  // edge, untried stay plain, scannable at a glance, not just via chips

  const edge = solved ? 'before:absolute before:left-0 before:inset-y-0 before:w-1.5 before:bg-accent before:content-["\"] !bg-accent-soft/40'
    : attempted ? 'before:absolute before:left-0 before:inset-y-0 before:w-1.5 before:bg-warning before:content-["\"]'
    : '';
  return (
    <Link
      href={`/practice/${p.slug}`}
      className={`row-card relative overflow-hidden group anim-slide-up ${solved ? '!bg-accent-soft/40' : ''} ${edge}`}
      style={{ animationDelay: delay }}
    >
      {solved ? (
        <span className="icon-tile icon-tile-accent"><CheckCircle2 strokeWidth={2.5} /></span>
      ) : (
        <span className={'icon-tile ' + tileCls + (attempted ? ' relative' : '')}>
          <RowIcon strokeWidth={2.5} />
          {attempted && <span className="absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full border-2 border-surface bg-warning" aria-hidden />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-[15px] font-bold transition-colors ${solved ? 'text-accent-deep dark:text-accent' : 'group-hover:text-accent-deep dark:group-hover:text-accent'}`}>{p.title}</span>
        </span>
        {/* the pitch line fills the middle column instead of dead whitespace */}
        {p.summary && (
          <span className="mt-1 block truncate text-[13px] font-semibold text-muted">{p.summary}</span>
        )}
        <span className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className={diffChip}>{p.difficulty}</span>
          {/* metadata hierarchy: difficulty chip carries the colour, category is
              ghost text, time is plain, one system instead of three chip rows */}
          <span className="hidden sm:inline text-[13px] font-bold text-muted capitalize">{p.category.replace(/-/g, ' ')}</span>
          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-faint tnum"><Clock className="h-3 w-3" /> ~{p.estMinutes}m</span>
        </span>
      </span>
      <span className="chip chip-gold shrink-0 hidden sm:inline-flex"><Zap className="h-3 w-3" /> {p.xp} XP</span>
      {solved ? (
        <span className="chip chip-success shrink-0">solved</span>
      ) : attempted ? (
        <span className="chip chip-warning shrink-0">in progress</span>
      ) : (
        <span className="btn3d btn3d-ghost btn3d-sm !text-[13px] shrink-0 hidden md:inline-flex">Solve</span>
      )}
      <ChevronRight className="h-5 w-5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
    </Link>
  );
}
