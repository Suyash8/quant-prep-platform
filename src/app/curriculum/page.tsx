import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getMap, getRegistry, getCurriculumGraph } from '@/lib/content';
import { PublicHeader, AppShell } from '@/components/app-shell';
import { Lock, Circle, CircleDot, CheckCircle2, Award, Map as MapIcon, List } from 'lucide-react';
import { CurriculumSearch } from '@/components/curriculum-search';
import { LearningPath, resolvePhaseColor } from '@/components/gamified/learning-path';
import { PageHero, ClosingCta, StatTile } from '@/components/ui/page-kit';

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
      <PageHero
        icon={MapIcon}
        tone="accent"
        title="Your path"
        sub={<>{reg.lessons.length} published lessons across {map.phases.length} phases, roughly {Math.round(totalEst / 60)} hours of core lesson time, sequenced by a prerequisite graph.</>}
      />

      {user && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatTile icon={CheckCircle2} tone="accent" value={done.size} label="Lessons passed" sub={`of ${published.size} published`} />
          <StatTile icon={MapIcon} tone="info" value={map.phases.length} label="Phases" sub={`${map.phases.reduce((n, p) => n + p.modules.length, 0)} modules total`} />
          <StatTile icon={List} tone="gold" value={`${Math.round(totalEst / 60)}h`} label="Core lesson time" sub="rough estimate at your pace" />
        </div>
      )}

      {/* view toggle */}
      <div className="qf-segmented mb-6" role="group" aria-label="Curriculum view">
        <Link
          href="/curriculum"
          aria-current={pathView ? 'page' : undefined}
          aria-pressed={pathView}
          className="inline-flex items-center gap-1.5"
        >
          <MapIcon className="h-4 w-4" aria-hidden="true" /> Path
        </Link>
        <Link
          href="/curriculum?view=list"
          aria-current={!pathView ? 'page' : undefined}
          aria-pressed={!pathView}
          className="inline-flex items-center gap-1.5"
        >
          <List className="h-4 w-4" aria-hidden="true" /> List
        </Link>
      </div>

      {pathView ? (
        <div>
          {/* compact progress + phase jump strip, horizontal so no rail dead zone */}
          <div className="qf-card-flat p-4 flex flex-wrap items-center gap-3 mb-6">
            <span className="icon-tile-sm icon-tile-accent"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /></span>
            <span className="text-sm font-black">{done.size} / {published.size} passed</span>
            <span className="prog-track flex-1 min-w-32 h-3"><span className="prog-fill" style={{ width: `${published.size ? Math.round((done.size / published.size) * 100) : 0}%` }} /></span>
            <span className="chip tnum">{Math.round(totalEst / 60)}h core</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {map.phases.map(ph => (
                <a key={ph.id} href={`#phase-${ph.id}`} className="chip hover:border-accent" title={ph.title}>
                  P{ph.order}
                </a>
              ))}
            </div>
          </div>
          <div className="px-2 sm:px-6">
            <LearningPath map={map} progress={new Map(progressRows.map(r => [r.lessonId, { status: r.status }]))} currentLessonId={currentLessonId} rail={false} />
          </div>
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

      <div className="mt-12">
        <ClosingCta
          icon={MapIcon}
          tone="accent"
          title={`${published.size - done.size} lessons are still ahead.`}
          line={currentLessonId ? 'Your next one is unlocked and waiting. It takes about 20 minutes.' : 'Sign in and the path lights up with your progress.'}
          cta={currentLessonId
            ? <Link href={`/learn/${currentLessonId}`} className="btn3d">Jump to your next lesson</Link>
            : <Link href="/register" className="btn3d">Start free</Link>}
          ghost={<Link href="/dashboard" className="btn3d btn3d-ghost">Back to my dashboard</Link>}
          pose="cheer"
        />
      </div>
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
