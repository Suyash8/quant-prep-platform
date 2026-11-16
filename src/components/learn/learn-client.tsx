'use client';

/**
 * v3 lesson page: renders entirely from the local content pack + local
 * progress store. First visit fetches the pack (cached by the service worker
 * forever); every later visit, and full offline use, is instant.
 */

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Clock, Target, AlertTriangle, Building2, TrendingUp, Layers, ArrowLeft, Code2, ChevronRight, Lock, Sparkles, CheckCircle2, X,
} from 'lucide-react';
import type { CurriculumMap, Lesson } from '@/lib/content';
import { can } from '@/lib/entitlements';
import { sanitizedForClient } from '@/lib/grading';
import { buildLessonCards } from '@/lib/lesson-cards';
import { buildCurriculumGraph, isUnlockedInGraph, type CurriculumGraph } from '@/lib/curriculum-graph';
import { getLessonPack, getMapPack, getProblemsIndex, prefetchLesson, type ProblemLite } from '@/lib/client/packs';
import { applyPlacementLocal, doneSet, subscribe, lessonProgressOf } from '@/lib/client/local-state';
import { getLessonPosition, saveLessonPosition } from '@/lib/client/idb';
import { LessonPlayer } from '@/components/gamified/lesson-player';
import { ClientBlock } from '@/components/gamified/player-blocks';
import { Quiz, QMath, type SafeQuestion } from '@/components/quiz';
import { ExerciseCard, MasteryBanner } from '@/components/lesson-tools';
import { toast } from 'sonner';

interface Loaded {
  lesson: Lesson;
  graph: CurriculumGraph;
  phaseId: string;
  phaseTitle: string;
  moduleTitle: string;
  moduleId: string;
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  prereqs: { id: string; title: string }[];
  relatedProblems: ProblemLite[];
}

