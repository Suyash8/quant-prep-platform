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
  estMinutes: number; status: string;
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
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search problems or tags"
            className="qf-input py-2.5 text-sm" style={{ paddingLeft: '2.5rem' }} aria-label="Search problems" />
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
        <span className="tnum ml-auto text-xs font-bold text-faint hidden sm:block">{rows.length} shown</span>
        <button onClick={surpriseMe} className="btn3d btn3d-gold btn3d-sm ml-auto sm:ml-0 shrink-0">
          <Dices className="h-3.5 w-3.5" /> Surprise me
        </button>
      </div>

      <div className="mt-4 space-y-5">
        {groups.map(g => {
          const solvedInGroup = g.rows.filter(r => r.status === 'solved').length;
          return (
            <section key={g.key} aria-label={g.key.replace(/-/g, ' ')}>
              {grouped && (
                <div className="flex items-center gap-2.5 mb-2.5 px-1">
                  <h2 className="text-xs font-black uppercase tracking-[0.12em] text-faint capitalize">{g.key.replace(/-/g, ' ')}</h2>
                  <span className="flex-1 h-0.5 rounded-full bg-border" />
                  <span className="text-[11px] font-black text-faint tnum">{solvedInGroup}/{g.rows.length} solved</span>
                </div>
              )}
              <div className="space-y-2.5">
                {g.rows.map((p, i) => (
                  <ProblemRow key={p.slug} p={p} delay={Math.min(i * 35, 280) + 'ms'} />
                ))}
              </div>
            </section>
          );
        })}

        {rows.length === 0 && (
          <div className="qf-empty anim-pop-in">
            <span className="empty-emoji" role="img" aria-label="magnifying glass">🔍</span>
            <p className="text-lg font-extrabold">No problems match those filters</p>
            <p className="mx-auto mt-1 max-w-sm text-sm font-semibold text-muted">
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
  const tileCls = p.difficulty === 'easy' ? 'icon-tile-accent' : p.difficulty === 'medium' ? 'icon-tile-gold' : 'icon-tile-danger';
  const diffChip = p.difficulty === 'easy' ? 'chip chip-success' : p.difficulty === 'medium' ? 'chip chip-warning' : 'chip chip-danger';
  const RowIcon = CATEGORY_ICON[p.category] ?? CirclePlay;
  const solved = p.status === 'solved';
  const attempted = p.status === 'attempted';
  return (
    <Link href={`/practice/${p.slug}`} className={`row-card group anim-slide-up ${solved ? 'bg-accent-soft/30' : ''}`} style={{ animationDelay: delay }}>
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
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={diffChip}>{p.difficulty}</span>
          <span className="chip hidden sm:inline-flex capitalize">{p.category.replace(/-/g, ' ')}</span>
          <span className="chip"><Clock className="h-3 w-3" /> ~{p.estMinutes}m</span>
        </span>
      </span>
      <span className={solved ? 'hidden' : 'chip chip-gold shrink-0 hidden sm:inline-flex'}><Zap className="h-3 w-3" aria-hidden="true" /> +30 XP</span>
      {solved ? (
        <span className="chip chip-success shrink-0">solved</span>
      ) : attempted ? (
        <span className="chip chip-warning shrink-0">in progress</span>
      ) : (
        <span className="btn3d btn3d-ghost btn3d-sm shrink-0 hidden md:inline-flex">Solve</span>
      )}
      <ChevronRight className="h-5 w-5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
    </Link>
  );
}
