'use client';

/**
 * v3 dashboard: renders from the local progress store + content packs.
 * Instant on every visit, works offline, syncs in the background.
 */

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight, BookOpenCheck, Code2, Timer, Undo2, FolderKanban, BarChart3,
  CircleDot, Zap, Play, CheckCircle2, Trophy, Sparkles, Star,
} from 'lucide-react';
import type { CurriculumMap } from '@/lib/content';
import { buildCurriculumGraph, type RegistryEntry } from '@/lib/curriculum-graph';
import { getMapPack, getProblemsIndex, getProjectsIndex } from '@/lib/client/packs';
import {
  getState, subscribe, hydrate, doneSet, xpSummary, dueCardKeys, weekMinutes,
} from '@/lib/client/local-state';
import { LearningPath } from '@/components/gamified/learning-path';
import { StatTile, SectionHead, ClosingCta, ProgressRing } from '@/components/ui/page-kit';
import { Mascot } from '@/components/brand/mascot';
import { Flame, Target, TrendingUp, Trophy as TrophyIcon } from 'lucide-react';

export function DashboardClient({ name }: { name: string }) {
  const [map, setMap] = React.useState<CurriculumMap | null>(null);
  const [registryLessons, setRegistryLessons] = React.useState<RegistryEntry[]>([]);
  const [, setTick] = React.useState(0);
  const [problemCount, setProblemCount] = React.useState(28);
  const [projectCount, setProjectCount] = React.useState(12);

  React.useEffect(() => {
    let alive = true;
    void hydrate();
    getMapPack().then(({ map: m, registry }) => {
      if (!alive) return;
      setMap(m as CurriculumMap);
      setRegistryLessons((registry as { lessons: RegistryEntry[] }).lessons ?? []);
    }).catch(() => {});
    getProblemsIndex().then(p => { if (alive) setProblemCount(p.length); }).catch(() => {});
    getProjectsIndex().then(p => { if (alive) setProjectCount(p.length); }).catch(() => {});
    const unsub = subscribe(() => setTick(t => t + 1));
    return () => { alive = false; unsub(); };
  }, []);

  if (!map) {
    return (
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-8" aria-busy="true">
        <div className="page-hero">
          <div className="skeleton w-14 h-14" />
          <div className="space-y-2"><div className="skeleton h-7 w-64" /><div className="skeleton h-4 w-44" /></div>
        </div>
        <div className="skeleton h-28 w-full" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="stat-tile"><div className="skeleton h-8 w-20 mb-2" /><div className="skeleton h-3.5 w-24" /></div>)}
        </div>
        <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
      </div>
    );
  }

  const s = getState();
  const gam = xpSummary();
  const graph = buildCurriculumGraph(map, registryLessons);

  const passedSet = doneSet();
  const passed = Object.values(s.lessons).filter(l => ['passed', 'mastered'].includes(l.status));
  const mastered = Object.values(s.lessons).filter(l => l.status === 'mastered');
  const needsRevision = Object.entries(s.lessons).filter(([, l]) => l.status === 'needs_revision');
  const dueCount = dueCardKeys(200).length;
  const solvedProblems = new Set(Object.entries(s.problems).filter(([, p]) => p.status === 'passed').map(([slug]) => slug));

  const recommendations = graph.order
    .filter(id => graph.byId.get(id)?.published && !passedSet.has(id))
    .filter(id => graph.byId.get(id)!.prereqs.every(p => passedSet.has(p)))
    .slice(0, 3);
  const nextLesson = recommendations[0] ? graph.byId.get(recommendations[0])! : null;

  const focusPhaseId = nextLesson ? map.phases.find(ph => ph.modules.some(m => m.lessons.some(l => l.id === nextLesson.id)))?.id : undefined;
  const focusModuleId = nextLesson ? map.phases.flatMap(p => p.modules).find(m => m.lessons.some(l => l.id === nextLesson.id))?.id : undefined;

  const quests = [
    { icon: Zap, label: `Earn ${gam.dailyGoalXp} XP`, have: gam.todayXp, need: gam.dailyGoalXp, href: '/curriculum' },
    { icon: BookOpenCheck, label: 'Pass 1 lesson', have: Math.min(s.today?.lessonsPassed ?? 0, 1), need: 1, href: '/curriculum' },
    { icon: Code2, label: 'Practise: solve or drill', have: Math.min(s.today?.practice ?? 0, 1), need: 1, href: '/practice' },
  ];

  const drillAccuracy = s.drills.totalAnswered > 0 ? Math.round((s.drills.totalCorrect / s.drills.totalAnswered) * 100) : null;
  const goalPct = Math.min(100, Math.round((gam.todayXp / Math.max(gam.dailyGoalXp, 1)) * 100));
  const week = weekMinutes();
  const revisionTitle = dueCount > 0 ? `Revision (${dueCount} due)` : 'Revision';
  const progressMap = new Map(Object.entries(s.lessons).map(([id, l]) => [id, { status: l.status }]));

  const recentLessons = Object.entries(s.lessons)
    .filter(([, l]) => l.status !== 'not_started')
    .sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt))
    .slice(0, 5);

  // XP needed for the next level (mirrors the level curve used in local-state)
  const nextLevelXp = gam.level * 300;
  const levelPct = Math.min(100, Math.round((gam.xp / nextLevelXp) * 100));
  // last 7 days of study minutes, oldest first, real labels
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400_000);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()], min: s.minutesByDay[k] ?? 0 };
  });
  const activeDays = last7.filter(d => d.min > 0).length;
  const bestDay = Math.max(...last7.map(d => d.min), 1);
  const milestone = (() => {
    const ph = map.phases.find(p => p.modules.some(m => m.lessons.some(l => l.id === nextLesson?.id))) ?? map.phases[0];
    const total = ph.modules.reduce((n, m) => n + m.lessons.length, 0);
    const done = ph.modules.reduce((n, m) => n + m.lessons.filter(l => passedSet.has(l.id)).length, 0);
    return { title: ph.title, left: Math.max(total - done, 0), done, total };
  })();

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
        {/* header row: greeting + goal ring */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {name.split(' ')[0]}
            </h1>
            <p className="mt-1 text-sm font-semibold text-muted">
              {nextLesson
                ? `Your next lesson is ~${nextLesson.estMinutes} minutes long.`
                : passedSet.size === 0
                  ? 'New here? Take the diagnostic to find your baseline, or just start the first lesson.'
                  : 'Everything unlocked is passed, the graph opens up as you clear prerequisites.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hud-pill" title="Day streak">
              <Flame className="h-5 w-5 text-flame anim-flame" aria-hidden="true" />
              <span className="text-base tnum">{gam.streakCount}</span>
            </span>
            <div className="hud-pill" title="Current level">
              <Star className="h-5 w-5 text-violet" aria-hidden="true" />
              <span className="text-base tnum">{gam.level}</span>
            </div>
            <GoalRing pct={goalPct} level={gam.level} done={gam.goalReached} />
          </div>
        </div>

        {/* HUD stat row */}
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Your numbers">
          <StatTile icon={Zap} tone="gold" value={gam.xp.toLocaleString()} label="Total XP" sub={`${nextLevelXp - gam.xp} XP to level ${gam.level + 1}`} />
          <StatTile icon={Star} tone="violet" value={gam.level} label={`Level, ${levelPct}% to next`} sub={`daily goal ${gam.dailyGoalXp} XP`} />
          <StatTile icon={Flame} tone="warning" value={gam.streakCount} label="Day streak" sub="earn any XP today to keep it" />
          <StatTile icon={Target} tone="accent" value={`${Math.min(gam.todayXp, gam.dailyGoalXp)}/${gam.dailyGoalXp}`} label="Today's goal" sub={gam.goalReached ? 'done, nice work' : 'keep going'} />
        </section>

        {/* Continue hero */}
        {nextLesson ? (
          <section className="mt-6">
            <div className="qf-card p-5 sm:p-6 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-accent-soft anim-float-slow" aria-hidden />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="h-16 w-16 shrink-0 rounded-3xl bg-accent text-white flex items-center justify-center shadow-[0_5px_0_0_var(--accent-deep)]">
                  <Play className="h-8 w-8 fill-white" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-accent-deep dark:text-accent">Pick up where you left off</p>
                  <h2 className="mt-0.5 text-lg font-black tracking-tight">{nextLesson.title}</h2>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <span className="chip chip-info">{nextLesson.moduleTitle}</span>
                    <span className="chip">~{nextLesson.estMinutes} min</span>
                    <span className="chip chip-warning">{nextLesson.difficulty}</span>
                  </div>
                </div>
                <Link href={`/learn/${nextLesson.id}`} className="btn3d btn3d-lg shrink-0">
                  Continue lesson <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Mascot pose="cheer" size={76} className="hidden sm:block shrink-0" />
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-6">
            <div className="qf-card p-6 relative overflow-hidden text-center">
              <div className="absolute -left-10 -bottom-12 h-40 w-40 rounded-full bg-accent-soft anim-float-slow" aria-hidden />
              <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-info-soft anim-float" aria-hidden />
              <div className="relative">
                <span className="mx-auto h-16 w-16 rounded-3xl bg-accent text-white flex items-center justify-center shadow-[0_5px_0_0_var(--accent-deep)] anim-bob">
                  <Trophy className="h-8 w-8" />
                </span>
                <h2 className="mt-4 text-xl font-black tracking-tight">You have cleared every unlocked lesson</h2>
                <p className="mt-1.5 text-sm font-semibold text-muted max-w-md mx-auto">
                  Keep the edge sharp: assess yourself under exam conditions, clear revision cards before they expire, or build a portfolio project.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link href="/assessments" className="btn3d btn3d-sm">Assessment centre</Link>
                  <Link href="/revision" className="btn3d btn3d-sm btn3d-blue">Revision queue</Link>
                  <Link href="/projects" className="btn3d btn3d-sm btn3d-gold">Projects</Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* quests */}
        <section className="mt-8" aria-label="Daily quests">
          <SectionHead icon={Sparkles} tone="warning" title="Daily quests" right={
            quests.every(q => q.have >= q.need)
              ? <span className="chip chip-gold"><TrophyIcon className="h-3 w-3" aria-hidden="true" /> chest earned</span>
              : <span className="chip">3 quests, XP chest when all clear</span>
          } />
          <div className="grid sm:grid-cols-3 gap-4">
            {quests.map(q => {
              const done = q.have >= q.need;
              return (
                <Link key={q.label} href={q.href} className={`row-card press ${done ? 'anim-pop-in' : ''}`}>
                  <span className={`icon-tile ${done ? 'icon-tile-accent' : 'icon-tile-warning'}`}>
                    {done ? <CheckCircle2 className="h-6 w-6" aria-hidden="true" /> : <q.icon className="h-6 w-6" aria-hidden="true" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold truncate">{q.label}</p>
                    <div className="prog-track mt-1.5">
                      <div className={`prog-fill ${done ? 'xp-stripes' : ''}`} style={{ width: `${Math.min(100, (q.have / q.need) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-xs font-bold text-faint tnum">{Math.min(q.have, q.need)}/{q.need}{done ? ' · done' : ''}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Metrics */}
        <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile icon={TrophyIcon} tone="accent" value={passed.length} label="Lessons passed" sub={`${mastered.length} mastered · level ${gam.level}`} />
          <StatTile icon={Code2} tone="info" value={`${solvedProblems.size}/${problemCount}`} label="Problems solved" sub={`${Object.keys(s.problems).length} submissions`} />
          <StatTile icon={Undo2} tone="violet" value={dueCount} label="Cards due now" sub="spaced repetition" />
          <StatTile icon={Timer} tone="warning" value={`${week} min`} label="Study time, last 7 days" sub={drillAccuracy !== null ? `drill accuracy ${drillAccuracy}%` : 'no drills yet'} />
        </section>

        {/* Needs revision */}
        {needsRevision.length > 0 && (
          <section className="mt-8 qf-card-flat p-4 !border-danger/40 bg-danger-soft/60">
            <h2 className="text-sm font-black text-danger flex items-center gap-2"><CircleDot className="h-4 w-4" /> Needs revision ({needsRevision.length})</h2>
            <ul className="mt-2 space-y-1.5 text-sm font-semibold">
              {needsRevision.slice(0, 5).map(([lessonId, r]) => {
                const node = graph.byId.get(lessonId);
                return node ? (
                  <li key={lessonId} className="flex items-center justify-between gap-2">
                    <Link href={`/learn/${lessonId}`} className="text-accent-deep dark:text-accent hover:underline">{node.title}</Link>
                    <span className="text-xs text-faint tnum">best {Math.round(r.kcBestPct)}%</span>
                  </li>
                ) : null;
              })}
            </ul>
          </section>
        )}

        {/* the path */}
        <section className="mt-10" aria-label="Your learning path">
          <SectionHead icon={BookOpenCheck} tone="accent" title="Your path" right={
            <Link href="/curriculum" className="text-sm font-extrabold text-info hover:underline flex items-center gap-1">
              Full curriculum <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          } />
          {focusPhaseId && focusModuleId ? (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_290px] gap-6 items-start">
              <div className="min-w-0 qf-card bg-dots p-5">
                <LearningPath
                  map={map}
                  progress={progressMap}
                  phases={[focusPhaseId]}
                  moduleIds={[focusModuleId]}
                  currentLessonId={nextLesson?.id}
                  rail={false}
                />
                <Link href="/curriculum" className="qf-card-flat bg-surface px-5 py-3.5 flex items-center gap-3.5 press hover:border-info transition-colors mt-6 group">
                  <span className="icon-tile icon-tile-sm icon-tile-info"><FolderKanban className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold">The path continues, {map.phases.length} phases, {map.phases.reduce((n, p) => n + p.modules.length, 0)} modules</span>
                    <span className="block text-xs font-semibold text-muted">Open the full curriculum to see every module, phase and where you stand.</span>
                  </span>
                  <ArrowRight className="h-5 w-5 text-faint group-hover:text-info transition-colors shrink-0" aria-hidden="true" />
                </Link>
              </div>
              <aside className="qf-rail">
                {nextLesson && (() => {
                  const focusMod = map.phases.flatMap(p => p.modules).find(m => m.id === focusModuleId)!;
                  const modDone = focusMod.lessons.filter(l => passedSet.has(l.id)).length;
                  const modMin = focusMod.lessons.reduce((n, l) => n + l.estMinutes, 0);
                  return (
                    <div className="qf-card p-5 relative overflow-hidden">
                      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent-soft" aria-hidden />
                      <div className="relative">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-faint">Current module</p>
                        <p className="mt-1.5 text-base font-black tracking-tight leading-snug">{focusMod.title}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="chip">{focusMod.difficulty}</span>
                          <span className="chip tnum">{modDone}/{focusMod.lessons.length} lessons</span>
                          <span className="chip tnum">~{Math.round(modMin / 60 * 10) / 10}h</span>
                        </div>
                        <div className="mt-3 h-3 rounded-full bg-surface-3 border border-border overflow-hidden">
                          <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-deep))] transition-all duration-700" style={{ width: `${focusMod.lessons.length ? Math.round((modDone / focusMod.lessons.length) * 100) : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <Link href="/revision" className="qf-card-flat p-5 block press hover:border-info transition-colors group">
                  <div className="flex items-center justify-between">
                    <span className="icon-tile icon-tile-sm icon-tile-violet"><Undo2 className="h-5 w-5" /></span>
                    <ArrowRight className="h-4 w-4 text-faint group-hover:text-info transition-colors" />
                  </div>
                  <p className="mt-2.5 text-sm font-extrabold">{dueCount > 0 ? `${dueCount} cards due for review` : 'Nothing due right now'}</p>
                  <p className="mt-0.5 text-xs font-semibold text-muted">Spaced repetition keeps passed lessons mastered.</p>
                </Link>
                <Link href="/planner" className="qf-card-flat p-5 block press hover:border-info transition-colors group">
                  <div className="flex items-center justify-between">
                    <span className="icon-tile icon-tile-sm icon-tile-warning"><Timer className="h-5 w-5" /></span>
                    <ArrowRight className="h-4 w-4 text-faint group-hover:text-info transition-colors" />
                  </div>
                  <p className="mt-2.5 text-sm font-extrabold">Plan the week</p>
                  <p className="mt-0.5 text-xs font-semibold text-muted">A realistic schedule from your constraints.</p>
                </Link>
              </aside>
            </div>
          ) : (
            <LearningPath map={map} progress={progressMap} currentLessonId={nextLesson?.id} />
          )}
        </section>

        {/* Quick actions grid */}
        <section className="mt-10">
          <SectionHead icon={Sparkles} tone="info" title="More to do" right={<span className="chip">6 shortcuts</span>} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ActionCard href="/diagnostic" title="Diagnostic assessment" desc="Baseline across 7 areas; finds gaps and recommends your starting point." icon={BookOpenCheck} />
            <ActionCard href="/practice" title="Code practice" desc={`${problemCount} judged problems. Genuine C++ compilation and Python execution.`} icon={Code2} />
            <ActionCard href="/drills" title="Mental math drills" desc="Timed arithmetic sessions with accuracy and speed tracking." icon={Timer} />
            <ActionCard href="/revision" title={revisionTitle} desc="SM-2 spaced repetition on formulas, concepts and missed questions." icon={Undo2} />
            <ActionCard href="/projects" title="Projects" desc={`${projectCount} portfolio projects with milestones and evaluation criteria.`} icon={FolderKanban} />
            <ActionCard href="/analytics" title="Analytics" desc="Study hours, mastery by subject, accuracy trends and bottlenecks." icon={BarChart3} />
          </div>
        </section>

        {/* recent lessons (local) */}
        <section className="mt-10">
          <SectionHead icon={BookOpenCheck} tone="violet" title="Recent activity" right={<span className="chip tnum">{recentLessons.length} shown</span>} />
          <div className="qf-card-flat divide-y">
            {recentLessons.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted">Nothing yet. Your lesson and practice activity shows up here.</div>
            )}
            {recentLessons.map(([lessonId, l]) => {
              const node = graph.byId.get(lessonId);
              return (
                <Link key={lessonId} href={`/learn/${lessonId}`} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-2/50 transition-colors">
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="h-8 w-8 shrink-0 rounded-xl bg-accent-soft flex items-center justify-center">
                      <BookOpenCheck className="h-4 w-4 text-accent-deep dark:text-accent" />
                    </span>
                    <span className="truncate text-sm font-semibold">{node?.title ?? lessonId}</span>
                  </span>
                  <span className={`chip tnum shrink-0 ${l.status === 'mastered' || l.status === 'passed' ? 'chip-success' : l.status === 'needs_revision' ? 'chip-danger' : 'chip-warning'}`}>
                    {l.status.replace(/_/g, ' ')} · {Math.round(l.kcBestPct)}%
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* weekly activity */}
        <section className="mt-10">
          <SectionHead icon={TrendingUp} tone="info" title="Weekly activity" right={<span className="chip tnum">{week} min total</span>} />
          <div className="qf-card p-5">
            <div className="flex items-end gap-3 min-h-32 border-b-2 border-border pb-2" role="img" aria-label={`Study minutes per day: ${last7.map(d => `${d.day} ${d.min}`).join(', ')}`}>
              {last7.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 min-w-0 h-28">
                  <span className="text-xs font-black tnum text-muted">{d.min > 0 ? d.min : ''}</span>
                  <div
                    className={`w-full rounded-t-lg ${d.min > 0 ? 'bg-accent' : 'bg-surface-3'} anim-slide-up`}
                    style={{ height: `${Math.max((d.min / bestDay) * 82, 8)}%`, animationDelay: `${i * 60}ms` }}
                    title={`${d.day}: ${d.min} min`}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              {last7.map((d, i) => <span key={i} className="flex-1 text-center text-xs font-extrabold text-faint">{d.day}</span>)}
            </div>
            <p className="mt-3 text-sm font-semibold text-muted">
              {activeDays > 0
                ? `You studied on ${activeDays} of the last 7 days. ${week} minutes total.`
                : 'No study time recorded this week yet. One 6-minute lesson changes this chart.'}
            </p>
          </div>
        </section>

        {/* next milestone closing block */}
        <section className="mt-10">
          <ClosingCta
            icon={TrophyIcon}
            tone="gold"
            title={`${milestone.left} lessons to finish ${milestone.title}`}
            line={`${milestone.done} of ${milestone.total} lessons in this phase are behind you. Finish it to open the next one.`}
            cta={nextLesson ? <Link href={`/learn/${nextLesson.id}`} className="btn3d">Continue the phase</Link> : <Link href="/curriculum" className="btn3d">Open the curriculum</Link>}
            ghost={<Link href="/planner" className="btn3d btn3d-ghost">Plan my week</Link>}
            pose="cheer"
          />
        </section>
      </div>
    </div>
  );
}

function GoalRing({ pct, level, done }: { pct: number; level: number; done: boolean }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex items-center justify-center" title={`Level ${level} · daily goal ${pct}%`}>
      <svg width="60" height="60" viewBox="0 0 60 60" className="-rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
        <circle
          cx="30" cy="30" r={r} fill="none"
          stroke={done ? 'var(--accent)' : 'var(--info)'}
          strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        {done ? <CheckCircle2 className="h-5 w-5 text-accent anim-bounce-in" /> : <span className="text-[13px] font-black tnum">{pct}%</span>}
      </span>
    </span>
  );
}

function ActionCard({ href, title, desc, icon: Icon }: { href: string; title: string; desc: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link href={href} className="qf-card-flat p-4 hover:border-info transition-colors press group">
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-info" />
        <ArrowRight className="h-4 w-4 text-faint group-hover:text-info transition-colors" />
      </div>
      <h3 className="mt-2 font-extrabold text-sm">{title}</h3>
      <p className="mt-1 text-xs font-semibold text-muted leading-relaxed">{desc}</p>
    </Link>
  );
}
