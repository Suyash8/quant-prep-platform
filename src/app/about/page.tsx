import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getRegistry, listProblems, listProjects, listCompanies, getMap } from '@/lib/content';
import { AppShell, PublicHeader } from '@/components/app-shell';
import {
  BookOpen, Puzzle, FolderKanban, Building2, Clock, Layers, Info,
  ScrollText, ArrowRight, CheckCircle2, XCircle, GraduationCap, Code2, FlaskConical,
  Briefcase, Server, Lock, FileJson, Repeat, Target, Sparkles, Database,
} from 'lucide-react';

export const metadata = { title: 'About. QuantFoundry' };

export default async function AboutPage() {
  const user = await getCurrentUser();
  const reg = getRegistry();
  const map = getMap();
  const problems = listProblems();
  const projects = listProjects();
  const companies = listCompanies();
  const estHours = Math.round(map.phases.flatMap(p => p.modules).flatMap(m => m.lessons).reduce((n, l) => n + l.estMinutes, 0) / 60);

  const stats = [
    { icon: BookOpen, label: 'Authored lessons', value: String(reg.lessons.length), cls: 'icon-tile-accent' },
    { icon: Layers, label: 'Phases / modules', value: `${map.phases.length} / ${map.phases.reduce((n, p) => n + p.modules.length, 0)}`, cls: 'icon-tile-info' },
    { icon: Clock, label: 'Hours of core content', value: `~${estHours} h`, cls: 'icon-tile-warning' },
    { icon: Puzzle, label: 'Judged problems', value: String(problems.length), cls: 'icon-tile-violet' },
    { icon: FolderKanban, label: 'Portfolio projects', value: String(projects.length), cls: 'icon-tile-gold' },
    { icon: Building2, label: 'Employer profiles', value: String(companies.length), cls: 'icon-tile-blue' },
  ];

  const pillars = [
    {
      icon: GraduationCap, cls: 'icon-tile-accent', title: 'Math from first principles',
      text: 'Employers probe derivations, not formulas. Every identity is built up and then coded, so you can re-derive it under interview pressure.',
    },
    {
      icon: Code2, cls: 'icon-tile-info', title: 'C++ at the level of caches',
      text: 'Memory layout, allocation, undefined behaviour, the standard library, the working knowledge quant teams actually test for.',
    },
    {
      icon: FlaskConical, cls: 'icon-tile-violet', title: 'Statistics you can apply',
      text: 'Not recited, applied. Estimators, hypothesis tests and stochastic models that end up running in code you wrote yourself.',
    },
    {
      icon: Briefcase, cls: 'icon-tile-gold', title: 'Finance you can put in code',
      text: 'Pricing, hedging, market microstructure, each concept ships with a runnable model, not a slide about a model.',
    },
  ];

  const engineering = [
    { icon: Server, cls: 'icon-tile-danger', title: 'Sandboxed execution', text: 'Untrusted code runs in a dedicated runner with CPU, memory and output limits, never inside the web server.' },
    { icon: Lock, cls: 'icon-tile-info', title: 'Server-side scoring', text: 'Correct answers never ship to the browser before submission. Every quiz, every assessment.' },
    { icon: FileJson, cls: 'icon-tile-warning', title: 'Validated content', text: 'Curriculum lives as schema-checked JSON in content/, gated by scripts/validate-content.mjs.' },
    { icon: Repeat, cls: 'icon-tile-violet', title: 'Real spaced repetition', text: 'SM-2 scheduling drives the revision queue; mastery requires knowledge checks, exercises and later retrieval.' },
    { icon: Database, cls: 'icon-tile-accent', title: 'Production-grade stack', text: 'Next.js 16 App Router + TypeScript, Prisma ORM on PostgreSQL.' },
  ];

  const body = (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero">
        <span className="icon-tile icon-tile-accent"><Info className="h-7 w-7" /></span>
        <div>
          <h1>About this platform</h1>
          <p className="page-sub">A complete learning environment for quantitative software engineering, nothing fake, nothing borrowed.</p>
        </div>
      </header>

      {/* stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <div key={s.label} className="stat-tile anim-slide-up" style={{ animationDelay: `${i * 45}ms` }}>
            <span className={`icon-tile icon-tile-sm ${s.cls}`}><s.icon className="h-5 w-5" /></span>
            <div className="stat-value mt-1 tnum">{s.value}</div>
            <div className="stat-label mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* why it exists */}
      <section className="mt-8">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-accent"><Target className="h-5 w-5" /></span>
          <h2 className="text-lg font-black tracking-tight">Why it exists</h2>
        </div>
        <p className="mt-2.5 text-sm text-muted font-semibold leading-relaxed max-w-3xl">
          The path into quantitative development is genuinely hard and badly documented. These four promises are the
          whole curriculum in miniature, everything on the platform serves one of them.
        </p>
        <div className="mt-3.5 grid gap-4 sm:grid-cols-2">
          {pillars.map((p, i) => (
            <div key={p.title} className="qf-card p-5 anim-slide-up hover:-translate-y-0.5 hover:shadow-lg transition-all" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3">
                <span className={`icon-tile icon-tile-sm ${p.cls}`}><p.icon className="h-5 w-5" /></span>
                <h3 className="font-black tracking-tight">{p.title}</h3>
              </div>
              <p className="mt-3 text-sm text-muted font-semibold leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* promises / not promises */}
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="qf-card p-5">
          <div className="flex items-center gap-3">
            <span className="icon-tile icon-tile-sm icon-tile-accent"><CheckCircle2 className="h-5 w-5" /></span>
            <h2 className="font-black tracking-tight">What it promises</h2>
          </div>
          <ul className="mt-3 space-y-2.5">
            {[
              'Skills that survive an interviewer digging one layer deeper',
              'Problems graded by real compilers, not multiple-choice theatre',
              'A portfolio you can defend line by line',
              'Knowledge that is real and yours to prove',
            ].map(t => (
              <li key={t} className="flex gap-2.5 text-sm font-semibold text-muted">
                <CheckCircle2 className="h-5 w-5 text-accent-deep dark:text-accent shrink-0 mt-0.5" />
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="qf-card p-5">
          <div className="flex items-center gap-3">
            <span className="icon-tile icon-tile-sm icon-tile-danger"><XCircle className="h-5 w-5" /></span>
            <h2 className="font-black tracking-tight">What it doesn&apos;t</h2>
          </div>
          <ul className="mt-3 space-y-2.5">
            {[
              'A job, a salary, or a finish date',
              'Shortcuts around the mathematics',
              'Certificate theatre without understanding',
              'Anything you can’t verify yourself',
            ].map(t => (
              <li key={t} className="flex gap-2.5 text-sm font-semibold text-muted">
                <XCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-bold text-faint bg-surface-2/70 rounded-xl px-3.5 py-2.5 leading-relaxed">
            Pass the checks, do the exercises, build the projects, the rest follows from the work.
          </p>
        </div>
      </section>

      {/* engineering notes */}
      <section className="mt-8">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-info"><ScrollText className="h-5 w-5" /></span>
          <h2 className="text-lg font-black tracking-tight">Engineering notes</h2>
        </div>
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
          {engineering.map((e, i) => (
            <div key={e.title} className="qf-card-flat p-4 anim-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-center gap-2.5">
                <span className={`icon-tile icon-tile-sm ${e.cls}`}><e.icon className="h-4 w-4" /></span>
                <div className="font-black text-sm tracking-tight">{e.title}</div>
              </div>
              <p className="mt-2 text-xs font-semibold text-muted leading-relaxed">{e.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* attribution */}
      <section className="mt-8 qf-card-flat p-5 !bg-surface-2/50">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-gold" />
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-faint">Attribution &amp; originality</h2>
        </div>
        <p className="mt-2 text-sm text-muted leading-relaxed font-semibold">
          All teaching content is original exposition written for this platform. Conventions and formulas follow standard
          public references (cppreference, IEEE 754, OpenStax, Python/NumPy/SciPy documentation, PostgreSQL documentation).
          Company research cites official career pages with retrieval dates and marks inferences as such. Mathematical
          visualisations are computed live in your browser from the actual formulas, nothing is a canned image.
        </p>
      </section>

      {/* closing CTA */}
      <section className="mt-10 qf-card p-8 text-center relative overflow-hidden bg-dots">
        <span className="relative mx-auto icon-tile icon-tile-gold anim-bob"><GraduationCap className="h-7 w-7" /></span>
        <h2 className="relative mt-4 text-xl font-black tracking-tight">The path is long. It is also walkable.</h2>
        <p className="relative mt-2 text-sm font-semibold text-muted max-w-md mx-auto leading-relaxed">
          {user ? 'Your streak, plan and next lesson are waiting where you left them.' : 'Start with the diagnostic, it places you on the path in about 20 minutes.'}
        </p>
        <div className="relative mt-5 flex gap-3 justify-center flex-wrap">
          <Link href={user ? '/dashboard' : '/register'} className="btn3d">
            {user ? 'Go to dashboard' : 'Create an account'} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/methodology" className="btn3d btn3d-ghost">Learning methodology</Link>
        </div>
      </section>
    </div>
  );

  if (!user) {
    return <div className="min-h-screen flex flex-col"><PublicHeader user={null} />{body}</div>;
  }
  return <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>{body}</AppShell>;
}