function currentLessonId(): string {
  if (typeof window === 'undefined') return '';
  const m = window.location.pathname.match(/^\/learn\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export function LearnClient({ initialLessonId }: { initialLessonId?: string }) {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const [lessonId, setLessonId] = React.useState(initialLessonId ?? '');
  const [data, setData] = React.useState<Loaded | null>(null);
  const [missing, setMissing] = React.useState(false);
  const [, setProgressTick] = React.useState(0);
  const [userPlan, setUserPlan] = React.useState<{ plan?: string | null; role?: string | null } | null>(null);
  const [planChecked, setPlanChecked] = React.useState(false);
  const [quizAnswers, setQuizAnswers] = React.useState<Record<string, { answerIndex?: number; answerIndices?: number[]; answer?: string | number; modelAnswer?: string; explanation?: string }> | null>(null);
  const [testOutOpen, setTestOutOpen] = React.useState(false);
  const [testOutLoading, setTestOutLoading] = React.useState(false);
  const [testOutData, setTestOutData] = React.useState<{ moduleTitle: string; passThreshold: number; questions: SafeQuestion[] } | null>(null);
  const [testOutAnswers, setTestOutAnswers] = React.useState<Record<string, string | string[]>>({});
  const [testOutSubmitting, setTestOutSubmitting] = React.useState(false);
  const [testOutResult, setTestOutResult] = React.useState<{ passed: boolean; pct: number; correct: number; total: number } | null>(null);

  React.useEffect(() => {
    let alive = true;
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => {
        if (!alive) return;
        setUserPlan(d.user ? { plan: d.user.plan, role: d.user.role } : null);
        setPlanChecked(true);
      })
      .catch(() => {
        if (alive) setPlanChecked(true);
      });
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    const id = currentLessonId();
    if (id && id !== lessonId) { setLessonId(id); return; }
    if (!id) return;
    let alive = true;
    setData(null);
    setMissing(false);
    (async () => {
      try {
        const [lesson, { map, registry }, problemIndex] = await Promise.all([
          getLessonPack(lessonId),
          getMapPack(),
          getProblemsIndex().catch(() => [] as ProblemLite[]),
        ]);
        if (!alive) return;
        const graph = buildCurriculumGraph(map as CurriculumMap, registry.lessons ?? []);
        const node = graph.byId.get(lessonId);
        if (!node) { setMissing(true); return; }
        const mod = (map as CurriculumMap).phases.flatMap(p => p.modules).find(m => m.id === lesson.moduleId)!;
        const phase = (map as CurriculumMap).phases.find(p => p.modules.includes(mod))!;
        const idx = mod.lessons.findIndex(l => l.id === lessonId);
        const next = idx < mod.lessons.length - 1 ? mod.lessons[idx + 1] : null;
        const prev = idx > 0 ? mod.lessons[idx - 1] : null;
        const skillSet = new Set(lesson.skills.map(s => s.toLowerCase()));
        const relatedProblems = problemIndex
          .map((p) => {
            let hits = 0;
            if (skillSet.has(p.category.toLowerCase())) hits += 2;
            for (const tag of p.tags) {
              if (skillSet.has(tag.toLowerCase())) hits += 2;
            }
            return { p, hits };
          })
          .filter((x) => x.hits >= 2)
          .sort((a, b) => b.hits - a.hits || a.p.title.localeCompare(b.p.title))
          .slice(0, 3)
          .map((x) => x.p);
        setData({
          lesson,
          graph,
          phaseId: phase.id,
          phaseTitle: phase.title,
          moduleTitle: mod.title,
          moduleId: mod.id,
          prev: prev ? { id: prev.id, title: prev.title } : null,
          next: next ? { id: next.id, title: next.title } : null,
          prereqs: node.prereqs.map(p => ({ id: p, title: graph.byId.get(p)?.title ?? p })),
          relatedProblems,
        });
        if (next) prefetchLesson(next.id);
      } catch {
        if (alive) setMissing(true);
      }
    })();
    return () => { alive = false; };
  }, [lessonId]);

  React.useEffect(() => {
    if (mode !== 'reference' || !data) return;
    let restored = false;
    getLessonPosition(lessonId).then((pos) => {
      if (!restored && pos && pos.scrollY > 120) {
        restored = true;
        window.scrollTo({ top: pos.scrollY, behavior: 'auto' });
      }
    }).catch(() => {});
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void saveLessonPosition(lessonId, 0, window.scrollY);
      }, 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      restored = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [mode, lessonId, data]);

  React.useEffect(() => subscribe(() => setProgressTick(t => t + 1)), []);

  React.useEffect(() => {
    if (!data) return;
    const p = lessonProgressOf(lessonId);
    if (!p || !['passed', 'mastered'].includes(p.status)) {
      setQuizAnswers(null);
      return;
    }
    let alive = true;
    fetch(`/api/packs/answers/lesson/${encodeURIComponent(lessonId)}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.answers) setQuizAnswers(d.answers);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [data, lessonId]);

  async function openTestOut() {
    if (!data) return;
    setTestOutOpen(true);
    setTestOutResult(null);
    setTestOutAnswers({});
    setTestOutLoading(true);
    try {
      const res = await fetch(`/api/placement?moduleId=${encodeURIComponent(data.moduleId)}`, { credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? 'Sign in first to take a module test-out.');
        setTestOutOpen(false);
        return;
      }
      setTestOutData(body);
    } catch {
      toast.error('Network error loading test-out questions.');
      setTestOutOpen(false);
    } finally {
      setTestOutLoading(false);
    }
  }

  async function submitTestOut(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !testOutData) return;
    setTestOutSubmitting(true);
    try {
      const res = await fetch('/api/placement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'test-out', moduleId: data.moduleId, answers: testOutAnswers }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? 'Could not score test-out.'); return; }
      setTestOutResult(body);
      if (body.passed && Array.isArray(body.placedLessonIds)) {
        applyPlacementLocal(body.placedLessonIds);
        toast.success(`Module passed (${body.pct}%) — ${body.placedLessonIds.length} lessons unlocked!`);
      } else {
        toast.warning(`Scored ${body.pct}% — 85% needed to test out.`);
      }
    } catch {
      toast.error('Network error while grading test-out.');
    } finally {
      setTestOutSubmitting(false);
    }
  }

  if (missing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="qf-card p-8">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-surface-2 flex items-center justify-center">
            <Layers className="h-8 w-8 text-muted" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold">Lesson not found</h1>
          <p className="mt-2 text-muted text-[15px]">That lesson id does not exist. It may have been renamed.</p>
          <Link href="/curriculum" className="btn3d mt-6"><ArrowLeft className="h-4 w-4" /> Back to path</Link>
        </div>
      </div>
    );
  }

  if (!data) return <LessonSkeleton />;

  const done = doneSet();
  const hasEntitlement = can(userPlan, 'lesson', { phaseId: data.phaseId });

  if (planChecked && !hasEntitlement) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="qf-card p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-warning-soft flex items-center justify-center">
            <Lock className="h-8 w-8 text-warning" />
          </div>
          <p className="mt-4 text-[12px] font-black uppercase tracking-[0.14em] text-warning">{data.phaseTitle} · Pro curriculum</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">{data.lesson.title}</h1>
          <p className="mt-2 text-muted text-[15px] max-w-lg mx-auto font-semibold">
            Phases 0 &amp; 1 (84 lessons) are free forever. Upgrade to Pro to unlock {data.phaseTitle}, all 358 lessons, firm assessments, and the full coding bank.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/pricing" className="btn3d">
              <Sparkles className="h-4 w-4" /> Unlock Pro
            </Link>
            <Link href="/curriculum" className="btn3d btn3d-ghost">
              <ArrowLeft className="h-4 w-4" /> Back to curriculum
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const unlocked = isUnlockedInGraph(data.graph, lessonId, done);

  if (!unlocked && data.prereqs.length > 0) {
    // Compute remaining prerequisite chain depth via BFS over graph
    const unmetChain = new Set<string>();
    const stack = [...data.prereqs.map((p) => p.id)];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (unmetChain.has(id) || done.has(id)) continue;
      unmetChain.add(id);
      for (const up of data.graph.byId.get(id)?.prereqs ?? []) {
        if (!done.has(up)) stack.push(up);
      }
    }
    const nextPrereq = data.prereqs.find((p) => !done.has(p.id)) ?? data.prereqs[0];

    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="qf-card p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-surface-2 flex items-center justify-center">
            <Layers className="h-8 w-8 text-muted" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold">This lesson is locked</h1>
          <p className="mt-2 text-muted text-[15px] max-w-lg mx-auto font-semibold">
            Lessons build on each other — pass direct prerequisites (80%+), or test out of the module ({unmetChain.size} remaining in chain).
          </p>
          <ul className="mt-5 space-y-2 text-left max-w-md mx-auto">
            {data.prereqs.map(p => (
              <li key={p.id}>
                <Link
                  href={`/learn/${p.id}`}
                  className="flex items-center justify-between border-2 border-border rounded-2xl px-4 py-2.5 text-[15px] font-semibold hover:border-accent transition-colors"
                >
                  <span className="truncate pr-2">{p.title}</span>
                  <span className={`chip shrink-0 ${done.has(p.id) ? 'chip-success' : 'chip-accent'}`}>
                    {done.has(p.id) ? 'done' : 'open'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {nextPrereq && (
              <Link href={`/learn/${nextPrereq.id}`} className="btn3d">
                Open next prerequisite <ChevronRight className="h-4 w-4" />
              </Link>
            )}
            <button type="button" onClick={() => void openTestOut()} className="btn3d btn3d-blue">
              Test out of this module
            </button>
            <Link href="/curriculum" className="btn3d btn3d-ghost">
              <ArrowLeft className="h-4 w-4" /> Path
            </Link>
          </div>
        </div>

        {testOutOpen && (
          <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Module test-out">
            <div className="qf-card max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between gap-3 border-b-2 border-border pb-3">
                <div>
                  <h2 className="text-lg font-black">Test out · {data.moduleTitle}</h2>
                  <p className="text-[13px] font-semibold text-muted">Score 85%+ across these module questions to unlock every lesson in this module.</p>
                </div>
                <button type="button" onClick={() => setTestOutOpen(false)} aria-label="Close test-out" className="h-9 w-9 rounded-xl border-2 border-border flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {testOutLoading && <p className="py-10 text-center text-muted font-semibold">Loading module check…</p>}
              {testOutResult && (
                <div className={`mt-4 rounded-2xl border-2 p-4 ${testOutResult.passed ? 'border-accent bg-accent-soft' : 'border-warning bg-warning-soft'}`}>
                  <p className="font-black text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    {testOutResult.passed ? `Passed (${testOutResult.pct}%) — module unlocked!` : `Scored ${testOutResult.pct}% (${testOutResult.correct}/${testOutResult.total})`}
                  </p>
                  {testOutResult.passed && (
                    <button type="button" onClick={() => setTestOutOpen(false)} className="btn3d btn3d-sm mt-3">
                      Continue to lesson
                    </button>
                  )}
                </div>
              )}
              {testOutData && !testOutResult?.passed && (
                <form onSubmit={submitTestOut} className="mt-4 space-y-5">
                  {testOutData.questions.map((q, idx) => (
                    <div key={q.id} className="rounded-2xl border-2 border-border p-4 bg-surface-2/40">
                      <p className="text-[14px] font-bold"><span className="text-faint mr-1.5">{idx + 1}.</span><QMath text={q.prompt} /></p>
                      {q.code && <pre className="code-block mt-2"><code>{q.code}</code></pre>}
                      <div className="mt-3 space-y-1.5">
                        {q.type === 'mcq' && q.options?.map((opt, oi) => (
                          <label key={oi} className={`qf-answer-tile ${testOutAnswers[q.id] === String(oi) ? 'qf-selected' : ''}`}>
                            <input
                              type="radio" name={`to-${q.id}`} className="sr-only"
                              checked={testOutAnswers[q.id] === String(oi)}
                              onChange={() => setTestOutAnswers(a => ({ ...a, [q.id]: String(oi) }))}
                            />
                            <span className="qf-answer-badge">{String.fromCharCode(65 + oi)}</span>
                            <span className="flex-1 text-[14px]"><QMath text={opt} /></span>
                          </label>
                        ))}
                        {q.type === 'ms' && q.options?.map((opt, oi) => {
                          const cur = (testOutAnswers[q.id] as string[]) ?? [];
                          const picked = cur.includes(String(oi));
                          return (
                            <label key={oi} className={`qf-answer-tile ${picked ? 'qf-selected' : ''}`}>
                              <input
                                type="checkbox" className="sr-only" checked={picked}
                                onChange={() => setTestOutAnswers(a => ({ ...a, [q.id]: picked ? cur.filter(x => x !== String(oi)) : [...cur, String(oi)] }))}
                              />
                              <span className="qf-answer-badge">{String.fromCharCode(65 + oi)}</span>
                              <span className="flex-1 text-[14px]"><QMath text={opt} /></span>
                            </label>
                          );
                        })}
                        {(q.type === 'numeric' || q.type === 'short' || q.type === 'code-output') && (
                          <input
                            type="text"
                            value={(testOutAnswers[q.id] as string) ?? ''}
                            onChange={e => setTestOutAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                            placeholder="Your answer"
                            className="qf-input w-full"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setTestOutOpen(false)} className="btn3d btn3d-ghost">Cancel</button>
                    <button type="submit" disabled={testOutSubmitting} className="btn3d">
                      {testOutSubmitting ? 'Grading…' : 'Submit module test-out'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const { lesson } = data;
  const progress = lessonProgressOf(lessonId);
  const safeQuestions = lesson.quiz.map(sanitizedForClient);

  if (mode !== 'reference') {
    const cards = buildLessonCards(lesson);
    return (
      <LessonPlayer
        lessonId={lessonId}
        title={lesson.title}
        moduleTitle={data.moduleTitle}
        cards={cards}
        fullQuiz={lesson.quiz}
        flashcards={lesson.flashcards}
        nextHref={data.next ? `/learn/${data.next.id}` : undefined}
        nextTitle={data.next?.title}
        quizAnswers={quizAnswers}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
      <nav className="text-[13px] text-faint mb-3 flex items-center gap-1.5 flex-wrap" aria-label="Breadcrumb">
        <Link href="/curriculum" className="hover:text-muted">Curriculum</Link> ›
        <span>{data.phaseTitle}</span> ›
        <Link href={`/curriculum#module-${data.moduleId}`} className="hover:text-muted">{data.moduleTitle}</Link> ›
        <span className="text-muted">{lesson.title}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <MasteryBanner status={progress?.status ?? 'not_started'} pct={progress?.kcBestPct ?? 0} exerciseDone={progress?.exerciseDone ?? false} />
          </div>
          <Link href={`/learn/${lessonId}`} className="btn3d btn3d-sm">Card mode</Link>
        </div>
        <h1 className="text-2xl font-black tracking-tight">{lesson.title}</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-[13px] text-faint">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~{lesson.estMinutes} min</span>
          <span className="inline-flex items-center gap-1"><Target className="h-3.5 w-3.5" /> {lesson.difficulty}</span>
          <span>{lesson.skills.map(s => s.replace(/-/g, ' ')).join(' · ')}</span>
        </div>
        {data.prereqs.length > 0 && (
          <p className="mt-2 text-[13px] text-faint">
            Prerequisites:{' '}
            {data.prereqs.map((p, i) => (
              <span key={p.id}>{i > 0 && ' · '}<Link href={`/learn/${p.id}`} className={`hover:underline ${done.has(p.id) ? 'text-success' : 'text-accent'}`}>{p.title}</Link></span>
            ))}
          </p>
        )}
      </header>

      <div className="border-l-4 border-accent bg-accent-soft rounded-r-lg px-4 py-3.5 mb-8">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-accent mb-1.5">Why this matters</p>
        <p className="text-[15px] leading-relaxed"><QMath text={lesson.motivation} /></p>
      </div>

      <section className="mb-8 qf-card-flat p-4">
        <h2 className="text-[13px] font-black uppercase tracking-[0.12em] text-faint mb-2.5 flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-accent" /> Learning objectives</h2>
        <ul className="text-[15px] space-y-1.5">
          {lesson.objectives.map((o, i) => (
            <li key={i} className="flex gap-2.5 items-start rounded-lg px-2 py-1.5 hover:bg-surface-2/60 transition-colors">
              <span className="h-5 w-5 shrink-0 rounded-full bg-accent-soft text-accent-deep dark:text-accent text-[12px] font-black tnum flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="text-muted">{o}</span>
            </li>
          ))}
        </ul>
      </section>

      <article>
        {lesson.blocks.map((b, i) => <ClientBlock key={i} block={b} />)}
      </article>

      <h2 className="h-lesson">Exercises</h2>
      <ExerciseCard
        lessonId={lessonId} kind="guided" title="Guided exercise"
        prompt={lesson.guidedExercise.prompt} hints={lesson.guidedExercise.hints}
        solution={lesson.guidedExercise.solution} initialDone={progress?.exerciseDone ?? false}
      />
      <ExerciseCard
        lessonId={lessonId} kind="independent" title="Independent exercise"
        prompt={lesson.independentExercise.prompt} hints={lesson.independentExercise.hints}
        solution={lesson.independentExercise.solution} initialDone={progress?.exerciseDone ?? false}
      />

      <h2 className="h-lesson">Knowledge check</h2>
      <p className="text-[15px] text-muted -mt-4 mb-4">
        Score at least <strong>80%</strong> to pass. Graded instantly on your device; progress syncs when you&apos;re online.
      </p>
      <Quiz payload={{ lessonId }} questions={safeQuestions} fullQuestions={lesson.quiz} />

      {lesson.commonMistakes.length > 0 && (
        <>
          <h2 className="h-lesson">Common mistakes</h2>
          <ul className="space-y-2">
            {lesson.commonMistakes.map((m, i) => (
              <li key={i} className="flex gap-2.5 text-[15px] border rounded-lg px-3.5 py-2.5 bg-danger-soft/40 border-danger/20">
                <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {(lesson.realWorldApplication || lesson.quantFinanceApplication) && (
        <>
          <h2 className="h-lesson">Where you will use this</h2>
          {lesson.realWorldApplication && (
            <div className="flex gap-3 text-[15px] qf-card-flat p-4 mb-2">
              <span className="icon-tile icon-tile-sm icon-tile-info shrink-0"><Building2 className="h-5 w-5" /></span>
              <span className="leading-relaxed">{lesson.realWorldApplication}</span>
            </div>
          )}
          {lesson.quantFinanceApplication && (
            <div className="flex gap-3 text-[15px] qf-card-flat p-4">
              <span className="icon-tile icon-tile-sm icon-tile-gold shrink-0"><TrendingUp className="h-5 w-5" /></span>
              <span className="leading-relaxed">{lesson.quantFinanceApplication}</span>
            </div>
          )}
        </>
      )}

      <h2 className="h-lesson">Summary</h2>
      <ul className="space-y-2 mb-8">
        {lesson.summary.map((sItem, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] border rounded-lg px-3.5 py-2.5 bg-surface">
            <span className="text-accent font-black">›</span>
            <span>{sItem}</span>
          </li>
        ))}
      </ul>

      {data.relatedProblems.length > 0 && (
        <>
          <h2 className="h-lesson">Related practice problems</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {data.relatedProblems.map((prob) => (
              <Link key={prob.slug} href={`/practice/${prob.slug}`} className="row-card">
                <span className="icon-tile icon-tile-sm icon-tile-accent shrink-0">
                  <Code2 />
                </span>
                <div className="flex-1 min-w-0">
                  <span className="block font-bold text-[15px] truncate">{prob.title}</span>
                  <span className="text-[12px] font-bold text-faint capitalize">
                    {prob.difficulty} · ~{prob.estMinutes}m
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-faint shrink-0" />
              </Link>
            ))}
          </div>
        </>
      )}

      {lesson.references && lesson.references.length > 0 && (
        <>
          <h2 className="h-lesson">References</h2>
          <ul className="space-y-1.5 text-[15px] mb-8">
            {lesson.references.map((r, i) => (
              <li key={i}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{r.label}</a>
              </li>
            ))}
          </ul>
        </>
      )}

      <nav className="flex items-center justify-between gap-3 border-t-2 border-border pt-5 mt-4" aria-label="Lesson">
        {data.prev ? (
          <Link href={`/learn/${data.prev.id}`} className="btn3d btn3d-ghost btn3d-sm">← {data.prev.title}</Link>
        ) : <span />}
        {data.next ? (
          <Link href={`/learn/${data.next.id}`} className="btn3d btn3d-sm">{data.next.title} →</Link>
        ) : <span />}
      </nav>
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8 animate-pulse" aria-live="polite" aria-busy="true">
      <div className="h-3 w-64 bg-surface-2 rounded mb-6" />
      <div className="h-8 w-3/4 bg-surface-2 rounded mb-3" />
      <div className="h-3 w-40 bg-surface-2 rounded mb-8" />
      <div className="h-20 bg-surface-2 rounded-xl mb-6" />
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-4 bg-surface-2 rounded" style={{ width: `${88 - (i % 3) * 12}%` }} />
        ))}
      </div>
      <p className="mt-8 text-[13px] text-faint text-center">Loading lesson…</p>
    </div>
  );
}
