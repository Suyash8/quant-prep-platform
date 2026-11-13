'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';

interface SearchRow {
  id: string; title: string; moduleId: string; moduleTitle: string; phaseTitle: string;
  estMinutes: number; published: boolean; status: string | null;
}

export function CurriculumSearch({ lessons }: { lessons: SearchRow[] }) {
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'published' | 'passed' | 'todo'>('all');
  const results = React.useMemo(() => {
    let rows = lessons;
    if (filter === 'published') rows = rows.filter(l => l.published);
    if (filter === 'passed') rows = rows.filter(l => ['passed', 'mastered'].includes(l.status ?? ''));
    if (filter === 'todo') rows = rows.filter(l => l.published && !['passed', 'mastered'].includes(l.status ?? ''));
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return rows
      .filter(l => `${l.title} ${l.moduleTitle} ${l.phaseTitle}`.toLowerCase().includes(term))
      .slice(0, 30);
  }, [lessons, q, filter]);

  return (
    <div className="mt-6">
      <div className="flex gap-2 max-w-2xl">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search lessons, modules, phases… (e.g. eigenvalue, order book, virtual destructor)"
            className="qf-input h-10 py-0 pl-9 pr-8 text-[15px]"
            aria-label="Search curriculum"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-faint hover:text-muted" aria-label="Clear search">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={filter} onChange={e => setFilter(e.target.value as typeof filter)}
          className="qf-select-sm h-10"
          aria-label="Filter lessons"
        >
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="passed">Passed / mastered</option>
          <option value="todo">Still to do</option>
        </select>
      </div>
      {results.length > 0 && (
        <ul className="mt-3 border rounded-xl bg-surface divide-y max-w-2xl overflow-hidden">
          {results.map(l => (
            <li key={l.id} className="px-4 py-2.5 text-[15px] flex items-center gap-3">
              <span className="text-[12px] text-faint w-24 shrink-0 hidden sm:block">{l.phaseTitle.replace(' , .*', '').slice(0, 22)}</span>
              {l.published ? (
                <Link href={`/learn/${l.id}`} className="flex-1 hover:text-accent">
                  {l.title} <span className="text-[12px] text-faint">· {l.moduleTitle}</span>
                </Link>
              ) : (
                <span className="flex-1 text-faint">{l.title} <span className="text-[12px]">· in development</span></span>
              )}
              {l.status && (
                <span className={`chip ${['passed', 'mastered'].includes(l.status) ? 'chip-success' : l.status === 'needs_revision' ? 'chip-danger' : 'chip-accent'}`}>
                  {l.status.replace('_', ' ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {q && results.length === 0 && <p className="mt-3 text-[15px] text-faint max-w-2xl">No lessons match “{q}”.</p>}
    </div>
  );
}
