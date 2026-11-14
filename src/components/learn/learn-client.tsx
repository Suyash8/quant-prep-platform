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
  Clock, Target, AlertTriangle, Building2, TrendingUp, Layers, ArrowLeft,
} from 'lucide-react';
import type { CurriculumMap, Lesson } from '@/lib/content';
import { sanitizedForClient } from '@/lib/grading';
import { buildLessonCards } from '@/lib/lesson-cards';
import { buildCurriculumGraph, isUnlockedInGraph, type CurriculumGraph } from '@/lib/curriculum-graph';
import { getLessonPack, getMapPack, prefetchLesson } from '@/lib/client/packs';
import { doneSet, subscribe, lessonProgressOf } from '@/lib/client/local-state';
import { LessonPlayer } from '@/components/gamified/lesson-player';
import { ClientBlock } from '@/components/gamified/player-blocks';
import { Quiz, QMath } from '@/components/quiz';
import { ExerciseCard, MasteryBanner } from '@/components/lesson-tools';

interface Loaded {
  lesson: Lesson;
  graph: CurriculumGraph;
  phaseTitle: string;
  moduleTitle: string;
  moduleId: string;
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  prereqs: { id: string; title: string }[];
}

function currentLessonId(): string {
  if (typeof window === 'undefined') return '';
  const m = window.location.pathname.match(/^\/learn\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export function LearnClient({ initialLessonId }: { initialLessonId?: string }) {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  // v3: the id comes from the URL, not the server payload, so an offline
  // shell cached once serves every lesson
  const [lessonId, setLessonId] = React.useState(initialLessonId ?? '');
  const [data, setData] = React.useState<Loaded | null>(null);
  const [missing, setMissing] = React.useState(false);
  const [, setProgressTick] = React.useState(0);

  React.useEffect(() => {
    const id = currentLessonId();
    if (id && id !== lessonId) { setLessonId(id); return; }
    if (!id) return;
    let alive = true;
    setData(null);
    setMissing(false);
    (async () => {
      try {
        const lesson = await getLessonPack(lessonId);
        const { map, registry } = await getMapPack();
        if (!alive) return;
        const graph = buildCurriculumGraph(map as CurriculumMap, registry.lessons ?? []);
        const node = graph.byId.get(lessonId);
        if (!node) { setMissing(true); return; }
        const mod = (map as CurriculumMap).phases.flatMap(p => p.modules).find(m => m.id === lesson.moduleId)!;
        const phase = (map as CurriculumMap).phases.find(p => p.modules.includes(mod))!;
        const idx = mod.lessons.findIndex(l => l.id === lessonId);
        const next = idx < mod.lessons.length - 1 ? mod.lessons[idx + 1] : null;
        const prev = idx > 0 ? mod.lessons[idx - 1] : null;
        setData({
          lesson,
          graph,
          phaseTitle: phase.title,
          moduleTitle: mod.title,
          moduleId: mod.id,
          prev: prev ? { id: prev.id, title: prev.title } : null,
          next: next ? { id: next.id, title: next.title } : null,
          prereqs: node.prereqs.map(p => ({ id: p, title: graph.byId.get(p)?.title ?? p })),
        });
        if (next) prefetchLesson(next.id);
      } catch {
        if (alive) setMissing(true);
      }
    })();
    return () => { alive = false; };
  }, [lessonId]);

  React.useEffect(() => subscribe(() => setProgressTick(t => t + 1)), []);

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
  const unlocked = isUnlockedInGraph(data.graph, lessonId, done);

  if (!unlocked && data.prereqs.length > 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="qf-card p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-surface-2 flex items-center justify-center">
            <Layers className="h-8 w-8 text-muted" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold">This lesson is locked</h1>
          <p className="mt-2 text-muted text-[15px] max-w-lg mx-auto font-semibold">
            Lessons build on each other, so clear these first. Unlocking is automatic:
          </p>
          <ul className="mt-5 space-y-2 text-left max-w-md mx-auto">
            {data.prereqs.map(p => (
              <li key={p.id} className="flex items-center justify-between border-2 border-border rounded-2xl px-4 py-2.5 text-[15px] font-semibold">
                <span>{p.title}</span>
                <span className={`chip ${done.has(p.id) ? 'chip-success' : 'chip-accent'}`}>{done.has(p.id) ? 'done' : 'open'}</span>
              </li>
            ))}
          </ul>
          <Link href="/curriculum" className="btn3d mt-6">
            <ArrowLeft className="h-4 w-4" /> Back to path
          </Link>
        </div>
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
