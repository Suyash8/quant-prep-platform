'use client';

/**
 * v3 dashboard: renders from the local progress store + content packs.
 * Instant on every visit, works offline, syncs in the background.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, BookOpenCheck, Code2, Timer, Undo2, FolderKanban, BarChart3,
  Hand, CircleDot, Zap, Play, CheckCircle2, Trophy, Sparkles, Star, Award, Shield, Flame,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CurriculumMap } from '@/lib/content';
import { buildCurriculumGraph, type RegistryEntry } from '@/lib/curriculum-graph';
import { getMapPack, getProblemsIndex, getProjectsIndex } from '@/lib/client/packs';
import {
  getState, subscribe, hydrate, doneSet, xpSummary, dueCardKeys, weekMinutes, setDailyGoalXp,
} from '@/lib/client/local-state';
import { LearningPath } from '@/components/gamified/learning-path';

export function DashboardClient({ name = 'Learner' }: { name?: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState(name);
  const [map, setMap] = React.useState<CurriculumMap | null>(null);
  const [registryLessons, setRegistryLessons] = React.useState<RegistryEntry[]>([]);
  const [, setTick] = React.useState(0);
  const [problemCount, setProblemCount] = React.useState(0);
  const [projectCount, setProjectCount] = React.useState(12);
  const [streakFreezes, setStreakFreezes] = React.useState<number>(0);
  const [onboardingOpen, setOnboardingOpen] = React.useState(false);
  const [onboardStep, setOnboardStep] = React.useState(1);
  const [onboardTrack, setOnboardTrack] = React.useState<'A' | 'B' | 'C' | 'D' | 'E'>('B');
  const [onboardGoal, setOnboardGoal] = React.useState(50);
  const [onboardTz, setOnboardTz] = React.useState('UTC');
  const [onboardSaving, setOnboardSaving] = React.useState(false);

  React.useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setOnboardTz(tz);
    } catch { /* ignore */ }
  }, []);

  React.useEffect(() => {
    let alive = true;
    const syncName = () => {
      try {
        const raw = window.localStorage.getItem('qf-chrome-user');
        if (raw) {
          const u = JSON.parse(raw) as { name?: string };
          if (u?.name) setDisplayName(u.name);
        }
      } catch { /* ignore */ }
    };
    syncName();
    window.addEventListener('qf:auth-refresh', syncName);
    void hydrate();
    fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.user) return;
        setStreakFreezes(d.user.streakFreezes ?? 0);
        if (d.user.onboardingDone === false) setOnboardingOpen(true);
      })
      .catch(() => {});
    getMapPack().then(({ map: m, registry }) => {
      if (!alive) return;
      setMap(m as CurriculumMap);
      setRegistryLessons((registry as { lessons: RegistryEntry[] }).lessons ?? []);
    }).catch(() => {});
    getProblemsIndex().then(p => { if (alive) setProblemCount(p.length); }).catch(() => {});
    getProjectsIndex().then(p => { if (alive) setProjectCount(p.length); }).catch(() => {});
    const unsub = subscribe(() => setTick(t => t + 1));
    return () => { alive = false; unsub(); window.removeEventListener('qf:auth-refresh', syncName); };
  }, []);

  async function completeOnboarding(goDiagnostic: boolean) {
    setOnboardSaving(true);
    setDailyGoalXp(onboardGoal);
    try {
      await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyGoalXp: onboardGoal,
          targetTrack: onboardTrack,
          timezone: onboardTz,
          onboardingDone: true,
        }),
      });
    } catch { /* saved locally */ } finally {
      setOnboardSaving(false);
      setOnboardingOpen(false);
      toast.success('Study plan configured!');
      if (goDiagnostic) router.push('/diagnostic');
    }
  }

  const s = getState();
  const gam = xpSummary();

  React.useEffect(() => {
    if (!map) return;
    try {
      const prevRaw = window.localStorage.getItem('qf-last-level');
      const prevLevel = prevRaw ? Number(prevRaw) : gam.level;
      if (Number.isFinite(prevLevel) && gam.level > prevLevel) {
        toast.success(`Level up! Welcome to Level ${gam.level}.`);
      }
      window.localStorage.setItem('qf-last-level', String(gam.level));
    } catch { /* ignore */ }
  }, [map, gam.level]);

  if (!map) {
    return (
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8 animate-pulse" aria-busy="true">
        <div className="h-9 w-72 bg-surface-2 rounded mb-8" />
        <div className="h-28 bg-surface-2 rounded-2xl mb-6" />
        <div className="grid sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-surface-2 rounded-xl" />)}
        </div>
      </div>
    );
  }
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
  const progressMap = new Map(Object.entries(s.lessons).map(([id, l]) => [id, { status: l.status }]));

  const recentLessons = Object.entries(s.lessons)
    .filter(([, l]) => l.status !== 'not_started')
    .sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt))
    .slice(0, 5);

  const diagnosticTaken = Boolean(s.assessments['diag-core']);
  const phase0 = map.phases[0];
  const phase0Done = phase0 ? phase0.modules.every(m => m.lessons.every(l => passedSet.has(l.id))) : false;
  const achievements = [
    { id: 'first-lesson', title: 'First Breakthrough', desc: 'Pass your first lesson (80%+)', unlocked: passed.length >= 1, icon: BookOpenCheck },
    { id: 'first-code', title: 'First Green Judge', desc: 'Solve a coding problem cleanly', unlocked: solvedProblems.size >= 1, icon: Code2 },
    { id: 'diag-done', title: 'Calibrated', desc: 'Complete the baseline diagnostic', unlocked: diagnosticTaken, icon: Shield },
    { id: 'streak-3', title: 'On a Roll', desc: 'Reach a 3-day study streak', unlocked: gam.longestStreak >= 3, icon: Flame },
    { id: 'level-5', title: 'Quant Apprentice', desc: 'Reach Level 5 (XP milestones)', unlocked: gam.level >= 5, icon: Star },
    { id: 'phase-0', title: 'Foundation Cleared', desc: 'Complete Phase 0 prerequisites', unlocked: phase0Done, icon: Award },
  ];

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
        {/* header row: greeting + goal ring */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Hey {displayName.split(' ')[0]} {passedSet.size === 0 && <Hand className="inline-block h-7 w-7 align-text-bottom text-accent-ink" aria-hidden="true" />}
            </h1>
            <p className="mt-1 text-[15px] font-semibold text-muted">
              {nextLesson
                ? 'One focused session at a time. Your path is ready below.'
                : passedSet.size === 0
                  ? 'New here? Take the diagnostic to find your baseline, or just start the first lesson.'
                  : 'Everything unlocked is passed, the graph opens up as you clear prerequisites.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {streakFreezes > 0 && (
              <div className="hud-pill !py-1.5" title="Streak freezes protect your streak for 1 missed day">
                <Shield className="h-4 w-4 text-info" />
                <span className="text-sm tnum">{streakFreezes} freeze{streakFreezes === 1 ? '' : 's'}</span>
              </div>
            )}
            <div className="hud-pill !py-1.5" title="Current level">
              <Star className="h-5 w-5 text-violet" />
              <span className="text-base tnum">{gam.level}</span>
            </div>
            <GoalRing pct={goalPct} level={gam.level} done={gam.goalReached} />
          </div>
        </div>

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
                  <p className="text-[12px] font-black uppercase tracking-[0.14em] text-accent-deep dark:text-accent">Pick up where you left off</p>
                  <h2 className="mt-0.5 text-lg font-black tracking-tight">{nextLesson.title}</h2>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <span className="chip chip-info">{nextLesson.moduleTitle}</span>
                    <span className="chip">~{nextLesson.estMinutes} min</span>
                    <span className="chip chip-warning">{nextLesson.difficulty}</span>
                  </div>
                </div>
                <Link href={`/learn/${nextLesson.id}`} className="btn3d text-base shrink-0">
                  CONTINUE <ArrowRight className="h-5 w-5" />
                </Link>
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
                <p className="mt-1.5 text-[15px] font-semibold text-muted max-w-md mx-auto">
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
        <section className="mt-6" aria-label="Daily quests">
          <h2 className="text-[15px] font-black uppercase tracking-[0.12em] text-faint mb-3 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-warning" /> Daily quests
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {quests.map(q => {
              const done = q.have >= q.need;
              const started = q.have > 0;
              return (
                <Link key={q.label} href={q.href} className={`qf-card-flat p-4 press flex items-center gap-3.5 ${done ? 'anim-pop-in' : ''}`}>
                  <span className={`icon-tile icon-tile-sm shrink-0 ${done ? 'icon-tile-accent' : started ? 'icon-tile-warning' : 'icon-tile-neutral'}`}>
                    {done ? <CheckCircle2 /> : <q.icon />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-extrabold truncate">{q.label}</span>
                    {started ? (
                      <span className="block mt-1.5 h-2.5 gauge-track">
                        <span className={`gauge-fill ${done ? 'bg-accent' : 'bg-warning'}`} style={{ width: `${Math.min(100, (q.have / q.need) * 100)}%` }} />
                      </span>
                    ) : (
                      <span className="block mt-1 text-[13px] font-bold text-faint">Not started</span>
                    )}
                  </span>
                  <span className="flex-none text-[13px] font-black tnum text-muted">{Math.min(q.have, q.need)}/{q.need}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Metrics */}
        <section className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Progress metrics">
          {[
            { icon: Trophy, tile: passed.length > 0 ? 'icon-tile-accent' : 'icon-tile-neutral', value: `${passed.length}`, label: 'Lessons passed', sub: `${mastered.length} mastered · level ${gam.level}` },
            { icon: Code2, tile: solvedProblems.size > 0 ? 'icon-tile-info' : 'icon-tile-neutral', value: `${solvedProblems.size}/${problemCount}`, label: 'Problems solved', sub: `${Object.keys(s.problems).length} submissions` },
            { icon: Undo2, tile: dueCount > 0 ? 'icon-tile-info' : 'icon-tile-neutral', value: `${dueCount}`, label: 'Cards due now', sub: 'spaced repetition' },
            { icon: Timer, tile: 'icon-tile-neutral', value: `${week} min`, label: 'Study time (7d)', sub: week === 0 ? 'Start a lesson to log time' : drillAccuracy !== null ? `drill accuracy ${drillAccuracy}%` : 'no drills yet' },
          ].map(m => (
            <div key={m.label} className="stat-tile min-w-0">
              <span className={`icon-tile icon-tile-sm ${m.tile}`}><m.icon strokeWidth={2.5} /></span>
              <div className="stat-body">
                <p className="stat-value tnum">{m.value}</p>
                <p className="stat-label">{m.label}</p>
                <p className="stat-sub">{m.sub}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Needs revision */}
        {needsRevision.length > 0 && (
          <section className="mt-8 qf-card-flat p-4 !border-danger/40 bg-danger-soft/60">
            <h2 className="text-[15px] font-black text-danger flex items-center gap-2"><CircleDot className="h-4 w-4" /> Needs revision ({needsRevision.length})</h2>
            <ul className="mt-2 space-y-1.5 text-[15px] font-semibold">
              {needsRevision.slice(0, 5).map(([lessonId, r]) => {
                const node = graph.byId.get(lessonId);
                return node ? (
                  <li key={lessonId} className="flex items-center justify-between gap-2">
                    <Link href={`/learn/${lessonId}`} className="text-accent-deep dark:text-accent hover:underline">{node.title}</Link>
                    <span className="text-[13px] text-faint tnum">best {Math.round(r.kcBestPct)}%</span>
                  </li>
                ) : null;
              })}
            </ul>
          </section>
        )}

        {/* the path */}
        <section className="mt-10" aria-label="Your learning path">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-black tracking-tight">Your path</h2>
            <Link href="/curriculum" className="text-[15px] font-extrabold text-info-ink hover:underline flex items-center gap-1">
              See the full curriculum <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {focusPhaseId && focusModuleId ? (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_290px] gap-6 items-start">
              <div className="min-w-0">
                <LearningPath
                  map={map}
                  progress={progressMap}
                  phases={[focusPhaseId]}
                  moduleIds={[focusModuleId]}
                  currentLessonId={nextLesson?.id}
                  rail={false}
                />
                <Link href="/curriculum" className="qf-card-flat px-5 py-3.5 flex items-center gap-3.5 press hover:border-info transition-colors mt-6 group">
                  <span className="icon-tile icon-tile-sm icon-tile-info"><FolderKanban className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-extrabold">The path continues, {map.phases.length} phases, {map.phases.reduce((n, p) => n + p.modules.length, 0)} modules</span>
                    <span className="block text-[13px] font-semibold text-muted">Open the full curriculum to see every module, phase and where you stand.</span>
                  </span>
                  <ArrowRight className="h-5 w-5 text-faint group-hover:text-info transition-colors shrink-0" />
                </Link>
              </div>
              <aside className="space-y-4">
                {nextLesson && (() => {
                  const focusMod = map.phases.flatMap(p => p.modules).find(m => m.id === focusModuleId)!;
                  const modDone = focusMod.lessons.filter(l => passedSet.has(l.id)).length;
                  const modMin = focusMod.lessons.reduce((n, l) => n + l.estMinutes, 0);
                  return (
                    <div className="qf-card p-5 relative overflow-hidden">
                      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent-soft" aria-hidden />
                      <div className="relative">
                        <p className="text-[12px] font-black uppercase tracking-[0.14em] text-faint">Current module</p>
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
                  <p className="mt-2.5 text-[15px] font-extrabold">{dueCount > 0 ? `${dueCount} cards due for review` : 'Nothing due right now'}</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-muted">Spaced repetition keeps passed lessons mastered.</p>
                </Link>
                <Link href="/planner" className="qf-card-flat p-5 block press hover:border-info transition-colors group">
                  <div className="flex items-center justify-between">
                    <span className="icon-tile icon-tile-sm icon-tile-warning"><Timer className="h-5 w-5" /></span>
                    <ArrowRight className="h-4 w-4 text-faint group-hover:text-info transition-colors" />
                  </div>
                  <p className="mt-2.5 text-[15px] font-extrabold">Plan the week</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-muted">A realistic schedule from your constraints.</p>
                </Link>
              </aside>
            </div>
          ) : (
            <LearningPath map={map} progress={progressMap} currentLessonId={nextLesson?.id} />
          )}
        </section>

        {/* Quick actions grid */}
        <section className="mt-10">
          <h2 className="text-[15px] font-black uppercase tracking-[0.12em] text-faint mb-3">More to do</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ActionCard href="/diagnostic" title="Diagnostic assessment" desc="Baseline across 7 areas; finds gaps and recommends your starting point." icon={BookOpenCheck} />
            <ActionCard href="/practice" title="Code practice" desc={`${problemCount} judged problems. Genuine C++ compilation and Python execution.`} icon={Code2} />
            <ActionCard href="/drills" title="Mental math drills" desc="Timed arithmetic sessions with accuracy and speed tracking." icon={Timer} />
            <ActionCard href="/revision" title="Revision" desc="SM-2 spaced repetition on formulas, concepts and missed questions." icon={Undo2} badge={dueCount > 0 ? `${dueCount} due` : undefined} />
            <ActionCard href="/projects" title="Projects" desc={`${projectCount} portfolio projects with milestones and evaluation criteria.`} icon={FolderKanban} />
            <ActionCard href="/analytics" title="Analytics" desc="Study hours, mastery by subject, accuracy trends and bottlenecks." icon={BarChart3} />
          </div>
        </section>

        {/* Achievements */}
        <section className="mt-10" aria-label="Achievements">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-black uppercase tracking-[0.12em] text-faint flex items-center gap-1.5">
              <Award className="h-4 w-4 text-warning" /> Milestones
            </h2>
            <span className="chip tnum">{achievements.filter(a => a.unlocked).length}/{achievements.length} unlocked</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {achievements.map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.id}
                  className={`qf-card-flat p-3.5 flex flex-col gap-2 ${a.unlocked ? 'border-accent/50 bg-accent-soft/25' : 'opacity-60'}`}
                >
                  <span className={`icon-tile icon-tile-sm ${a.unlocked ? 'icon-tile-accent' : 'icon-tile-neutral'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[13px] font-black leading-tight">{a.title}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-muted leading-snug">{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* recent lessons (local) */}
        <section className="mt-10">
          <h2 className="text-[15px] font-black uppercase tracking-[0.12em] text-faint mb-3">Recent activity</h2>
          <div className="qf-card-flat divide-y">
            {recentLessons.length === 0 && (
              <div className="px-4 py-3 text-[15px] text-muted">Nothing yet. Your lesson and practice activity shows up here.</div>
            )}
            {recentLessons.map(([lessonId, l]) => {
              const node = graph.byId.get(lessonId);
              return (
                <Link key={lessonId} href={`/learn/${lessonId}`} className="px-4 py-2 flex items-center gap-3 hover:bg-surface-2/50 transition-colors">
                  <span className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="icon-tile icon-tile-sm icon-tile-accent shrink-0"><BookOpenCheck /></span>
                    <span className="truncate text-[15px] font-semibold">{node?.title ?? lessonId}</span>
                  </span>
                  <span className="text-[13px] font-bold text-faint tnum shrink-0">{dayLabel(l.updatedAt)}</span>
                  <span className={`chip tnum shrink-0 ${l.status === 'mastered' || l.status === 'passed' ? 'chip-success' : l.status === 'needs_revision' ? 'chip-danger' : 'chip-warning'}`}>
                    {l.status.replace(/_/g, ' ')} · {Math.round(l.kcBestPct)}%
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {onboardingOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Personalize your study path">
          <div className="qf-card max-w-lg w-full p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <span className="chip chip-accent tnum">Step {onboardStep} of 4</span>
              <button
                type="button"
                onClick={() => void completeOnboarding(false)}
                className="text-[13px] font-bold text-faint hover:text-muted"
              >
                Skip setup
              </button>
            </div>

            {onboardStep === 1 && (
              <div className="space-y-3">
                <h2 className="text-xl font-black tracking-tight">What role are you aiming for?</h2>
                <p className="text-[14px] text-muted font-semibold">We tailor study recommendations and career track weighting around your target.</p>
                <div className="grid gap-2">
                  {[
                    { id: 'A' as const, name: 'Track A · Portfolio & Risk Analytics' },
                    { id: 'B' as const, name: 'Track B · Derivatives & Quant Developer (C++)' },
                    { id: 'C' as const, name: 'Track C · Low-Latency HFT & Core Systems' },
                    { id: 'D' as const, name: 'Track D · Quantitative Research & ML' },
                    { id: 'E' as const, name: 'Track E · Trading Infrastructure & Data' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setOnboardTrack(t.id)}
                      className={`qf-answer-tile text-left ${onboardTrack === t.id ? 'qf-selected' : ''}`}
                    >
                      <span className="qf-answer-badge">{t.id}</span>
                      <span className="font-bold text-[14px]">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {onboardStep === 2 && (
              <div className="space-y-3">
                <h2 className="text-xl font-black tracking-tight">Pick a daily XP commitment</h2>
                <p className="text-[14px] text-muted font-semibold">50 XP is roughly one lesson or two coding sessions per day.</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { xp: 30, label: 'Casual · 15 min/day' },
                    { xp: 50, label: 'Regular · 25 min/day' },
                    { xp: 80, label: 'Serious · 45 min/day' },
                    { xp: 120, label: 'Intense · 60+ min/day' },
                  ].map((g) => (
                    <button
                      key={g.xp}
                      type="button"
                      onClick={() => setOnboardGoal(g.xp)}
                      className={`qf-card-flat p-3.5 text-left ${onboardGoal === g.xp ? 'border-accent bg-accent-soft/40' : ''}`}
                    >
                      <p className="text-lg font-black tnum">{g.xp} XP</p>
                      <p className="text-[12px] font-bold text-muted">{g.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {onboardStep === 3 && (
              <div className="space-y-3">
                <h2 className="text-xl font-black tracking-tight">Confirm your timezone</h2>
                <p className="text-[14px] text-muted font-semibold">Your streak day boundaries and daily XP caps are computed in your local timezone.</p>
                <input
                  type="text"
                  value={onboardTz}
                  onChange={e => setOnboardTz(e.target.value)}
                  className="qf-input w-full"
                  aria-label="Study timezone"
                />
              </div>
            )}

            {onboardStep === 4 && (
              <div className="space-y-3">
                <h2 className="text-xl font-black tracking-tight">How would you like to begin?</h2>
                <p className="text-[14px] text-muted font-semibold">Take the diagnostic to place out of fundamentals you already know, or start cleanly from Phase 0.</p>
                <div className="grid gap-3 pt-1">
                  <button
                    type="button"
                    disabled={onboardSaving}
                    onClick={() => void completeOnboarding(true)}
                    className="btn3d w-full"
                  >
                    Take 10-minute diagnostic (Recommended) <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={onboardSaving}
                    onClick={() => void completeOnboarding(false)}
                    className="btn3d btn3d-ghost w-full"
                  >
                    Start from Phase 0 on Dashboard
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              {onboardStep > 1 ? (
                <button type="button" onClick={() => setOnboardStep(s => s - 1)} className="btn3d btn3d-ghost btn3d-sm">
                  Back
                </button>
              ) : <span />}
              {onboardStep < 4 && (
                <button type="button" onClick={() => setOnboardStep(s => s + 1)} className="btn3d btn3d-sm">
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** compact deterministic date label for the activity list (no locale drift) */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
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

function ActionCard({ href, title, desc, icon: Icon, badge }: { href: string; title: string; desc: string; icon: React.ComponentType<{ className?: string }>; badge?: string }) {
  return (
    <Link href={href} className={`qf-card-flat p-4 hover:border-info transition-colors press group ${badge ? '!border-accent' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`icon-tile icon-tile-sm ${badge ? 'icon-tile-accent' : 'icon-tile-neutral'}`}><Icon /></span>
        <span className="flex items-center gap-2 min-w-0">
          {badge && <span className="chip chip-strong">{badge}</span>}
          <ArrowRight className="h-4 w-4 text-faint group-hover:text-info transition-colors shrink-0" />
        </span>
      </div>
      <h3 className="mt-2.5 font-extrabold text-[15px]">{title}</h3>
      <p className="mt-1 text-[13px] font-semibold text-muted leading-relaxed">{desc}</p>
    </Link>
  );
}
