'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import {
  ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Clock, Code2,
  FileCode2, FileText, Flag, Flame, Info, Lightbulb, ListChecks, Lock,
  Rocket, Scale, Trophy, Zap,
} from 'lucide-react';
import { getMapPack, getProjectPack, type ProjectFull } from '@/lib/client/packs';
import { getState, subscribe } from '@/lib/client/local-state';
import { ClientBlock } from '@/components/gamified/player-blocks';
import type { Block } from '@/lib/content';
import { ProjectTracker } from '@/components/project-tracker';
import { ProjectTabs } from '@/components/project-tabs';

const TIER_META: Record<string, { tile: string; chip: string; icon: typeof Code2 }> = {
  core: { tile: 'icon-tile-info', chip: 'chip-info', icon: Code2 },
  advanced: { tile: 'icon-tile-gold', chip: 'chip-warning', icon: Flame },
  capstone: { tile: 'icon-tile-danger', chip: 'chip-danger', icon: Trophy },
};
const SLIDE_DELAYS = ['0ms', '60ms', '120ms', '180ms', '240ms', '300ms'];

function mdBlocks(text: string) {
  return text.split(/\n\n+/).map((chunk) => ({ type: 'p', md: chunk.trim() }));
}

function resolveSlug(paramSlug?: string | string[], pathname?: string | null): string {
  if (pathname && pathname.startsWith('/projects/')) {
    const seg = pathname.slice('/projects/'.length).split('/')[0];
    if (seg) return decodeURIComponent(seg);
  }
  return Array.isArray(paramSlug) ? paramSlug[0] ?? '' : paramSlug ?? '';
}

export function ProjectDetailClient() {
  const params = useParams();
  const pathname = usePathname();
  const slug = resolveSlug(params?.slug, pathname);

  const [project, setProject] = React.useState<ProjectFull | null>(null);
  const [lessonMeta, setLessonMeta] = React.useState<Record<string, { title: string; moduleTitle: string }>>({});
  const [doneLessons, setDoneLessons] = React.useState<Set<string>>(new Set());
  const [progress, setProgress] = React.useState<{ status: string; milestonesDone: number; notes: string } | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!slug) return;
    setProject(null);
    setFailed(false);
    getProjectPack(slug).then(setProject).catch(() => setFailed(true));

    getMapPack()
      .then((m) => {
        const modTitleById: Record<string, string> = {};
        for (const ph of m.map.phases) {
          for (const mod of ph.modules) modTitleById[mod.id] = mod.title;
        }
        const meta: Record<string, { title: string; moduleTitle: string }> = {};
        for (const l of m.registry.lessons) {
          meta[l.id] = { title: l.title, moduleTitle: modTitleById[l.moduleId] ?? '' };
        }
        setLessonMeta(meta);
      })
      .catch(() => {});
  }, [slug]);

  React.useEffect(() => {
    if (!slug) return;
    const sync = () => {
      const s = getState();
      const done = new Set<string>();
      for (const [id, v] of Object.entries(s.lessons)) {
        if (v.status === 'passed' || v.status === 'mastered') done.add(id);
      }
      setDoneLessons(done);
      setProgress(s.projects[slug] ?? null);
    };
    sync();
    return subscribe(sync);
  }, [slug]);

  if (failed) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="qf-card p-6">
          <h1 className="text-xl font-black">Project not found</h1>
          <Link href="/projects" className="btn3d btn3d-sm mt-4">All projects</Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        <div className="h-28 rounded-2xl bg-surface-2 animate-pulse" />
        <div className="h-64 rounded-2xl bg-surface-2 animate-pulse" />
      </div>
    );
  }

  const tier = TIER_META[project.difficulty] ?? TIER_META.core;
  const TierIcon = tier.icon;
  const totalHours = project.milestones.reduce((n, m) => n + m.estHours, 0);
  const totalXP = project.difficulty === 'capstone' ? 500 : project.difficulty === 'advanced' ? 350 : 200;
  const doneCount = Math.min(progress?.milestonesDone ?? 0, project.milestones.length);
  const prereqNodes = project.prereqLessons
    .filter((id) => lessonMeta[id])
    .map((id) => ({ id, ...lessonMeta[id] }));

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
      <nav className="text-[13px] text-faint mb-3 font-semibold">
        <Link href="/projects" className="hover:text-muted">Projects</Link> › {project.title}
      </nav>

      <header className="qf-card p-6 anim-pop-in">
        <div className="flex items-start gap-4 flex-wrap">
          <span className={`icon-tile icon-tile-lg ${tier.tile}`}><TierIcon /></span>
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

      <ProjectTracker
        slug={project.slug}
        milestones={project.milestones.map((m) => ({ title: m.title, estHours: m.estHours }))}
        initialDone={doneCount}
        initialStatus={progress?.status ?? 'not_started'}
        initialNotes={progress?.notes ?? ''}
      />

      <ProjectTabs labels={['Overview', 'Milestones', 'Starter files', 'Criteria']} counts={['', project.milestones.length, project.starterFiles.length, '']}>
        <div>
          {prereqNodes.length > 0 && (
            <section className="mt-8">
              <div className="section-head">
                <span className="icon-tile icon-tile-sm icon-tile-info"><BookOpen /></span>
                <h2>Prerequisite lessons</h2>
                <span className="chip ml-auto tnum">
                  {prereqNodes.filter((n) => doneLessons.has(n.id)).length}/{prereqNodes.length} ready
                </span>
              </div>
              <div className="space-y-2.5">
                {prereqNodes.map((n, i) => {
                  const isDone = doneLessons.has(n.id);
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

          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="qf-card p-5 anim-slide-up relative overflow-hidden">
              <div className="relative">
                <div className="section-head">
                  <span className="icon-tile icon-tile-sm icon-tile-accent"><Info /></span>
                  <h2>Context</h2>
                </div>
                <div className="prose-qf text-[15px]"><ClientBlock block={{ type: 'p', md: project.context }} /></div>
              </div>
            </div>
            <div className="qf-card p-5 anim-slide-up relative overflow-hidden">
              <div className="relative">
                <div className="section-head">
                  <span className="icon-tile icon-tile-sm icon-tile-info"><FileText /></span>
                  <h2>Problem statement</h2>
                </div>
                <div className="prose-qf text-[15px]">{mdBlocks(project.problem).map((b, i) => <ClientBlock key={i} block={b as Block} />)}</div>
              </div>
            </div>
          </section>

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

          <section className="mt-8">
            <div className="section-head">
              <span className="icon-tile icon-tile-sm icon-tile-gold"><Lightbulb /></span>
              <h2>Design guidance</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {project.designGuidance.map((b, i) => (
                <div key={i} className="qf-card-flat p-5 prose-qf text-[15px]"><ClientBlock block={b as Block} /></div>
              ))}
            </div>
          </section>
        </div>

        <div>
          {project.starterFiles.length > 0 && (
            <section className="mt-8">
              <div className="section-head">
                <span className="icon-tile icon-tile-sm icon-tile-violet"><FileCode2 /></span>
                <h2>Starter files</h2>
                <span className="chip ml-auto tnum">{project.starterFiles.length}</span>
              </div>
              {project.starterFiles.map((f) => (
                <figure key={f.path} className="mt-3">
                  <figcaption className="text-[13px] text-faint mb-1 flex items-center gap-1.5 font-semibold"><FileCode2 className="h-3 w-3" /> {f.path}</figcaption>
                  <div className="code-block"><code>{f.content}</code></div>
                </figure>
              ))}
            </section>
          )}
        </div>

        <div>
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
  );
}
