import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getCurriculumGraph, getMap, getRegistry, listProblems, listProjects } from '@/lib/content';
import { AppShell } from '@/components/app-shell';
import { getGamificationSummary } from '@/lib/gamification';
import { LearningPath } from '@/components/gamified/learning-path';
import { sm2 } from '@/lib/mastery';
import {
  ArrowRight, BookOpenCheck, Code2, Timer, Undo2, FolderKanban, BarChart3,
  CircleDot, Zap, Play, CheckCircle2, Trophy, Sparkles, Star,
} from 'lucide-react';

export const metadata = { title: 'Home — QuantFoundry' };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');

  const graph = getCurriculumGraph();
  const map = getMap();
  const reg = getRegistry();
  const publishedIds = reg.lessons.map(l => l.id);

  const [progressRows, dueCards, drillRows, attemptRows, projectRows, assessmentsDone, gamed] = await Promise.all([
    db.lessonProgress.findMany({ where: { userId: user.id } }),
    db.cardState.findMany({ where: { userId: user.id, dueAt: { lte: new Date() } } }),
    db.drillSession.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 7 }),
    db.problemAttempt.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.projectProgress.findMany({ where: { userId: user.id } }),
    db.assessmentAttempt.findMany({ where: { userId: user.id }, orderBy: { submittedAt: 'desc' }, take: 5 }),
    getGamificationSummary(user.id),
  ]);

  const progress = new Map(progressRows.map(p => [p.lessonId, { status: p.status }]));
  const passed = progressRows.filter(p => ['passed', 'mastered'].includes(p.status));
  const mastered = progressRows.filter(p => p.status === 'mastered');
  const needsRevision = progressRows.filter(p => p.status === 'needs_revision');
  const passedSet = new Set(passed.map(p => p.lessonId));

  // recommended next: first unlocked, not passed, published, topo order
  const recommendations = graph.order
    .filter(id => publishedIds.includes(id) && !passedSet.has(id))
    .filter(id => graph.byId.get(id)!.prereqs.every(p => passedSet.has(p)))
    .slice(0, 3);
  const nextLesson = recommendations[0]
    ? graph.byId.get(recommendations[0])!
    : null;

  // which phase should the path spotlight?
  const focusPhaseId = nextLesson
    ? map.phases.find(ph => ph.modules.some(m => m.lessons.some(l => l.id === nextLesson.id)))?.id
    : undefined;
  const focusModuleId = nextLesson
    ? map.phases.flatMap(p => p.modules).find(m => m.lessons.some(l => l.id === nextLesson.id))?.id
    : undefined;

  // quests from today's XP ledger
  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
  const todayEvents = await db.xpEvent.findMany({
    where: { userId: user.id, createdAt: { gte: startOfDay } },
    select: { source: true, amount: true },
  });
  const lessonsPassedToday = todayEvents.filter(e => e.source === 'lesson_pass').length;
  const practiceToday = todayEvents.filter(e => ['problem', 'drill', 'assessment'].includes(e.source)).length;
  const quests = [
    { icon: Zap, label: `Earn ${gamed.dailyGoalXp} XP`, have: gamed.todayXp, need: gamed.dailyGoalXp, href: '/curriculum' },
    { icon: BookOpenCheck, label: 'Pass 1 lesson', have: Math.min(lessonsPassedToday, 1), need: 1, href: '/curriculum' },
    { icon: Code2, label: 'Practise: solve or drill', have: Math.min(practiceToday, 1), need: 1, href: '/practice' },
  ];

  const solvedProblems = new Set(attemptRows.filter(a => a.status === 'passed').map(a => a.problemSlug));
  const problems = listProblems();
  const projects = listProjects();

  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const sessions = await db.learningSession.findMany({ where: { userId: user.id, createdAt: { gte: weekAgo } } });
  const weekMinutes = Math.round(sessions.reduce((n, s) => n + s.seconds, 0) / 60);
  const drillAccuracy = drillRows.length
    ? Math.round((drillRows.reduce((n, d) => n + d.correct, 0) / Math.max(drillRows.reduce((n, d) => n + d.total, 0), 1)) * 100)
    : null;

  const goalPct = Math.min(100, Math.round((gamed.todayXp / Math.max(gamed.dailyGoalXp, 1)) * 100));
  const revisionTitle = dueCards.length > 0 ? `Revision (${dueCards.length} due)` : 'Revision';
  const practiceDesc = `${problems.length} judged problems. Genuine C++ compilation and Python execution.`;
  const projectsDesc = `${projects.length} portfolio projects with milestones and evaluation criteria.`;

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
        {/* header row: greeting + goal ring */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Hey {user.name.split(' ')[0]} {passedSet.size === 0 && '👋'}
            </h1>
            <p className="mt-1 text-sm font-semibold text-muted">
              {nextLesson
                ? 'One focused session at a time. Your path is ready below.'
                : passedSet.size === 0
                  ? 'New here? Take the diagnostic to find your baseline, or just start the first lesson.'
                  : 'Everything unlocked is passed — the graph opens up as you clear prerequisites.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hud-pill !py-1.5" title="Current level">
              <Star className="h-5 w-5 text-violet" />
              <span className="text-base tnum">{gamed.level}</span>
            </div>
            <GoalRing pct={goalPct} level={gamed.level} done={gamed.goalReached} />
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
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-accent-deep dark:text-accent">Pick up where you left off</p>
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
        <section className="mt-6" aria-label="Daily quests">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-faint mb-3 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-warning" /> Daily quests
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {quests.map(q => {
              const done = q.have >= q.need;
              return (
                <Link key={q.label} href={q.href} className={`qf-card-flat p-4 press flex items-center gap-3.5 ${done ? 'anim-pop-in' : ''}`}>
                  <span className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center ${done ? 'bg-accent text-white' : 'bg-warning-soft text-warning-strong dark:text-warning'}`}>
                    {done ? <CheckCircle2 className="h-6 w-6" /> : <q.icon className="h-6 w-6" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold truncate">{q.label}</p>
                    <div className="mt-1.5 h-2.5 gauge-track">
                      <div className={`gauge-fill ${done ? 'bg-accent' : 'bg-warning'}`} style={{ width: `${Math.min(100, (q.have / q.need) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] font-bold text-faint tnum">{Math.min(q.have, q.need)}/{q.need}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Metrics */}
        <section className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Trophy, label: 'Lessons passed', value: `${passed.length}`, sub: `${mastered.length} mastered · level ${gamed.level}`, cls: 'bg-accent-soft', icls: 'text-accent-deep dark:text-accent' },
            { icon: Code2, label: 'Problems solved', value: `${solvedProblems.size}/${problems.length}`, sub: `${attemptRows.length} submissions`, cls: 'bg-info-soft', icls: 'text-info' },
            { icon: Undo2, label: 'Cards due now', value: `${dueCards.length}`, sub: 'spaced repetition', cls: 'bg-violet-soft', icls: 'text-violet' },
            { icon: Timer, label: 'Study time (7d)', value: `${weekMinutes} min`, sub: drillAccuracy !== null ? `drill accuracy ${drillAccuracy}%` : 'no drills yet', cls: 'bg-warning-soft', icls: 'text-warning-strong dark:text-warning' },
          ].map(m => (
            <div key={m.label} className={`qf-card-flat p-4 ${m.cls}`}>
              <m.icon className={`h-5 w-5 ${m.icls}`} strokeWidth={2.5} />
              <div className="mt-2 text-2xl font-black tnum">{m.value}</div>
              <div className="text-xs font-extrabold text-foreground/80 mt-0.5">{m.label}</div>
              <div className="text-[11px] font-semibold text-muted">{m.sub}</div>
            </div>
          ))}
        </section>

        {/* Needs revision */}
        {needsRevision.length > 0 && (
          <section className="mt-8 qf-card-flat p-4 !border-danger/40 bg-danger-soft/60">
            <h2 className="text-sm font-black text-danger flex items-center gap-2"><CircleDot className="h-4 w-4" /> Needs revision ({needsRevision.length})</h2>
            <ul className="mt-2 space-y-1.5 text-sm font-semibold">
              {needsRevision.slice(0, 5).map(r => {
                const node = graph.byId.get(r.lessonId);
                return node ? (
                  <li key={r.lessonId} className="flex items-center justify-between gap-2">
                    <Link href={`/learn/${r.lessonId}`} className="text-accent-deep dark:text-accent hover:underline">{node.title}</Link>
                    <span className="text-xs text-faint tnum">best {r.kcBestPct}%</span>
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
            <Link href="/curriculum" className="text-sm font-extrabold text-info hover:underline flex items-center gap-1">
              See the full curriculum <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {focusPhaseId && focusModuleId ? (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_290px] gap-6 items-start">
              <div className="min-w-0">
                <LearningPath
                  map={map}
                  progress={progress}
                  phases={[focusPhaseId]}
                  moduleIds={[focusModuleId]}
                  currentLessonId={nextLesson?.id}
                  rail={false}
                />
                <Link href="/curriculum" className="qf-card-flat px-5 py-3.5 flex items-center gap-3.5 press hover:border-info transition-colors mt-6 group">
                  <span className="icon-tile icon-tile-sm icon-tile-info"><FolderKanban className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold">The path continues — 11 phases, 65 modules</span>
                    <span className="block text-xs font-semibold text-muted">Open the full curriculum to see every module, phase and where you stand.</span>
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
                  <p className="mt-2.5 text-sm font-extrabold">{dueCards.length > 0 ? `${dueCards.length} cards due for review` : 'Nothing due right now'}</p>
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
            <LearningPath map={map} progress={progress} currentLessonId={nextLesson?.id} />
          )}
        </section>

        {/* Quick actions grid */}
        <section className="mt-10">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-faint mb-3">More to do</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ActionCard href="/diagnostic" title="Diagnostic assessment" desc="Baseline across 7 areas; identifies gaps and recommends your starting point." icon={BookOpenCheck} />
                        <ActionCard href="/practice" title="Code practice" desc={practiceDesc} icon={Code2} />
            <ActionCard href="/drills" title="Mental math drills" desc="Timed arithmetic sessions with accuracy and speed tracking." icon={Timer} />
                        <ActionCard href="/revision" title={revisionTitle} desc="SM-2 spaced repetition on formulas, concepts and missed questions." icon={Undo2} />
                        <ActionCard href="/projects" title="Projects" desc={projectsDesc} icon={FolderKanban} />
            <ActionCard href="/analytics" title="Analytics" desc="Study hours, mastery by subject, accuracy trends and bottlenecks." icon={BarChart3} />
          </div>
        </section>

        {/* recent activity */}
        <section className="mt-10">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-faint mb-3">Recent activity</h2>
          <div className="qf-card-flat divide-y">
            {gamed.recentEvents.slice(0, 4).map((e, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-2/50 transition-colors">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="h-8 w-8 shrink-0 rounded-xl bg-warning-soft flex items-center justify-center">
                    <Zap className="h-4 w-4 text-warning" />
                  </span>
                  <span className="truncate text-sm font-semibold">{e.detail ?? e.source.replace(/_/g, ' ')}</span>
                </span>
                <span className="chip chip-warning tnum shrink-0">+{e.amount} XP</span>
              </div>
            ))}
            {attemptRows.slice(0, 3).map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-2/50 transition-colors">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="h-8 w-8 shrink-0 rounded-xl bg-info-soft flex items-center justify-center">
                    <Code2 className="h-4 w-4 text-info" />
                  </span>
                  <span className="truncate text-sm font-semibold">Submitted <Link href={`/practice/${a.problemSlug}`} className="text-info hover:underline">{a.problemSlug.replace(/-/g, ' ')}</Link> in {a.language}</span>
                </span>
                <span className={`chip tnum shrink-0 ${a.status === 'passed' ? 'chip-success' : 'chip-danger'}`}>{a.passedTests}/{a.totalTests} tests</span>
              </div>
            ))}
            {drillRows.slice(0, 2).map(d => (
              <div key={`d${d.id}`} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-2/50 transition-colors">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="h-8 w-8 shrink-0 rounded-xl bg-accent-soft flex items-center justify-center">
                    <Timer className="h-4 w-4 text-accent-deep dark:text-accent" />
                  </span>
                  <span className="truncate text-sm font-semibold">Drill session: {d.mode} (level {d.level})</span>
                </span>
                <span className="chip chip-info tnum shrink-0">{d.correct}/{d.total} · {Math.round(d.avgMs)}ms avg</span>
              </div>
            ))}
            {assessmentsDone.slice(0, 2).map(a => (
              <div key={`a${a.id}`} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-2/50 transition-colors">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="h-8 w-8 shrink-0 rounded-xl bg-violet-soft flex items-center justify-center">
                    <BookOpenCheck className="h-4 w-4 text-violet" />
                  </span>
                  <span className="truncate text-sm font-semibold">Assessment: {a.assessmentId.replace(/-/g, ' ')}</span>
                </span>
                <span className="chip chip-info tnum shrink-0">{Math.round(a.scorePct)}%</span>
              </div>
            ))}
            {attemptRows.length + drillRows.length + assessmentsDone.length + gamed.recentEvents.length === 0 && (
              <div className="px-4 py-6 text-center text-faint font-semibold">No activity yet — everything you do is recorded here.</div>
            )}
          </div>
        </section>

        {/* project statuses */}
        {projectRows.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-faint mb-3">Active projects</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {projectRows.map(p => (
                <Link key={p.id} href={`/projects/${p.projectSlug}`} className="qf-card-flat p-4 flex items-center gap-3.5 press hover:border-info transition-colors">
                  <span className="h-10 w-10 shrink-0 rounded-2xl bg-violet-soft flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-violet" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold truncate text-info">{p.projectSlug.replace(/-/g, ' ')}</span>
                    <span className="block text-xs font-semibold text-muted tnum">{p.milestonesDone} milestones · {p.status.replace('_', ' ')}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
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
