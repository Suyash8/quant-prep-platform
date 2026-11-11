import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { listProjects, getProject } from '@/lib/content';
import { AppShell, PublicHeader } from '@/components/app-shell';
import {
  ArrowRight, CheckCircle2, Clock, Code2, Flame, Layers, PlayCircle, Rocket, Trophy,
} from 'lucide-react';

export const metadata = { title: 'Projects. QuantFoundry' };

const TIER_META: Record<string, { tile: string; chip: string; icon: typeof Code2 }> = {
  core: { tile: 'icon-tile-info', chip: 'chip-info', icon: Code2 },
  advanced: { tile: 'icon-tile-gold', chip: 'chip-warning', icon: Flame },
  capstone: { tile: 'icon-tile-danger', chip: 'chip-danger', icon: Trophy },
};

const LANG_SKILLS: Record<string, string[]> = {
  'cpp': ['C++', 'Systems design'],
  'python': ['Python', 'Data tooling'],
  'python-cpp': ['Python', 'C++', 'Bindings'],
};

const POP_DELAYS = ['0ms', '70ms', '140ms'];
const SLIDE_DELAYS = ['0ms', '60ms', '120ms', '180ms', '240ms', '300ms'];

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  const projects = listProjects();

  let progressRows: { projectSlug: string; status: string; milestonesDone: number }[] = [];
  if (user) {
    progressRows = await db.projectProgress.findMany({ where: { userId: user.id } });
  }
  const progressBy = new Map(progressRows.map(p => [p.projectSlug, p]));

  const inProgress = progressRows.filter(r => r.status === 'in_progress').length;
  const completed = progressRows.filter(r => r.status === 'completed').length;

  const cards = projects.map(p => {
    const full = getProject(p.slug);
    const hours = full ? full.milestones.reduce((n, m) => n + m.estHours, 0) : 0;
    const milestoneTotal = full ? full.milestones.length : 0;
    // first sentence only, trimmed to a sane length, never cut mid-word


    const raw = full ? full.context.replace(/[#*`>]/g, '').replace(/\s+/g, ' ').trim() : '';
    const firstSentence = raw.split(/(?<=[.!?])\s/)[0] ?? raw;
    const desc = firstSentence.length > 170 ? firstSentence.slice(0, firstSentence.lastIndexOf(' ', 167)).trimEnd() + '…' : firstSentence;
    return { ...p, hours, desc, milestoneTotal };
  });

  const statTiles = [
    { icon: Layers, tile: 'icon-tile-neutral', value: String(projects.length), label: 'Total projects', sub: `across ${Object.keys(TIER_META).length} tiers` },
    { icon: PlayCircle, tile: 'icon-tile-info', value: String(inProgress), label: 'In progress', sub: 'tracked in your account' },
    { icon: CheckCircle2, tile: 'icon-tile-accent', value: String(completed), label: 'Completed', sub: 'defensible line by line' },
  ];

  const body = (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero anim-slide-up">
        <span className="icon-tile icon-tile-violet"><Rocket /></span>
        <div>
          <h1>Projects</h1>
          <p className="page-sub">Build portfolio-grade quant tools</p>
        </div>
      </header>
      <p className="-mt-2.5 mb-6 max-w-3xl text-sm text-muted font-semibold leading-relaxed anim-slide-up">
        Ten projects that progressively combine mathematics, programming, finance and systems. Each has requirements,
        milestones, design guidance, evaluation criteria and extension challenges, the finished portfolio is the
        demonstrable engineering experience employers ask about.
      </p>

      {/* stat row */}
      <section className="grid grid-cols-3 gap-3">
        {statTiles.map((s, i) => (
          <div key={s.label} className="stat-tile min-w-0 anim-pop-in" style={{ animationDelay: POP_DELAYS[i] }}>
            <span className={`icon-tile icon-tile-sm ${s.tile}`}><s.icon /></span>
            <div className="stat-body min-w-0">
              <p className="stat-value tnum">{s.value}</p>
              <p className="stat-label">{s.label}</p>
              <p className="stat-sub">{s.sub}</p>
            </div>
          </div>
        ))}
      </section>

      {/* project cards */}
      <section className="mt-8 grid md:grid-cols-2 gap-4">
        {cards.map((p, i) => {
          const prog = progressBy.get(p.slug);
          const isCompleted = prog?.status === 'completed';
          const isInProgress = prog?.status === 'in_progress';
          const tier = TIER_META[p.difficulty] ?? TIER_META.core;
          const TierIcon = tier.icon;
          const skills = LANG_SKILLS[p.language] ?? [];
          // status edge so cards scan by state: gold for completed, warning
          // stripe for in-progress, muted stripe for not-started
          const edge = isCompleted ? '!border-gold/70'
            : isInProgress ? 'before:absolute before:left-0 before:inset-y-0 before:w-1.5 before:bg-warning before:content-[""]'
            : 'before:absolute before:left-0 before:inset-y-0 before:w-1.5 before:bg-border-strong before:content-[""] opacity-95';
          return (
            <div
              key={p.slug}
              className={`qf-card p-5 flex flex-col min-w-0 relative overflow-hidden anim-slide-up hover:-translate-y-0.5 hover:shadow-lg transition-all ${edge}`}
              style={{ animationDelay: SLIDE_DELAYS[i % SLIDE_DELAYS.length] }}
            >
              {isCompleted && (
                <span className="absolute right-4 top-4 icon-tile icon-tile-gold !h-8 !w-8 anim-bob"><Trophy className="!h-4 !w-4" /></span>
              )}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <span className={`icon-tile ${tier.tile}`}><TierIcon /></span>
                  <span className={`chip ${tier.chip} capitalize`}>{p.difficulty}</span>
                </div>
                {isCompleted ? (
                  <span className="chip chip-gold anim-pop-in"><CheckCircle2 className="h-3 w-3" /> completed</span>
                ) : isInProgress ? (
                  <span className="chip chip-warning">in progress</span>
                ) : (
                  <span className="chip">Not started</span>
                )}
              </div>
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.14em] text-faint">
                Project {p.order} · {p.language.replace('-', ' + ')}
              </p>
              <h2 className="mt-0.5 font-extrabold text-lg tracking-tight">{p.title}</h2>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {skills.map(s => <span key={s} className="chip">{s}</span>)}
                <span className="chip tnum"><Clock className="h-3 w-3" /> ~{p.hours}h</span>
              </div>
              <p className="mt-2.5 text-sm text-muted leading-relaxed line-clamp-2">{p.desc}</p>
              {prog && isInProgress && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider mb-1.5">
                    <span className="text-faint">Milestones</span>
                    <span className="tnum text-warning-strong dark:text-warning">{prog.milestonesDone}/{p.milestoneTotal || 0}</span>
                  </div>
                  {prog.milestonesDone > 0 ? (
                    <div className="prog-track h-2.5">
                      <div className="prog-fill prog-fill-info" style={{ width: `${Math.min(100, Math.round((prog.milestonesDone / Math.max(p.milestoneTotal || 1, 1)) * 100))}%` }} />
                    </div>
                  ) : (
                    <p className="text-[11px] font-bold text-faint">No milestones logged yet</p>
                  )}
                </div>
              )}
              <div className="mt-auto pt-4">
                <Link href={`/projects/${p.slug}`} className="btn3d btn3d-ghost btn3d-sm">
                  Open spec <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {/* closing CTA */}
      <section className="mt-10 rounded-2xl border-2 border-accent bg-accent-soft p-5 sm:p-6 anim-slide-up">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <span className="icon-tile bg-surface text-accent-deep dark:text-accent"><Rocket /></span>
            <div>
              <h2 className="font-extrabold text-lg tracking-tight">Projects are the portfolio, the curriculum is the engine</h2>
              <p className="text-sm text-muted">Stuck on a spec? The phase-by-phase curriculum behind each prerequisite has you covered.</p>
            </div>
          </div>
          <Link href="/curriculum" className="btn3d">
            Open the curriculum <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
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
