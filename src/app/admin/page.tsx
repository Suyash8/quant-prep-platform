import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { AdminPanel } from '@/components/admin-panel';
import { runContentValidation } from '@/lib/admin-validate';
import { getMap, getRegistry, listProblems, listAssessments, listProjects, listCompanies } from '@/lib/content';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export const metadata = { title: 'Admin. QuantFoundry' };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'admin') {
    return (
      <AppShell user={{ name: user.name, email: user.email, role: user.role }}>
        <div className="max-w-xl mx-auto px-4 py-16">
          <div className="qf-card p-8 text-center relative overflow-hidden">
            <div className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-danger-soft" aria-hidden />
            <div className="relative">
              <span className="mx-auto h-16 w-16 rounded-3xl bg-danger-soft flex items-center justify-center shadow-[0_5px_0_0_var(--danger)]">
                <ShieldAlert className="h-8 w-8 text-danger" />
              </span>
              <h1 className="mt-4 text-xl font-black tracking-tight">Administrators only</h1>
              <p className="mt-2 text-[15px] font-semibold text-muted max-w-sm mx-auto">
                This panel manages curriculum content and requires the admin role. The first registered account
                becomes the admin, ask that account to grant access.
              </p>
              <Link href="/dashboard" className="btn3d btn3d-sm mt-5">
                Back to learning
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const [report, map, reg] = await Promise.all([
    runContentValidation(),
    Promise.resolve(getMap()),
    Promise.resolve(getRegistry()),
  ]);
  const problems = listProblems();
  const assessments = listAssessments();
  const projects = listProjects();
  const companies = listCompanies();

  const stats = {
    lessons: reg.lessons.length,
    modules: map.phases.reduce((n, p) => n + p.modules.length, 0),
    phases: map.phases.length,
    problems: problems.length,
    assessments: assessments.length,
    projects: projects.length,
    companies: companies.length,
    estHours: Math.round(map.phases.flatMap(p => p.modules).flatMap(m => m.lessons).reduce((n, l) => n + l.estMinutes, 0) / 60),
  };

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
        <header className="page-hero">
          <span className="icon-tile icon-tile-violet"><ShieldCheck className="h-7 w-7" /></span>
          <div>
            <h1>Administration &amp; content</h1>
            <p className="page-sub">
              Content lives as validated JSON under <code className="text-[0.85em] font-bold bg-surface-2 px-1.5 py-0.5 rounded-md">content/</code> , 
              curriculum expansion needs no frontend changes. Validate, preview and import here.
            </p>
          </div>
        </header>
        <AdminPanel report={report} stats={stats} />
      </div>
    </AppShell>
  );
}
