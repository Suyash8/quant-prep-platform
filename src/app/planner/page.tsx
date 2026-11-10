import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { AppShell } from '@/components/app-shell';
import { Planner, type Plan, type PlanTask } from '@/components/planner-view';
import { CalendarDays } from 'lucide-react';

export const metadata = { title: 'Study Planner. QuantFoundry' };

/** Defensive parse: stored plan JSON must match the Plan contract or we treat it as absent. */
function parsePlan(raw: string | null | undefined): Plan | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<Plan>;
    if (!Array.isArray(p.tasks) || typeof p.weeks !== 'number' || !Number.isFinite(p.weeks) || p.weeks <= 0) return null;
    const tasks: PlanTask[] = p.tasks.filter((t): t is PlanTask =>
      t && typeof t === 'object' && typeof t.week === 'number' && typeof t.day === 'number'
      && typeof t.kind === 'string' && typeof t.title === 'string' && typeof t.minutes === 'number');
    if (!tasks.length) return null;
    return {
      tasks,
      weeks: p.weeks,
      totalHours: typeof p.totalHours === 'number' ? p.totalHours : 0,
      note: typeof p.note === 'string' ? p.note : '',
      feasibility: typeof p.feasibility === 'string' ? p.feasibility : 'Feasible with consistent effort.',
    };
  } catch {
    return null;
  }
}

export default async function PlannerPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/planner');

  const latest = await db.studyPlan.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
  const initialPlan = parsePlan(latest?.tasks);

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
        <header className="page-hero anim-slide-up">
          <span className="icon-tile icon-tile-info"><CalendarDays /></span>
          <div>
            <h1>Study planner</h1>
            <p className="page-sub">A weekly plan that fits your life</p>
          </div>
        </header>
        <p className="-mt-2.5 mb-6 max-w-3xl text-sm text-muted font-semibold leading-relaxed anim-slide-up">
          A realistic schedule built from your constraints and the prerequisite graph, lessons, practice, revision,
          weekly self-assessments and buffer days. Regenerate any time; progress is never lost.
        </p>
        <Planner initialPlan={initialPlan} />
      </div>
    </AppShell>
  );
}
