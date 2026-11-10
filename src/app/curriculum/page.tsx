import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getMap, getRegistry, getCurriculumGraph } from '@/lib/content';
import { PublicHeader, AppShell } from '@/components/app-shell';
import { Lock, Circle, CircleDot, CheckCircle2, Award, Map as MapIcon, List } from 'lucide-react';
import { CurriculumSearch } from '@/components/curriculum-search';
import { LearningPath, resolvePhaseColor } from '@/components/gamified/learning-path';

export const metadata = { title: 'Curriculum. QuantFoundry' };

export default async function CurriculumPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const user = await getCurrentUser();
  const map = getMap();
  const reg = getRegistry();
  const graph = getCurriculumGraph();

  const published = new Set(reg.lessons.map(l => l.id));
  let progressRows: { lessonId: string; status: string }[] = [];
  if (user) {
    progressRows = await db.lessonProgress.findMany({ where: { userId: user.id }, select: { lessonId: true, status: true } });
  }
  const statusByLesson = new Map(progressRows.map(r => [r.lessonId, r.status]));
  const done = new Set(progressRows.filter(r => ['passed', 'mastered'].includes(r.status)).map(r => r.lessonId));

  const allLessons = map.phases.flatMap(p => p.modules.flatMap(m => m.lessons.map(l => ({ ...l, moduleId: m.id }))));
  const totalEst = allLessons.filter(l => published.has(l.id)).reduce((n, l) => n + l.estMinutes, 0);

  // the recommended next lesson gets the START bubble on the path


  let currentLessonId: string | undefined;
  if (user) {
    currentLessonId = graph.order
      .filter(id => published.has(id) && !done.has(id))
      .find(id => graph.byId.get(id)!.prereqs.every(p => done.has(p)));
  }

  const pathView = view !== 'list';

  const body = (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">The path</h1>
        <p className="mt-2 text-muted text-sm max-w-3xl leading-relaxed font-semibold">
          {reg.lessons.length} published lessons across {map.phases.length} phases, roughly {Math.round(totalEst / 60)} hours of core lesson time,
          sequenced by a prerequisite graph. Every lesson is fully authored: intuition, formal treatment, interactive labs, exercises and a server-scored knowledge check.
        </p>
        {user && (
          <p className="mt-3 text-sm font-bold">
            <span className="tnum text-accent-deep dark:text-accent">{done.size}</span>
            <span className="text-muted"> passed of </span>
            <span className="tnum">{published.size}</span>
            <span className="text-muted"> published · </span>
            <Link href="/dashboard" className="text-info hover:underline">home</Link>
          </p>
        )}
      </header>

      {/* view toggle */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/curriculum"
          className={`btn3d btn3d-sm ${pathView ? '' : 'btn3d-ghost'}`}
          aria-current={pathView ? 'page' : undefined}
        >
          <MapIcon className="h-4 w-4" /> Path
        </Link>
        <Link
          href="/curriculum?view=list"
          className={`btn3d btn3d-sm ${!pathView ? '' : 'btn3d-ghost'}`}
          aria-current={!pathView ? 'page' : undefined}
        >
          <List className="h-4 w-4" /> List
        </Link>
      </div>

      {pathView ? (
        <div className="px-2 sm:px-6">
          <LearningPath map={map} progress={new Map(progressRows.map(r => [r.lessonId, { status: r.status }]))} currentLessonId={currentLessonId} />
        </div>
      ) : (
        <>
          <CurriculumSearch
            lessons={allLessons.map(l => ({
              id: l.id, title: l.title, moduleId: l.moduleId,
              moduleTitle: map.phases.flatMap(p => p.modules).find(m => m.id === l.moduleId)?.title ?? '',
              phaseTitle: map.phases.find(p => p.modules.some(m => m.id === l.moduleId))?.title ?? '',
              estMinutes: l.estMinutes,
              published: published.has(l.id),
              status: statusByLesson.get(l.id) ?? null,
            }))}
          />

          <div className="mt-10 space-y-12">
            {map.phases.map(phase => {
              const phaseLessons = phase.modules.flatMap(m => m.lessons);
              const pubCount = phaseLessons.filter(l => published.has(l.id)).length;
              const phaseDone = phaseLessons.filter(l => done.has(l.id)).length;
              return (
                <section key={phase.id} id={`phase-${phase.id}`}>
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <h2 className="text-xl font-black tracking-tight">
                      <span className="text-faint tnum mr-2">Phase {phase.order}</span>{phase.title}
                    </h2>
                    <span className="text-xs font-bold text-faint">
                      {pubCount}/{phaseLessons.length} published{user ? ` · ${phaseDone} done` : ''}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-muted max-w-3xl">{phase.summary}</p>

                  <div className="mt-5 grid md:grid-cols-2 gap-4">
                    {phase.modules.map(module => {
                      const modDone = module.lessons.filter(l => ['passed', 'mastered'].includes(statusByLesson.get(l.id) ?? '')).length;
                      const modPct = module.lessons.length ? Math.round((modDone / module.lessons.length) * 100) : 0;
                      return (
                        <div key={module.id} id={`module-${module.id}`} className="qf-card-flat overflow-hidden flex flex-col">
                          <div className="px-4 py-3 border-b-2 bg-surface-2/40">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-extrabold text-sm">{module.title}</h3>
                              <span className="chip">{module.difficulty}</span>
                            </div>
                            <p className="text-xs font-semibold text-faint mt-1">{module.summary}</p>
                            <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-faint">
                              <span>Tracks: {module.tracks.join(' · ')}</span>
                              {user && <span>· {modDone}/{module.lessons.length} done</span>}
                            </div>
                            {user && (
                              <div className="mt-2 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${modPct}%`, background: resolvePhaseColor(phase.color) }} />
                              </div>
                            )}
                          </div>
                          <ol className="divide-y">
                            {module.lessons.map((l, li) => {
                              const st = statusByLesson.get(l.id);
                              const isPub = published.has(l.id);
                              const node = graph.byId.get(l.id);
                              const unlocked = user ? (node ? node.prereqs.every(p => done.has(p)) : false) : li === 0;
                              const Icon = st === 'mastered' ? Award : (st === 'passed' ? CheckCircle2 : st || !user ? CircleDot : Circle);
                              return (
                                <li key={l.id} className="px-4 py-2.5 flex items-center gap-3 text-sm font-semibold">
                                  {isPub ? (
                                    Icon === Circle ? <Circle className="h-4 w-4 text-faint shrink-0" /> :
                                    Icon === CircleDot ? <CircleDot className="h-4 w-4 text-accent shrink-0" /> :
                                    Icon === CheckCircle2 ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> :
                                    <Award className="h-4 w-4 text-warning shrink-0" />
                                  ) : (
                                    <span className="chip shrink-0" title="Authored, publishing progressively">planned</span>
                                  )}
                                  {isPub && (unlocked || done.has(l.id)) ? (
                                    <Link href={`/learn/${l.id}`} className="flex-1 hover:text-accent transition-colors">
                                      {l.title}
                                      <span className="ml-2 text-[11px] text-faint tnum">{l.estMinutes}m</span>
                                    </Link>
                                  ) : isPub ? (
                                    <span className="flex-1 text-faint flex items-center gap-1.5" title="Complete the prerequisites first">
                                      {l.title} <Lock className="h-3 w-3" />
                                    </span>
                                  ) : (
                                    <span className="flex-1 text-faint">{l.title} <span className="text-[11px]">(in development)</span></span>
                                  )}
                                  <span className="text-[11px] text-faint w-24 text-right truncate">{l.skills[0]?.replace(/-/g, ' ')}</span>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader user={null} />
        {body}
      </div>
    );
  }
  return <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>{body}</AppShell>;
}
