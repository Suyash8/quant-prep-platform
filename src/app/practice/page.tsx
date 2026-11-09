import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { listProblems } from '@/lib/content';
import { AppShell } from '@/components/app-shell';
import { PracticeFilters } from '@/components/practice-filters';
import { CheckCircle2, Code2, FileTerminal, Target } from 'lucide-react';

export const metadata = { title: 'Code Practice — QuantFoundry' };

export default async function PracticePage() {
  const user = await getCurrentUser();
  if (!user) return <LoginPrompt />;

  const problems = listProblems();
  const attempts = await db.problemAttempt.findMany({ where: { userId: user.id } });
  const solvedSlugs = new Set(attempts.filter(a => a.status === 'passed').map(a => a.problemSlug));
  const attemptedSlugs = new Set(attempts.map(a => a.problemSlug));

  const solvedCount = solvedSlugs.size;
  const inProgressCount = Math.max(attemptedSlugs.size - solvedCount, 0);
  const solvedPct = problems.length > 0 ? Math.round((solvedCount / problems.length) * 100) : 0;
  const solvedBarWidth = solvedPct + '%';

  const solvedDelay = '0ms';
  const progressDelay = '80ms';
  const submissionsDelay = '160ms';

  const body = (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero">
        <span className="icon-tile icon-tile-info"><Code2 strokeWidth={2.5} /></span>
        <div>
          <h1>Practice problems</h1>
          <p className="page-sub">
            {problems.length} real-execution problems · {solvedCount} solved · {inProgressCount} in progress
          </p>
        </div>
        <div className="flex-1" />
        <span className="hud-pill hidden sm:inline-flex">
          <CheckCircle2 className="h-4 w-4 text-accent" strokeWidth={2.5} />
          <span className="tnum">{solvedCount} / {problems.length}</span> solved
        </span>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Your practice progress">
        <div className="stat-tile anim-pop-in" style={{ animationDelay: solvedDelay }}>
          <div className="flex items-center gap-2.5">
            <span className="icon-tile-sm icon-tile-info"><CheckCircle2 strokeWidth={2.5} /></span>
            <span className="stat-label">Solved</span>
          </div>
          <p className="mt-2.5 stat-value font-black tnum">
            {solvedCount}<span className="text-base font-extrabold text-muted">/{problems.length}</span>
          </p>
          <div className="prog-track mt-2.5 h-2.5">
            <div className="prog-fill" style={{ width: solvedBarWidth }} />
          </div>
          <p className="mt-2 stat-label tnum">{solvedPct}% of the problem set</p>
        </div>

        <div className="stat-tile anim-pop-in" style={{ animationDelay: progressDelay }}>
          <div className="flex items-center gap-2.5">
            <span className="icon-tile-sm icon-tile-accent"><Target strokeWidth={2.5} /></span>
            <span className="stat-label">In progress</span>
          </div>
          <p className="mt-2.5 stat-value font-black tnum">{inProgressCount}</p>
          <p className="mt-2 stat-label">attempted, not yet passed</p>
        </div>

        <div className="stat-tile anim-pop-in" style={{ animationDelay: submissionsDelay }}>
          <div className="flex items-center gap-2.5">
            <span className="icon-tile-sm icon-tile-gold"><FileTerminal strokeWidth={2.5} /></span>
            <span className="stat-label">Submissions</span>
          </div>
          <p className="mt-2.5 stat-value font-black tnum">{attempts.length}</p>
          <p className="mt-2 stat-label">every run scored server-side</p>
        </div>
      </section>

      <PracticeFilters
        problems={problems.map(p => ({
          slug: p.slug, title: p.title, difficulty: p.difficulty, category: p.category, tags: p.tags, estMinutes: p.estMinutes,
          status: solvedSlugs.has(p.slug) ? 'solved' : attemptedSlugs.has(p.slug) ? 'attempted' : 'new',
        }))}
      />
    </div>
  );
  return <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>{body}</AppShell>;
}

function LoginPrompt() {
  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero">
        <span className="icon-tile icon-tile-info"><Code2 strokeWidth={2.5} /></span>
        <div>
          <h1>Practice problems</h1>
          <p className="page-sub">Real-execution coding challenges, scored server-side.</p>
        </div>
      </header>
      <div className="qf-empty bg-dots">
        <span className="empty-emoji" role="img" aria-label="locked">🔐</span>
        <p className="text-lg font-extrabold">Sign in to start solving</p>
        <p className="mx-auto mt-1 max-w-md text-sm font-semibold text-muted">
          Progress, submissions and the code editor need an account — it takes about 20 seconds.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="btn3d btn3d-sm">Sign in</Link>
          <Link href="/register" className="btn3d btn3d-ghost btn3d-sm">Create account</Link>
        </div>
      </div>
    </div>
  );
}
