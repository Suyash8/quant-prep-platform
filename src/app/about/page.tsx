import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getRegistry, listProblems, listProjects, listCompanies, getMap } from '@/lib/content';
import { AppShell, PublicHeader } from '@/components/app-shell';
import { BookOpen, Puzzle, FolderKanban, Building2, Clock, Layers, Info, ShieldCheck, ScrollText, ArrowRight } from 'lucide-react';

export const metadata = { title: 'About — QuantFoundry' };

export default async function AboutPage() {
  const user = await getCurrentUser();
  const reg = getRegistry();
  const map = getMap();
  const problems = listProblems();
  const projects = listProjects();
  const companies = listCompanies();
  const estHours = Math.round(map.phases.flatMap(p => p.modules).flatMap(m => m.lessons).reduce((n, l) => n + l.estMinutes, 0) / 60);

  const stats = [
    { icon: BookOpen, label: 'authored lessons', value: reg.lessons.length, cls: 'icon-tile-accent' },
    { icon: Layers, label: 'phases · modules', value: `${map.phases.length} · ${map.phases.reduce((n, p) => n + p.modules.length, 0)}`, cls: 'icon-tile-info' },
    { icon: Clock, label: 'hours of core content', value: `~${estHours}`, cls: 'icon-tile-warning' },
    { icon: Puzzle, label: 'judged problems', value: problems.length, cls: 'icon-tile-violet' },
    { icon: FolderKanban, label: 'portfolio projects', value: projects.length, cls: 'icon-tile-gold' },
    { icon: Building2, label: 'employer profiles', value: companies.length, cls: 'icon-tile-blue' },
  ];

  const body = (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero">
        <span className="icon-tile icon-tile-accent"><Info className="h-7 w-7" /></span>
        <div>
          <h1>About this platform</h1>
          <p className="page-sub">A complete learning environment for quantitative software engineering — nothing fake, nothing borrowed.</p>
        </div>
      </header>

      {/* stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="stat-tile">
            <span className={`icon-tile icon-tile-sm ${s.cls}`}><s.icon className="h-5 w-5" /></span>
            <div className="stat-value mt-1 tnum">{s.value}</div>
            <div className="stat-label mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4">
        <div className="qf-card p-6">
          <h2 className="font-black text-lg tracking-tight">Why it exists</h2>
          <p className="mt-2 text-sm text-muted leading-relaxed font-semibold">
            QuantFoundry spans mathematics, C++, Python, algorithms, finance, statistics and systems — with problems graded
            by real compilers in a sandboxed runner, portfolio projects, and a career centre built from published employer
            research. It exists because the path is genuinely hard and badly documented: employers want math from first
            principles, C++ at the level of caches and memory, statistics you can apply rather than recite, and finance
            you can put in code — and almost nobody teaches those together, in order, with the gaps filled.
          </p>
        </div>
        <div className="qf-card p-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-warning-soft" aria-hidden />
          <div className="relative">
            <h2 className="font-black text-lg tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-warning-strong dark:text-warning" /> What it doesn’t promise
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed font-semibold">
              A job, a salary, or a finish date. What it <strong className="text-foreground">does</strong> promise: pass the
              checks, do the exercises, build the projects, and what you know at the end is real and yours to prove.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-info"><ScrollText className="h-5 w-5" /></span>
          <h2 className="text-lg font-black tracking-tight">Engineering notes</h2>
        </div>
        <ul className="text-sm text-muted font-semibold space-y-2">
          {[
            'Next.js 16 App Router + TypeScript; Prisma ORM on SQLite (swap the datasource to PostgreSQL for production).',
            'Untrusted code executes in a dedicated runner service with CPU/memory/output limits and ephemeral workspaces — never inside the web server process. Containerise the runner for production-grade isolation.',
            'All quiz and assessment scoring is server-side; correct answers never ship to the browser before submission.',
            'Curriculum content is validated JSON in content/, gated by scripts/validate-content.mjs.',
            'Spaced repetition implements SM-2; the mastery model requires knowledge-check ≥ 80%, completed exercises, and later retrieval verification.',
          ].map(t => (
            <li key={t.slice(0, 30)} className="flex gap-3 rounded-xl bg-surface-2/50 border border-border/60 px-3.5 py-2.5">
              <span className="h-2 w-2 rounded-full bg-info shrink-0 mt-1.5" />
              <span className="leading-relaxed">{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 qf-card-flat p-5 !bg-surface-2/50">
        <h2 className="text-xs font-black uppercase tracking-[0.12em] text-faint mb-2">Attribution &amp; originality</h2>
        <p className="text-sm text-muted leading-relaxed font-semibold">
          All teaching content is original exposition written for this platform. Conventions and formulas follow standard
          public references (cppreference, IEEE 754, OpenStax, Python/NumPy/SciPy documentation, PostgreSQL documentation).
          Company research cites official career pages with retrieval dates and marks inferences as such. Mathematical
          visualisations are computed live in your browser from the actual formulas — nothing is a canned image.
        </p>
      </section>

      <div className="mt-8 flex gap-3 flex-wrap">
        <Link href={user ? '/dashboard' : '/register'} className="btn3d">
          {user ? 'Go to dashboard' : 'Create an account'} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/methodology" className="btn3d btn3d-ghost">Learning methodology</Link>
      </div>
    </div>
  );

  if (!user) {
    return <div className="min-h-screen flex flex-col"><PublicHeader user={null} />{body}</div>;
  }
  return <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>{body}</AppShell>;
}
