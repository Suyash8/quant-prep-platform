'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, ChevronDown, Clock, FileText, Flag, GraduationCap,
  Info, Lightbulb, ListChecks, Lock, SlidersHorizontal, Sparkles,
} from 'lucide-react';
import { getMapPack, getProblemPack, type ProblemFull } from '@/lib/client/packs';
import { getState, subscribe } from '@/lib/client/local-state';
import { can } from '@/lib/entitlements';
import { ClientBlock } from '@/components/gamified/player-blocks';
import type { Block } from '@/lib/content';
import { CodeWorkspace } from '@/components/code-workspace';
import { ProblemExamples } from '@/components/problem-examples';
import { ClientMd } from '@/components/gamified/client-md';
import { toast } from 'sonner';

function formatCategory(cat: string): string {
  const lower = cat.toLowerCase();
  if (lower === 'dsa') return 'DSA';
  if (lower === 'dp') return 'DP';
  if (lower === 'cpp' || lower === 'c++') return 'C++';
  return cat.replace(/-/g, ' ');
}

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
  const [userPlan, setUserPlan] = React.useState<{ plan?: string | null; role?: string | null } | null>(null);
  const [planChecked, setPlanChecked] = React.useState(false);
  const [unlockedAnswers, setUnlockedAnswers] = React.useState<{ editorial?: Block[]; solutions?: Record<string, string> } | null>(null);
  const [revealing, setRevealing] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState<'incorrect' | 'typo' | 'unclear' | 'broken_math' | 'other'>('unclear');
  const [reportComment, setReportComment] = React.useState('');
  const [reportBusy, setReportBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => {
        if (!alive) return;
        setUserPlan(d.user ? { plan: d.user.plan, role: d.user.role } : null);
        setPlanChecked(true);
      })
      .catch(() => { if (alive) setPlanChecked(true); });
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    if (!slug) return;
    setProblem(null);
    setFailed(false);
    setUnlockedAnswers(null);
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

  // Load editorial/solutions when solved or already revealed on server
  React.useEffect(() => {
    if (!slug || !problem) return;
    let alive = true;
    fetch(`/api/packs/answers/problem/${encodeURIComponent(slug)}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.editorial) setUnlockedAnswers(d);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [slug, problem, solved]);

  async function revealEditorial() {
    if (!slug) return;
    setRevealing(true);
    try {
      const res = await fetch(`/api/packs/answers/problem/${encodeURIComponent(slug)}`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Sign in first to unlock solutions.');
        return;
      }
      setUnlockedAnswers(data);
      toast.info('Editorial and reference solutions unlocked.');
    } catch {
      toast.error('Offline — reconnect to fetch the reference editorial.');
    } finally {
      setRevealing(false);
    }
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setReportBusy(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemSlug: slug, reason: reportReason, comment: reportComment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? 'Could not submit report.'); return; }
      toast.success('Thanks — problem report logged.');
      setReportOpen(false);
      setReportComment('');
    } catch {
      toast.error('Offline — try submitting when back online.');
    } finally {
      setReportBusy(false);
    }
  }

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
  const starter = problem.starter ?? {};
  const stubs: Record<string, string> = {};
  const starterCpp =
    starter.cpp ||
    `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // TODO: solve - read from stdin, print to stdout\n    return 0;\n}\n`;
  stubs.cpp17 = starterCpp;
  stubs.cpp20 = starterCpp;
  stubs.python =
    starter.python ||
    `import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    # TODO: solve - parse from data, print answers\n    pass\n\nmain()\n`;

  const hasProblemAccess = !planChecked || can(userPlan, 'problem', { slug });

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
        {!hasProblemAccess && (
          <section className="qf-card border-warning/50 bg-warning-soft/50 p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="icon-tile-sm icon-tile-gold shrink-0"><Lock className="h-4 w-4" /></span>
              <div>
                <p className="font-black text-[15px]">Pro coding problem</p>
                <p className="text-[13px] font-semibold text-muted">
                  Free includes 10 starter problems. Upgrade to Pro to run and grade all 75+ problems on our judge.
                </p>
              </div>
            </div>
            <Link href="/pricing" className="btn3d btn3d-sm shrink-0">
              <Sparkles className="h-3.5 w-3.5" /> Upgrade to Pro
            </Link>
          </section>
        )}

        <section className="qf-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={difficultyChip}>{problem.difficulty}</span>
            <span className="chip">{formatCategory(problem.category)}</span>
            <span className="chip"><Clock className="h-3 w-3" /> ~{problem.estMinutes}m</span>
            {solved && (
              <span className="chip chip-success">
                <CheckCircle2 className="h-3 w-3" /> solved
              </span>
            )}
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-faint hover:text-muted"
              title="Report an issue with this problem"
            >
              <Flag className="h-3.5 w-3.5" /> Report issue
            </button>
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
            <span className="text-[15px] font-extrabold">Editorial &amp; solutions</span>
            <span className="ml-auto hidden text-[13px] font-semibold text-faint sm:inline">
              {unlockedAnswers ? 'unlocked' : 'work the problem yourself first'}
            </span>
            <ChevronDown className="h-4 w-4 text-faint shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4 pt-1">
            {unlockedAnswers?.editorial ? (
              <div className="space-y-4">
                <div>{unlockedAnswers.editorial.map((b, i) => <ClientBlock key={i} block={b} />)}</div>
                {unlockedAnswers.solutions && Object.entries(unlockedAnswers.solutions).map(([lang, src]) => (
                  <div key={lang}>
                    <p className="text-[12px] font-black uppercase tracking-wide text-faint mb-1">{lang}</p>
                    <pre className="code-block overflow-x-auto"><code>{String(src)}</code></pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border-strong p-4 text-center space-y-2.5">
                <p className="text-[14px] font-semibold text-muted">
                  The editorial and reference code unlock automatically once your solution passes all tests — or you can reveal them explicitly.
                </p>
                <button
                  type="button"
                  onClick={() => void revealEditorial()}
                  disabled={revealing || !hasProblemAccess}
                  className="btn3d btn3d-ghost btn3d-sm"
                >
                  <Lock className="h-3.5 w-3.5" />
                  {revealing ? 'Unlocking…' : 'Give up & reveal editorial'}
                </button>
              </div>
            )}
          </div>
        </details>

        {reportOpen && (
          <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Report problem issue">
            <form onSubmit={submitReport} className="qf-card max-w-md w-full p-6 space-y-4">
              <h2 className="text-lg font-extrabold">Report an issue · {problem.title}</h2>
              <div>
                <label htmlFor="prob-report-reason" className="block text-[13px] font-bold mb-1">Issue type</label>
                <select
                  id="prob-report-reason"
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value as typeof reportReason)}
                  className="qf-select w-full"
                >
                  <option value="incorrect">Incorrect test or statement</option>
                  <option value="broken_math">Broken formula or formatting</option>
                  <option value="unclear">Unclear constraint or example</option>
                  <option value="typo">Typo</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="prob-report-comment" className="block text-[13px] font-bold mb-1">Details</label>
                <textarea
                  id="prob-report-comment"
                  rows={3}
                  value={reportComment}
                  onChange={e => setReportComment(e.target.value)}
                  className="qf-textarea w-full"
                  placeholder="Describe what seems wrong…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setReportOpen(false)} className="btn3d btn3d-ghost">Cancel</button>
                <button type="submit" disabled={reportBusy} className="btn3d">{reportBusy ? 'Sending…' : 'Send report'}</button>
              </div>
            </form>
          </div>
        )}

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
