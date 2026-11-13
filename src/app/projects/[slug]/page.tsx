import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getProject, getCurriculumGraph, type LessonNode } from '@/lib/content';
import { AppShell } from '@/components/app-shell';
import { BlockRenderer } from '@/components/lesson-blocks';
import { ProjectTracker } from '@/components/project-tracker';
import { ProjectTabs } from '@/components/project-tabs';
import {
  ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Clock, FileCode2, FileText,
  Flag, Info, Lightbulb, ListChecks, Lock, Rocket, Scale, Trophy, Zap,
} from 'lucide-react';

const TIER_META: Record<string, { tile: string; chip: string; icon: typeof BookOpen }> = {
  core: { tile: 'icon-tile-info', chip: 'chip-info', icon: BookOpen },
  advanced: { tile: 'icon-tile-gold', chip: 'chip-warning', icon: Trophy },
  capstone: { tile: 'icon-tile-danger', chip: 'chip-danger', icon: Rocket },
};

const SLIDE_DELAYS = ['0ms', '60ms', '120ms', '180ms', '240ms', '300ms'];

/** Split stored markdown into paragraph and list blocks so bullet lists render as lists. */
function mdBlocks(text: string) {
  return text.split(/\n{2,}/).flatMap(chunk => {
    const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
    const out: Array<{ type: 'p'; md: string } | { type: 'list'; ordered: boolean; items: string[] }> = [];
    let para: string[] = [];
    let items: string[] = [];
    const flushPara = () => { if (para.length) out.push({ type: 'p', md: para.join(' ') }); para = []; };
    const flushItems = () => { if (items.length) out.push({ type: 'list', ordered: false, items }); items = []; };
    for (const l of lines) {
      if (/^[-*] /.test(l)) { flushPara(); items.push(l.slice(2)); }
      else if (items.length) { items[items.length - 1] += ' ' + l; }
      else para.push(l);
    }
    flushPara(); flushItems();
    return out;
  });
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/projects/${slug}`);

  const project = getProject(slug);
  if (!project) notFound();

  const graph = getCurriculumGraph();
  const progress = await db.projectProgress.findUnique({
    where: { userId_projectSlug: { userId: user.id, projectSlug: slug } },
  });

  const prereqNodes = project.prereqLessons.map(id => graph.byId.get(id)).filter((n): n is LessonNode => !!n);
  const prereqProgress = prereqNodes.length
    ? await db.lessonProgress.findMany({
        where: { userId: user.id, lessonId: { in: prereqNodes.map(n => n.id) }, status: { in: ['passed', 'mastered'] } },
      })
    : [];
  const prereqDone = new Set(prereqProgress.map(r => r.lessonId));

  const totalHours = project.milestones.reduce((n, m) => n + m.estHours, 0);
  const totalXP = totalHours * 60;
  const doneCount = Math.min(progress?.milestonesDone ?? 0, project.milestones.length);
  const tier = TIER_META[project.difficulty] ?? TIER_META.core;
  const TierIcon = tier.icon;

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
        <nav className="text-[13px] text-faint mb-3 font-semibold">
          <Link href="/projects" className="hover:text-muted">Projects</Link> › {project.title}
        </nav>

        {/* hero */}
        <header className="qf-card p-6 anim-pop-in">
          <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
            <span className={`icon-tile ${tier.tile}`}><TierIcon /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black uppercase tracking-[0.14em] text-faint">Project {project.order}</p>
              <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">{project.title}</h1>
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <span className={`chip ${tier.chip} capitalize`}>{project.difficulty}</span>
                <span className="chip">{project.language.replace('-', ' + ')}</span>
                <span className="chip tnum"><Clock className="h-3 w-3" /> ~{totalHours}h</span>
                <span className="chip chip-warning tnum"><Zap className="h-3 w-3" /> {totalXP} XP</span>
                {progress?.status === 'completed' && (
                  <span className="chip chip-success anim-pop-in"><CheckCircle2 className="h-3 w-3" /> completed</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* tracker: progress + status + milestones stepper */}
        <ProjectTracker
          slug={slug}
          milestones={project.milestones.map(m => ({ title: m.title, estHours: m.estHours }))}
          initialDone={Math.min(progress?.milestonesDone ?? 0, project.milestones.length)}
          initialStatus={progress?.status ?? 'not_started'}
          initialNotes={progress?.notes ?? ''}
        />

        <ProjectTabs labels={['Overview', 'Milestones', 'Starter files', 'Criteria']} counts={['', project.milestones.length, project.starterFiles.length, '']}>
        <div>
        {/* prerequisites */}
        {prereqNodes.length > 0 && (
          <section className="mt-8">
            <div className="section-head">
              <span className="icon-tile icon-tile-sm icon-tile-info"><BookOpen /></span>
              <h2>Prerequisite lessons</h2>
              <span className="chip ml-auto tnum">{prereqDone.size}/{prereqNodes.length} ready</span>
            </div>
            <div className="space-y-2.5">
              {prereqNodes.map((n, i) => {
                const isDone = prereqDone.has(n.id);
                return (
                  <Link
                    key={n.id}
                    href={`/learn/${n.id}`}
                    className="row-card anim-slide-up"
                    style={{ animationDelay: SLIDE_DELAYS[i % SLIDE_DELAYS.length] }}
                  >
                    <span className={`icon-tile icon-tile-sm ${isDone ? 'icon-tile-accent' : 'icon-tile-info'}`}><BookOpen /></span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px] truncate">{n.title}</p>
                      <p className="text-[13px] text-faint mt-0.5">{n.moduleTitle}</p>
                    </div>
                    {isDone ? <CheckCircle2 className="h-5 w-5 text-accent shrink-0" /> : <Lock className="h-4 w-4 text-faint shrink-0" />}
                    <ChevronRight className="h-4 w-4 text-faint shrink-0" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* context + problem statement, side by side on desktop */}
        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="qf-card p-5 anim-slide-up relative overflow-hidden">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent-soft" aria-hidden />
            <div className="relative">
              <div className="section-head">
                <span className="icon-tile icon-tile-sm icon-tile-accent"><Info /></span>
                <h2>Context</h2>
              </div>
              <div className="prose-qf text-[15px]"><BlockRenderer block={{ type: 'p', md: project.context }} /></div>
            </div>
          </div>
          <div className="qf-card p-5 anim-slide-up relative overflow-hidden">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-info-soft" aria-hidden />
            <div className="relative">
              <div className="section-head">
                <span className="icon-tile icon-tile-sm icon-tile-info"><FileText /></span>
                <h2>Problem statement</h2>
              </div>
              <div className="prose-qf text-[15px]">{mdBlocks(project.problem).map((b, i) => <BlockRenderer key={i} block={b} />)}</div>
            </div>
          </div>
        </section>

        {/* requirements */}
        <section className="mt-8">
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-accent"><ListChecks /></span>
            <h2>Requirements</h2>
            <span className="chip ml-auto tnum">{project.requirements.length}</span>
          </div>
          <div className="qf-card p-2.5 sm:p-4">
            <ul className="space-y-1">
              {project.requirements.map((r, i) => (
                <li key={i} className="flex gap-3 items-start rounded-xl px-3 py-2.5 hover:bg-surface-2/60 transition-colors">
                  <span className="h-6 w-6 shrink-0 rounded-lg bg-accent-soft text-accent-deep dark:text-accent text-[12px] font-black tnum flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="text-[15px] font-semibold leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        </div>
        <div>
        {/* milestones detail */}
        <section className="mt-8">
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-info"><Flag /></span>
            <h2>Milestones</h2>
            <span className="chip ml-auto tnum">{project.milestones.length} · ~{totalHours}h</span>
          </div>
          <ol className="relative space-y-3 before:absolute before:left-8 before:top-4 before:bottom-4 before:w-0.5 before:rounded-full before:bg-border" aria-label="Milestone timeline">
            {project.milestones.map((m, i) => {
              const isDone = i < doneCount;
              return (
                <li
                  key={i}
                  className="qf-card-flat p-4 flex gap-3 anim-slide-up hover:-translate-y-0.5 hover:shadow-md transition-all relative"
                  style={{ animationDelay: SLIDE_DELAYS[i % SLIDE_DELAYS.length] }}
                >
                  <span
                    className={`w-8 h-8 rounded-full font-black text-[15px] flex items-center justify-center shrink-0 tnum z-10 ring-4 ring-surface ${
                      isDone ? 'bg-accent text-white' : 'border-2 border-border-strong bg-surface text-faint'
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className={`font-bold text-[15px] ${isDone ? 'text-accent-deep dark:text-accent' : ''}`}>{m.title}</h3>
                      <span className={`chip tnum ${isDone ? 'chip-success' : ''}`}><Clock className="h-3 w-3" /> ~{m.estHours}h{isDone ? ' · done' : ''}</span>
                    </div>
                    <p className="mt-1 text-[15px] text-muted leading-relaxed">{m.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* design guidance */}
        <section className="mt-8">
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-gold"><Lightbulb /></span>
            <h2>Design guidance</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {project.designGuidance.map((b, i) => (
              <div key={i} className="qf-card-flat p-5 prose-qf text-[15px]"><BlockRenderer block={b} /></div>
            ))}
          </div>
        </section>

        </div>
        <div>
        {/* starter files */}
        {project.starterFiles.length > 0 && (
          <section className="mt-8">
            <div className="section-head">
              <span className="icon-tile icon-tile-sm icon-tile-violet"><FileCode2 /></span>
              <h2>Starter files</h2>
              <span className="chip ml-auto tnum">{project.starterFiles.length}</span>
            </div>
            {project.starterFiles.map(f => (
              <figure key={f.path} className="mt-3">
                <figcaption className="text-[13px] text-faint mb-1 flex items-center gap-1.5 font-semibold"><FileCode2 className="h-3 w-3" /> {f.path}</figcaption>
                <div className="code-block"><code>{f.content}</code></div>
              </figure>
            ))}
          </section>
        )}

        </div>
        <div>
        {/* evaluation criteria */}
        <section className="mt-8">
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-danger"><Scale /></span>
            <h2>Evaluation criteria</h2>
          </div>
          <div className="qf-card p-2 sm:p-4 overflow-x-auto thin-scroll">
            <table className="qf-table">
              <thead>
                <tr><th>Criterion</th><th className="w-20">Weight</th></tr>
              </thead>
              <tbody>
                {project.evaluationCriteria.map((c, i) => (
                  <tr key={i}>
                    <td>{c.criterion}</td>
                    <td className="tnum font-bold">{c.weight}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* documentation */}
        <section className="mt-8">
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-info"><FileText /></span>
            <h2>Documentation requirements</h2>
          </div>
          <div className="qf-card p-2.5 sm:p-4">
            <ul className="space-y-1">
              {project.documentationRequirements.map((d, i) => (
                <li key={i} className="flex gap-3 items-start rounded-xl px-3 py-2.5 hover:bg-surface-2/60 transition-colors">
                  <span className="h-6 w-6 shrink-0 rounded-lg bg-info-soft text-info text-[12px] font-black tnum flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="text-[15px] font-semibold leading-relaxed">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* extension challenges */}
        <section className="mt-8">
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-violet"><Rocket /></span>
            <h2>Extension challenges</h2>
            <span className="chip ml-auto">Optional · for the ambitious</span>
          </div>
          <div className="qf-card p-5">
            <ul className="prose-qf list-disc pl-5 space-y-1.5 text-[15px]">
              {project.extensionChallenges.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </section>

        </div>
        </ProjectTabs>

        {/* closing CTA */}
        <section className="mt-10 rounded-2xl border-2 border-accent bg-accent-soft p-5 sm:p-6 anim-slide-up">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <span className="icon-tile bg-surface text-accent-deep dark:text-accent"><Trophy /></span>
              <div>
                <h2 className="font-extrabold text-lg tracking-tight">Build it, ship it, show it</h2>
                <p className="text-[15px] text-muted">Log milestones as you go, honest notes and reproducible benchmarks become the evidence employers ask about.</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link href="/projects" className="btn3d btn3d-ghost btn3d-sm">All projects</Link>
              <Link href="/curriculum" className="btn3d">
                Open curriculum <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
