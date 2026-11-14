import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getProblem, getLessonById } from '@/lib/content';
import { AppShell } from '@/components/app-shell';
import { BlockRenderer } from '@/components/lesson-blocks';
import { CodeWorkspace } from '@/components/code-workspace';
import { ProblemExamples } from '@/components/problem-examples';
import { QMath } from '@/components/quiz';
import {
  ArrowLeft, CheckCircle2, ChevronDown, Clock, FileText, GraduationCap, Info,
  Lightbulb, ListChecks, SlidersHorizontal,
} from 'lucide-react';

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/practice/${slug}`);

  const problem = getProblem(slug);
  if (!problem) notFound();

  const attempts = await db.problemAttempt.findMany({
    where: { userId: user.id, problemSlug: slug },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });
  const solved = attempts.some(a => a.status === 'passed');

  const visibleTests = problem.tests.filter(t => !t.hidden).slice(0, 2);
  const examples = (visibleTests.length ? visibleTests : problem.tests.slice(0, 2)).map(t => ({ input: t.input, output: t.expected }));
  const visibleTestCount = problem.tests.filter(t => !t.hidden).length;
  const timeLimitS = (problem.timeLimitMs / 1000).toFixed(0);

  const stubs: Record<string, string> = {};
  const probAny = problem as Record<string, any>;
  if (problem.solutions?.cpp || probAny.starter?.cpp) {
    const starterCpp = probAny.starter?.cpp || `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // TODO: solve - read from stdin, print to stdout\n    return 0;\n}\n`;
    stubs.cpp17 = starterCpp;
    stubs.cpp20 = starterCpp;
  }
  if (problem.solutions?.python || probAny.starter?.python) {
    stubs.python = probAny.starter?.python || `import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    # TODO: solve - parse from data, print answers\n    pass\n\nmain()\n`;
  }

  // Only lessons that exist: an unresolved id is dropped, never shown as a dead link.
  const relatedLessons = (problem.lessons ?? []).map(id => getLessonById(id)?.lesson).filter((l): l is NonNullable<ReturnType<typeof getLessonById>>['lesson'] => !!l);
  const difficultyChip = problem.difficulty === 'easy' ? 'chip chip-success' : problem.difficulty === 'medium' ? 'chip chip-warning' : 'chip chip-danger';

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <div className="mx-auto max-w-[1600px] px-4 sm:px-5 lg:px-6 xl:grid xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:items-start xl:gap-6">
        <div className="py-4 sm:py-5 lg:py-6 space-y-5">
            {/* Statement panel */}
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
                {problem.statement.map((b, i) => <BlockRenderer key={i} block={b} />)}
              </article>
              {relatedLessons.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-black uppercase tracking-wide text-faint">Related lessons</span>
                  {relatedLessons.map(l => (
                    <Link key={l.id} href={`/learn/${l.id}`} className="chip hover:border-accent">{l.title}</Link>
                  ))}
                </div>
              )}
            </section>

            {/* Format & constraints */}
            <section className="qf-card p-5 sm:p-6">
              <div className="section-head">
                <span className="icon-tile-sm icon-tile-neutral"><SlidersHorizontal strokeWidth={2.5} /></span>
                <h2>Format &amp; constraints</h2>
              </div>
              <div className="space-y-2.5 rounded-2xl border-2 border-border bg-surface-2 p-4 text-[15px]">
                <p><strong>Input:</strong> <QMath text={problem.inputFormat} /></p>
                <p><strong>Output:</strong> <QMath text={problem.outputFormat} /></p>
                <div>
                  <p className="font-bold">Constraints</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
                    {problem.constraints.map((c, i) => <li key={i}><QMath text={c} /></li>)}
                  </ul>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-faint">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span className="tnum">Time limit {timeLimitS}s · memory {problem.memoryLimitMb} MB · {problem.tests.length} tests ({visibleTestCount} visible)</span>
              </p>
            </section>

            {/* Examples: same card treatment as Statement / Format */}
            <section className="qf-card p-5 sm:p-6">
              <div className="section-head">
                <span className="icon-tile-sm icon-tile-neutral"><ListChecks strokeWidth={2.5} /></span>
                <h2>Examples</h2>
                <span className="chip tnum ml-auto">{problem.examples.length}</span>
              </div>
              <div className="mt-4">
                <ProblemExamples examples={problem.examples} />
              </div>
            </section>

            {/* Hints: compact disclosure row */}
            <details className="qf-card-flat overflow-hidden group">
              <summary className="flex cursor-pointer select-none items-center gap-2.5 px-4 py-2 list-none [&::-webkit-details-marker]:hidden">
                <span className="icon-tile-sm icon-tile-neutral !h-8 !w-8"><Lightbulb className="!h-4 !w-4" strokeWidth={2.5} /></span>
                <span className="text-[15px] font-extrabold">Hints</span>
                <span className="chip tnum ml-auto">{problem.hints.length}</span>
                <ChevronDown className="h-4 w-4 text-faint shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="space-y-2.5 px-4 pb-4 pt-1 text-[15px]">
                {problem.hints.map((h, i) => (
                  <li key={i} className="rounded-xl border-2 border-border bg-surface-2 p-3 text-muted"><QMath text={h} /></li>
                ))}
              </ul>
            </details>

            {/* Editorial: compact disclosure row */}
            <details className="qf-card-flat overflow-hidden group">
              <summary className="flex cursor-pointer select-none items-center gap-2.5 px-4 py-2 list-none [&::-webkit-details-marker]:hidden">
                <span className="icon-tile-sm icon-tile-neutral !h-8 !w-8"><GraduationCap className="!h-4 !w-4" strokeWidth={2.5} /></span>
                <span className="text-[15px] font-extrabold">Editorial</span>
                <span className="ml-auto hidden text-[13px] font-semibold text-faint sm:inline">work the problem yourself first</span>
                <ChevronDown className="h-4 w-4 text-faint shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-2">
                {problem.editorial.map((b, i) => <BlockRenderer key={i} block={b} />)}
              </div>
            </details>

            {/* Submissions */}
            {attempts.length > 0 && (
              <section className="qf-card p-5">
                <div className="section-head">
                  <span className="icon-tile-sm icon-tile-neutral"><Info strokeWidth={2.5} /></span>
                  <h2>Your submissions</h2>
                  <span className="chip tnum ml-auto">{attempts.length}</span>
                </div>
                <ul className="space-y-2 text-[13px]">
                  {attempts.map(a => (
                    <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
                      <span className="font-semibold text-muted tnum">{new Date(a.createdAt).toLocaleString()} · {a.language}</span>
                      <span className={'chip tnum ' + (a.status === 'passed' ? 'chip-success' : 'chip-danger')}>{a.language === 'synced' ? (a.status === 'passed' ? 'passed offline' : 'attempted offline') : `${a.passedTests}/${a.totalTests}`}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="pb-1">
              <Link href="/practice" className="btn3d btn3d-ghost btn3d-sm">
                <ArrowLeft className="h-4 w-4" /> All problems
              </Link>
            </div>
          </div>

        {/* workspace, full width below the statement, nothing clipped */}
        <div className="pb-10 xl:sticky xl:top-20 xl:py-6 xl:pb-6">
          <CodeWorkspace slug={slug} stubs={stubs} examples={examples} timeLimitMs={problem.timeLimitMs} />
        </div>
      </div>
    </AppShell>
  );
}
