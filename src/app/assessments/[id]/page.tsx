import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAssessment } from '@/lib/content';
import { db } from '@/lib/db';
import { AppShell } from '@/components/app-shell';
import { AssessmentPlayer, type PlayerAssessment } from '@/components/assessment-player';
import { sanitizedForClient } from '@/lib/grading';
import { ArrowLeft, ClipboardCheck, Clock, History, ListChecks, RotateCcw, Trophy } from 'lucide-react';

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/assessments/${id}`);

  const assessment = getAssessment(id);
  if (!assessment) notFound();

  const attempts = await db.assessmentAttempt.findMany({
    where: { userId: user.id, assessmentId: id, submittedAt: { not: null } },
    orderBy: { submittedAt: 'desc' },
    take: 6,
  });
  const best = attempts.length ? Math.max(...attempts.map(a => a.scorePct)) : null;
  const questionCount = assessment.sections.reduce((n, s) => n + s.questions.length, 0);

  const player: PlayerAssessment = {
    id: assessment.id,
    title: assessment.title,
    kind: assessment.kind,
    timeLimitMinutes: assessment.timeLimitMinutes,
    description: assessment.description,
    areaLabels: assessment.areas,
    sections: assessment.sections.map(s => ({ title: s.title, questions: s.questions.map(sanitizedForClient) })),
  };

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
        <Link href="/assessments" className="text-sm font-extrabold text-muted hover:text-accent transition-colors inline-flex items-center gap-1.5 mb-4">
          <ArrowLeft className="h-4 w-4" /> All assessments
        </Link>

        <header className="page-hero">
          <span className="icon-tile icon-tile-violet"><ClipboardCheck className="h-7 w-7" /></span>
          <div>
            <h1>{assessment.title}</h1>
            <p className="page-sub line-clamp-2">{assessment.description.replace(/\$\$?[^$]*\$\$?/g, '').slice(0, 140)}</p>
          </div>
        </header>

        {/* meta stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-tile">
            <span className="icon-tile icon-tile-sm icon-tile-info"><ListChecks className="h-5 w-5" /></span>
            <div className="stat-value mt-1 tnum">{questionCount}</div>
            <div className="stat-label mt-1">questions · {assessment.sections.length} sections</div>
          </div>
          <div className="stat-tile">
            <span className="icon-tile icon-tile-sm icon-tile-warning"><Clock className="h-5 w-5" /></span>
            <div className="stat-value mt-1 tnum">{assessment.timeLimitMinutes > 0 ? assessment.timeLimitMinutes : ', '}</div>
            <div className="stat-label mt-1">{assessment.timeLimitMinutes > 0 ? 'minute limit' : 'untimed'}</div>
          </div>
          <div className="stat-tile">
            <span className="icon-tile icon-tile-sm icon-tile-gold"><Trophy className="h-5 w-5" /></span>
            <div className="stat-value mt-1 tnum">{best !== null ? Math.round(best) + '%' : ', '}</div>
            <div className="stat-label mt-1">your best score</div>
          </div>
          <div className="stat-tile">
            <span className="icon-tile icon-tile-sm icon-tile-accent"><RotateCcw className="h-5 w-5" /></span>
            <div className="stat-value mt-1 tnum">{attempts.length}</div>
            <div className="stat-label mt-1">{attempts.length === 1 ? 'attempt' : 'attempts'} · retake any time</div>
          </div>
        </div>

        {/* previous attempts */}
        {attempts.length > 0 && (
          <section className="mt-6">
            <div className="section-head">
              <span className="icon-tile icon-tile-sm icon-tile-danger"><History className="h-5 w-5" /></span>
              <h2>Previous attempts</h2>
            </div>
            <div className="qf-card-flat divide-y">
              {attempts.map((a, i) => (
                <div key={a.id} className="px-4 py-3 flex items-center gap-3 text-sm font-semibold">
                  <span className="flex items-center gap-2.5 min-w-0 shrink-0">
                    <span className="h-8 w-8 rounded-xl bg-surface-2 flex items-center justify-center text-xs font-black tnum shrink-0">#{attempts.length - i}</span>
                    <span className="text-faint tnum text-xs">{a.submittedAt?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </span>
                  <span className="flex-1 min-w-[64px] h-2.5 rounded-full bg-surface-3 overflow-hidden">
                    <span className={`block h-full rounded-full ${a.scorePct >= 80 ? 'bg-accent' : a.scorePct >= 50 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${Math.round(a.scorePct)}%` }} />
                  </span>
                  <span className={`chip tnum shrink-0 ${a.scorePct >= 80 ? 'chip-success' : a.scorePct >= 50 ? 'chip-warning' : 'chip-danger'}`}>{Math.round(a.scorePct)}%</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6">
          <AssessmentPlayer assessment={player} compactIntro />
        </div>
      </div>
    </AppShell>
  );
}
