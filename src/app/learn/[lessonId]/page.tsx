import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getLessonById, getMap, getCurriculumGraph, isUnlocked, listProblems } from '@/lib/content';
import { BlockRenderer } from '@/components/lesson-blocks';
import { Quiz } from '@/components/quiz';
import { sanitizedForClient } from '@/lib/grading';
import { ExerciseCard, LessonFooterTools, MasteryBanner } from '@/components/lesson-tools';
import { buildLessonCards } from '@/lib/lesson-cards';
import { LessonPlayer } from '@/components/gamified/lesson-player';
import { Clock, Target, AlertTriangle, Building2, TrendingUp, Layers, ArrowLeft, BookOpen, CheckCircle2, Code2 } from 'lucide-react';

export default async function LessonPage({
  params, searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { lessonId } = await params;
  const { mode } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/learn/${lessonId}`);

  const found = getLessonById(lessonId);
  if (!found) notFound();
  const lesson = found.lesson;
  const map = getMap();
  const graph = getCurriculumGraph();
  const node = graph.byId.get(lessonId)!;
  const mod = map.phases.flatMap(p => p.modules).find(m => m.id === lesson.moduleId)!;
  const phase = map.phases.find(p => p.modules.includes(mod))!;

  const progressRows = await db.lessonProgress.findMany({ where: { userId: user.id } });
  const done = new Set(progressRows.filter(p => ['passed', 'mastered'].includes(p.status)).map(p => p.lessonId));
  const unlocked = isUnlocked(lessonId, done);
  const prereqNodes = node.prereqs.map(p => graph.byId.get(p)!).filter(Boolean);

  const progress = progressRows.find(p => p.lessonId === lessonId);
  const note = await db.note.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } } });
  const bookmark = await db.bookmark.findUnique({ where: { userId_targetType_targetId: { userId: user.id, targetType: 'lesson', targetId: lessonId } } });

  const idx = mod.lessons.findIndex(l => l.id === lessonId);
  const prevLesson = idx > 0 ? mod.lessons[idx - 1] : null;
  const nextLesson = idx < mod.lessons.length - 1 ? mod.lessons[idx + 1] : null;

  const safeQuestions = lesson.quiz.map(sanitizedForClient);
  const problems = listProblems()
    .filter(p => p.tags.some(t => lesson.skills.includes(t)))
    .slice(0, 3);

  if (!unlocked && node.prereqs.length > 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="qf-card p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-surface-2 flex items-center justify-center">
            <Layers className="h-8 w-8 text-muted" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold">This lesson is locked</h1>
          <p className="mt-2 text-muted text-sm max-w-lg mx-auto font-semibold">
            Mastery is sequenced: each lesson assumes the ones before it. Clear these first — unlocking is automatic:
          </p>
          <ul className="mt-5 space-y-2 text-left max-w-md mx-auto">
            {prereqNodes.map(p => (
              <li key={p.id} className="flex items-center justify-between border-2 border-border rounded-2xl px-4 py-2.5 text-sm font-semibold">
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

  // Default experience: the bite-sized card player. ?mode=reference keeps the
  // full document view for revision and deep reading.
  if (mode !== 'reference') {
    const cards = buildLessonCards(lesson);
    return (
      <LessonPlayer
        lessonId={lessonId}
        title={lesson.title}
        moduleTitle={mod.title}
        cards={cards}
        nextHref={nextLesson ? `/learn/${nextLesson.id}` : undefined}
        nextTitle={nextLesson?.title}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
      <nav className="text-xs text-faint mb-3 flex items-center gap-1.5 flex-wrap" aria-label="Breadcrumb">
        <Link href="/curriculum" className="hover:text-muted">Curriculum</Link> ›
        <span>{phase.title}</span> ›
        <Link href={`/curriculum#module-${mod.id}`} className="hover:text-muted">{mod.title}</Link> ›
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
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-faint">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~{lesson.estMinutes} min</span>
          <span className="inline-flex items-center gap-1"><Target className="h-3.5 w-3.5" /> {lesson.difficulty}</span>
          <span>{lesson.skills.map(s => s.replace(/-/g, ' ')).join(' · ')}</span>
        </div>
        {prereqNodes.length > 0 && (
          <p className="mt-2 text-xs text-faint">
            Prerequisites:{' '}
            {prereqNodes.map((p, i) => (
              <span key={p.id}>{i > 0 && ' · '}<Link href={`/learn/${p.id}`} className={`hover:underline ${done.has(p.id) ? 'text-success' : 'text-accent'}`}>{p.title}</Link></span>
            ))}
          </p>
        )}
      </header>

      <div className="border-l-4 border-accent bg-accent-soft rounded-r-lg px-4 py-3.5 mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-1.5">Why this matters</p>
        <p className="text-sm leading-relaxed"><Emph text={lesson.motivation} /></p>
      </div>

      <section className="mb-8 qf-card-flat p-4">
        <h2 className="text-xs font-black uppercase tracking-[0.12em] text-faint mb-2.5 flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-accent" /> Learning objectives</h2>
        <ul className="text-sm space-y-1.5">
          {lesson.objectives.map((o, i) => (
            <li key={i} className="flex gap-2.5 items-start rounded-lg px-2 py-1.5 hover:bg-surface-2/60 transition-colors">
              <span className="h-5 w-5 shrink-0 rounded-full bg-accent-soft text-accent-deep dark:text-accent text-[10px] font-black tnum flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="text-muted">{o}</span>
            </li>
          ))}
        </ul>
      </section>

      <article>
        {lesson.blocks.map((b, i) => <BlockRenderer key={i} block={b} />)}
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
      <p className="text-sm text-muted -mt-4 mb-4">
        Score at least <strong>80%</strong> to pass. Answers are scored on the server — the correct answers never reach your browser before submission.
      </p>
      <Quiz endpoint="/api/progress/lesson" payload={{ lessonId }} questions={safeQuestions} />

      {lesson.commonMistakes.length > 0 && (
        <>
          <h2 className="h-lesson">Common mistakes</h2>
          <ul className="space-y-2">
            {lesson.commonMistakes.map((m, i) => (
              <li key={i} className="flex gap-2.5 text-sm border rounded-lg px-3.5 py-2.5 bg-danger-soft/40 border-danger/20">
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
            <div className="flex gap-3 text-sm qf-card-flat p-4 mb-2">
              <span className="icon-tile icon-tile-sm icon-tile-info shrink-0"><Building2 className="h-5 w-5" /></span>
              <span className="leading-relaxed">{lesson.realWorldApplication}</span>
            </div>
          )}
          {lesson.quantFinanceApplication && (
            <div className="flex gap-3 text-sm qf-card-flat p-4">
              <span className="icon-tile icon-tile-sm icon-tile-gold shrink-0"><TrendingUp className="h-5 w-5" /></span>
              <span className="leading-relaxed">{lesson.quantFinanceApplication}</span>
            </div>
          )}
        </>
      )}

      <h2 className="h-lesson">Summary</h2>
      <ul className="space-y-1.5 text-sm prose-qf">
        {lesson.summary.map((sm, i) => (
          <li key={i} className="flex gap-2.5 items-start rounded-xl bg-surface-2/50 border border-border/60 px-3.5 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <span>{sm}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 qf-card-flat p-4 text-sm flex items-center gap-3.5 flex-wrap">
        <span className="icon-tile icon-tile-sm icon-tile-violet shrink-0"><Layers className="h-5 w-5" /></span>
        <span className="flex-1 min-w-[220px] text-muted">
          <strong>{lesson.flashcards.length} revision cards</strong> were created from this lesson — scheduled in your revision queue.
        </span>
        <Link href="/revision" className="btn3d btn3d-sm btn3d-ghost shrink-0">Revision centre</Link>
      </div>

      {problems.length > 0 && (
        <div className="mt-4 qf-card-flat p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-faint mb-2.5">Further practice</p>
          <ul className="space-y-1.5">
            {problems.map(p => (
              <li key={p.slug}>
                <Link href={`/practice/${p.slug}`} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface-2/60 transition-colors group">
                  <Code2 className="h-4 w-4 text-info shrink-0" />
                  <span className="text-sm font-bold group-hover:text-info transition-colors">{p.title}</span>
                  <span className={`chip ml-auto ${p.difficulty === 'easy' ? 'chip-success' : p.difficulty === 'hard' ? 'chip-danger' : 'chip-warning'}`}>{p.difficulty}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lesson.references && lesson.references.length > 0 && (
        <div className="mt-4 qf-card-flat p-4 !bg-surface-2/40">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-faint mb-2">References</p>
          <ul className="space-y-1.5 text-sm">
            {lesson.references.map(r => (
              <li key={r.url} className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-faint shrink-0" />
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-info hover:underline font-semibold">{r.label}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <LessonFooterTools
        lessonId={lessonId} initiallyBookmarked={!!bookmark} note={note?.body ?? ''}
        prevHref={prevLesson ? `/learn/${prevLesson.id}` : undefined} prevTitle={prevLesson?.title}
        nextHref={nextLesson ? `/learn/${nextLesson.id}` : undefined} nextTitle={nextLesson?.title}
        nextLabel={nextLesson ? `Next: ${nextLesson.title}` : undefined}
      />
    </div>
  );
}

function Emph({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <strong key={i}>{unescapeCurrency(p)}</strong> : <span key={i}>{unescapeCurrency(p)}</span>))}</>;
}

function unescapeCurrency(s: string): string {
  return s.replace(/\\\$/g, '$');
}
