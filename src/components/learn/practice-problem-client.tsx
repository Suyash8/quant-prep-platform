'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, ChevronDown, Clock, FileText, GraduationCap,
  Info, Lightbulb, ListChecks, SlidersHorizontal,
} from 'lucide-react';
import { getMapPack, getProblemPack, type ProblemFull } from '@/lib/client/packs';
import { getState, subscribe } from '@/lib/client/local-state';
import { ClientBlock } from '@/components/gamified/player-blocks';
import type { Block } from '@/lib/content';
import { CodeWorkspace } from '@/components/code-workspace';
import { ProblemExamples } from '@/components/problem-examples';
import { ClientMd } from '@/components/gamified/client-md';

function resolveSlug(paramSlug?: string | string[], pathname?: string | null): string {
  if (pathname && pathname.startsWith('/practice/')) {
    const seg = pathname.slice('/practice/'.length).split('/')[0];
    if (seg) return decodeURIComponent(seg);
  }
  return Array.isArray(paramSlug) ? paramSlug[0] ?? '' : paramSlug ?? '';
}

export function PracticeProblemClient() {
  const params = useParams();
  const pathname = usePathname();
  const slug = resolveSlug(params?.slug, pathname);

  const [problem, setProblem] = React.useState<ProblemFull | null>(null);
  const [lessonTitles, setLessonTitles] = React.useState<Record<string, string>>({});
  const [solved, setSolved] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!slug) return;
    setProblem(null);
    setFailed(false);
    getProblemPack(slug)
      .then((p) => setProblem(p))
      .catch(() => setFailed(true));

    getMapPack()
      .then((m) => {
        const titles: Record<string, string> = {};
        for (const l of m.registry.lessons) titles[l.id] = l.title;
        setLessonTitles(titles);
      })
      .catch(() => {});
  }, [slug]);

  React.useEffect(() => {
    if (!slug) return;
    const sync = () => {
      setSolved(getState().problems[slug]?.status === 'passed');
    };
    sync();
    return subscribe(sync);
  }, [slug]);

  if (failed) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="qf-card p-6">
          <h1 className="text-xl font-black">Problem not found</h1>
          <p className="mt-2 text-muted font-semibold">We could not load “{slug}”. It may not be downloaded yet.</p>
          <Link href="/practice" className="btn3d btn3d-sm mt-4">
            <ArrowLeft className="h-4 w-4" /> All problems
          </Link>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 sm:px-5 lg:px-6 py-6 grid xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6">
        <div className="space-y-4">
          <div className="h-48 rounded-2xl bg-surface-2 animate-pulse" />
          <div className="h-40 rounded-2xl bg-surface-2 animate-pulse" />
        </div>
        <div className="h-[520px] rounded-2xl bg-surface-2 animate-pulse" />
      </div>
    );
  }

  const examples = (problem.examples ?? []).slice(0, 3).map((ex) => {
    const row = ex as { input?: string; output?: string; expected?: string };
    return { input: row.input ?? '', output: row.output ?? row.expected ?? '' };
  });

  const timeLimitS = (problem.timeLimitMs / 1000).toFixed(0);
  const solutions = (problem.solutions && !Array.isArray(problem.solutions)
    ? problem.solutions
    : {}) as unknown as Record<string, unknown>;
  const starter = problem.starter ?? {};
  const stubs: Record<string, string> = {};
  if (solutions.cpp || starter.cpp) {
    const starterCpp =
      starter.cpp ||
      `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // TODO: solve - read from stdin, print to stdout\n    return 0;\n}\n`;
    stubs.cpp17 = starterCpp;
    stubs.cpp20 = starterCpp;
  }
  if (solutions.python || starter.python) {
    stubs.python =
      starter.python ||
      `import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    # TODO: solve - parse from data, print answers\n    pass\n\nmain()\n`;
  }

  const relatedLessons = (problem.lessons ?? [])
    .filter((id) => lessonTitles[id])
    .map((id) => ({ id, title: lessonTitles[id] }));
  const difficultyChip =
    problem.difficulty === 'easy'
      ? 'chip chip-success'
      : problem.difficulty === 'medium'
        ? 'chip chip-warning'
        : 'chip chip-danger';

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-5 lg:px-6 xl:grid xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:items-start xl:gap-6">
      <div className="py-4 sm:py-5 lg:py-6 space-y-5">
        <section className="qf-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={difficultyChip}>{problem.difficulty}</span>
            <span className="chip">{problem.category.replace(/-/g, ' ')}</span>
            <span className="chip"><Clock className="h-3 w-3" /> ~{problem.estMinutes}m</span>
            {solved && (
              <span className="chip chip-success">
                <CheckCircle2 className="h-3 w-3" /> solved
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight">{problem.title}</h1>

          <div className="section-head mt-5">
            <span className="icon-tile-sm icon-tile-accent"><FileText strokeWidth={2.5} /></span>
            <h2>Statement</h2>
          </div>
          <article>
            {problem.statement.map((b, i) => <ClientBlock key={i} block={b as Block} />)}
          </article>
          {relatedLessons.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-black uppercase tracking-wide text-faint">Related lessons</span>
              {relatedLessons.map((l) => (
                <Link key={l.id} href={`/learn/${l.id}`} className="chip hover:border-accent">{l.title}</Link>
              ))}
            </div>
          )}
        </section>

        <section className="qf-card p-5 sm:p-6">
          <div className="section-head">
            <span className="icon-tile-sm icon-tile-neutral"><SlidersHorizontal strokeWidth={2.5} /></span>
            <h2>Format &amp; constraints</h2>
          </div>
          <div className="space-y-2.5 rounded-2xl border-2 border-border bg-surface-2 p-4 text-[15px]">
            <p><strong>Input:</strong> <ClientMd text={problem.inputFormat} /></p>
            <p><strong>Output:</strong> <ClientMd text={problem.outputFormat} /></p>
            <div>
              <p className="font-bold">Constraints</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
                {problem.constraints.map((c, i) => <li key={i}><ClientMd text={c} /></li>)}
              </ul>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-faint">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span className="tnum">Time limit {timeLimitS}s · memory {problem.memoryLimitMb} MB</span>
          </p>
        </section>

        <section className="qf-card p-5 sm:p-6">
          <div className="section-head">
            <span className="icon-tile-sm icon-tile-neutral"><ListChecks strokeWidth={2.5} /></span>
            <h2>Examples</h2>
            <span className="chip tnum ml-auto">{examples.length}</span>
          </div>
          <div className="mt-4">
            <ProblemExamples examples={examples} />
          </div>
        </section>

        <details className="qf-card-flat overflow-hidden group">
          <summary className="flex cursor-pointer select-none items-center gap-2.5 px-4 py-2 list-none [&::-webkit-details-marker]:hidden">
            <span className="icon-tile-sm icon-tile-neutral !h-8 !w-8"><Lightbulb className="!h-4 !w-4" strokeWidth={2.5} /></span>
            <span className="text-[15px] font-extrabold">Hints</span>
            <span className="chip tnum ml-auto">{problem.hints.length}</span>
            <ChevronDown className="h-4 w-4 text-faint shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="space-y-2.5 px-4 pb-4 pt-1 text-[15px]">
            {problem.hints.map((h, i) => (
              <li key={i} className="rounded-xl border-2 border-border bg-surface-2 p-3 text-muted"><ClientMd text={h} /></li>
            ))}
          </ul>
        </details>

        <details className="qf-card-flat overflow-hidden group">
          <summary className="flex cursor-pointer select-none items-center gap-2.5 px-4 py-2 list-none [&::-webkit-details-marker]:hidden">
            <span className="icon-tile-sm icon-tile-neutral !h-8 !w-8"><GraduationCap className="!h-4 !w-4" strokeWidth={2.5} /></span>
            <span className="text-[15px] font-extrabold">Editorial</span>
            <span className="ml-auto hidden text-[13px] font-semibold text-faint sm:inline">work the problem yourself first</span>
            <ChevronDown className="h-4 w-4 text-faint shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-2">
            {problem.editorial.map((b, i) => <ClientBlock key={i} block={b as Block} />)}
          </div>
        </details>

        <div className="pb-1">
          <Link href="/practice" className="btn3d btn3d-ghost btn3d-sm">
            <ArrowLeft className="h-4 w-4" /> All problems
          </Link>
        </div>
      </div>

      <div className="pb-10 xl:sticky xl:top-20 xl:py-6 xl:pb-6">
        <CodeWorkspace slug={problem.slug} stubs={stubs} examples={examples} timeLimitMs={problem.timeLimitMs} />
      </div>
    </div>
  );
}
