import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getProblem, listProblems } from '@/lib/content';
import { AppShell } from '@/components/app-shell';
import { BlockRenderer } from '@/components/lesson-blocks';
import { CodeWorkspace } from '@/components/code-workspace';
import { ProblemExamples } from '@/components/problem-examples';
import { QMath } from '@/components/quiz';
import { ClosingCta } from '@/components/ui/page-kit';
import {
  ArrowLeft, CheckCircle2, Clock, FileText, GraduationCap, Info, Code2,
  Lightbulb, ListChecks, SlidersHorizontal, Zap, ChevronRight,
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
  if (problem.solutions.cpp) {
    stubs.cpp17 = `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // TODO: solve - read from stdin, print to stdout\n    return 0;\n}\n`;
    stubs.cpp20 = stubs.cpp17;
  }
  if (problem.solutions.python) {
    stubs.python = `import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    # TODO: solve - parse from data, print answers\n    pass\n\nmain()\n`;
  }

  const difficultyChip = problem.difficulty === 'easy' ? 'chip chip-success' : problem.difficulty === 'medium' ? 'chip chip-warning' : 'chip chip-danger';

  // real related problems, same category, not this one
  const related = listProblems().filter(p => p.category === problem.category && p.slug !== slug).slice(0, 3);

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <div className="max-w-6xl mx-auto">
        <div className="p-4 sm:p-5 lg:p-6 space-y-5">
            {/* header row: back, title, chips */}
            <header className="page-hero">
              <span className="icon-tile icon-tile-info"><Code2 strokeWidth={2.5} aria-hidden="true" /></span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-faint mb-0.5">
                  <Link href="/practice" className="hover:text-muted inline-flex items-center gap-1"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All problems</Link>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{problem.category.replace(/-/g, ' ')}</span>
                </div>
                <h1>{problem.title}</h1>
              </div>
              <div className="hidden sm:flex items-center gap-2 ml-auto shrink-0">
                <span className={difficultyChip}>{problem.difficulty}</span>
                <span className="chip"><Clock className="h-3 w-3" aria-hidden="true" /> ~{problem.estMinutes}m</span>
                <span className="chip chip-gold"><Zap className="h-3 w-3" aria-hidden="true" /> +30 XP</span>
                {solved && <span className="chip chip-success"><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> solved</span>}
              </div>
            </header>
            {/* Statement panel */}
            <section className="qf-card p-5 sm:p-6">
              <div className="section-head">
                <span className="icon-tile-sm icon-tile-info"><FileText strokeWidth={2.5} aria-hidden="true" /></span>
                <h2>Statement</h2>
                <span className="chip tnum ml-auto">{problem.tests.length} tests, {visibleTestCount} visible</span>
              </div>
              <article>
                {problem.statement.map((b, i) => <BlockRenderer key={i} block={b} />)}
              </article>
            </section>

            {/* Format & constraints */}
            <section className="qf-card p-5 sm:p-6">
              <div className="section-head">
                <span className="icon-tile-sm icon-tile-violet"><SlidersHorizontal strokeWidth={2.5} /></span>
                <h2>Format &amp; constraints</h2>
              </div>
              <div className="space-y-2.5 rounded-2xl border-2 border-border bg-surface-2 p-4 text-sm">
                <p><strong>Input:</strong> <QMath text={problem.inputFormat} /></p>
                <p><strong>Output:</strong> <QMath text={problem.outputFormat} /></p>
                <div>
                  <p className="font-bold">Constraints</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
                    {problem.constraints.map((c, i) => <li key={i}><QMath text={c} /></li>)}
                  </ul>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-faint">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span className="tnum">Time limit {timeLimitS}s · memory {problem.memoryLimitMb} MB · {problem.tests.length} tests ({visibleTestCount} visible)</span>
              </p>
            </section>

            {/* Examples */}
            <section>
              <div className="section-head">
                <span className="icon-tile-sm icon-tile-accent"><ListChecks strokeWidth={2.5} /></span>
                <h2>Examples</h2>
                <span className="chip tnum ml-auto">{problem.examples.length}</span>
              </div>
              <ProblemExamples examples={problem.examples} />
            </section>

            {/* hints + editorial, side by side so collapsed shells stay compact */}
            <div className="grid sm:grid-cols-2 gap-4">
              <details className="qf-card-flat overflow-hidden">
                <summary className="flex cursor-pointer select-none items-center gap-2.5 px-4 py-3 hover:bg-surface-2/60 transition-colors">
                  <span className="icon-tile-sm icon-tile-gold"><Lightbulb strokeWidth={2.5} aria-hidden="true" /></span>
                  <span className="text-sm font-extrabold">Hints</span>
                  <span className="chip tnum ml-auto">{problem.hints.length}</span>
                </summary>
                <ul className="space-y-2.5 px-4 pb-4 pt-1 text-sm">
                  {problem.hints.map((h, i) => (
                    <li key={i} className="qf-callout qf-callout-warn"><QMath text={h} /></li>
                  ))}
                </ul>
              </details>

              <details className="qf-card-flat overflow-hidden">
                <summary className="flex cursor-pointer select-none items-center gap-2.5 px-4 py-3 hover:bg-surface-2/60 transition-colors">
                  <span className="icon-tile-sm icon-tile-violet"><GraduationCap strokeWidth={2.5} aria-hidden="true" /></span>
                  <span className="text-sm font-extrabold">Editorial</span>
                  <span className="ml-auto hidden text-xs font-semibold text-faint sm:inline">try it yourself first</span>
                </summary>
                <div className="px-4 pb-2">
                  {problem.editorial.map((b, i) => <BlockRenderer key={i} block={b} />)}
                </div>
              </details>
            </div>

            {/* Submissions */}
            {attempts.length > 0 && (
              <section className="qf-card p-5">
                <div className="section-head">
                  <span className="icon-tile-sm icon-tile-info"><Info strokeWidth={2.5} /></span>
                  <h2>Your submissions</h2>
                  <span className="chip tnum ml-auto">{attempts.length}</span>
                </div>
                <ul className="space-y-2 text-xs">
                  {attempts.map(a => (
                    <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
                      <span className="font-semibold text-muted tnum">{new Date(a.createdAt).toLocaleString()} · {a.language}</span>
                      <span className={'chip tnum ' + (a.status === 'passed' ? 'chip-success' : 'chip-danger')}>{a.passedTests}/{a.totalTests}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* related problems + stuck CTA */}
            {related.length > 0 && (
              <section>
                <div className="section-head">
                  <span className="icon-tile-sm icon-tile-info"><ListChecks strokeWidth={2.5} aria-hidden="true" /></span>
                  <h2>Related problems</h2>
                  <span className="chip tnum ml-auto">same category</span>
                </div>
                <div className="space-y-2.5">
                  {related.map(r => (
                    <Link key={r.slug} href={`/practice/${r.slug}`} className="row-card group">
                      <span className="icon-tile-sm icon-tile-info"><Code2 className="h-4 w-4" aria-hidden="true" /></span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold truncate group-hover:text-accent-deep dark:group-hover:text-accent">{r.title}</span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <span className={`chip ${r.difficulty === 'easy' ? 'chip-success' : r.difficulty === 'medium' ? 'chip-warning' : 'chip-danger'}`}>{r.difficulty}</span>
                          <span className="chip tnum"><Clock className="h-3 w-3" aria-hidden="true" /> ~{r.estMinutes}m</span>
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-faint group-hover:text-accent" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <ClosingCta
              icon={Lightbulb}
              tone="warning"
              title="Stuck? The lesson teaches this."
              line="Every problem maps to lessons in the curriculum. Fifteen minutes of reading beats an hour of guessing."
              cta={<Link href="/learn" className="btn3d">Find the matching lesson</Link>}
              ghost={<Link href="/practice" className="btn3d btn3d-ghost">Back to all problems</Link>}
              pose="think"
              className="mb-2"
            />
          </div>

        {/* workspace, full width below the statement, nothing clipped */}
        <div className="px-4 pb-10 sm:px-5 lg:px-6">
          <CodeWorkspace slug={slug} stubs={stubs} examples={examples} timeLimitMs={problem.timeLimitMs} />
        </div>
      </div>
    </AppShell>
  );
}
