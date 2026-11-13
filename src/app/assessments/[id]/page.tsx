import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAssessment, listAssessments } from '@/lib/content';
import { db } from '@/lib/db';
import { AppShell } from '@/components/app-shell';
import { AssessmentPlayer, type PlayerAssessment } from '@/components/assessment-player';
import { sanitizedForClient } from '@/lib/grading';
import { ArrowLeft, ChevronRight, ClipboardCheck, ClipboardList, Clock, History, ListChecks, RotateCcw, Trophy } from 'lucide-react';

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
  const isDevice = (d: string | null) => { try { return JSON.parse(d ?? '{}').source === 'offline-sync'; } catch { return false; } };
  const serverAttempts = attempts.filter(a => !isDevice(a.detail));
  const best = serverAttempts.length ? Math.max(...serverAttempts.map(a => a.scorePct)) : null; // server-graded only
  const questionCount = assessment.sections.reduce((n, s) => n + s.questions.length, 0);

  // sibling assessments from the same content registry import (zero new queries),
  // same kind first so the strip stays topically adjacent
  const others = listAssessments().filter(x => x.id !== assessment.id);
  const siblings = [
    ...others.filter(x => x.kind === assessment.kind),
    ...others.filter(x => x.kind !== assessment.kind),
  ].slice(0, 4);

  const metaTiles = [
    {
      icon: ListChecks,
      tile: 'icon-tile-info',
      value: String(questionCount),
      label: 'questions',
    },
    {
      icon: Clock,
      tile: 'icon-tile-info',
      value: assessment.timeLimitMinutes > 0 ? String(assessment.timeLimitMinutes) : 'Untimed',
      label: assessment.timeLimitMinutes > 0 ? 'minute limit' : 'untimed',
    },
    {
      icon: Trophy,
      tile: best !== null ? 'icon-tile-gold' : 'icon-tile-neutral',
      value: best !== null ? Math.round(best) + '%' : 'None yet',
      label: best !== null ? 'your best score' : 'no attempts yet',
    },
    {
      icon: RotateCcw,
      tile: 'icon-tile-neutral',
      value: String(attempts.length),
      label: `${attempts.length === 1 ? 'attempt' : 'attempts'} · retake any time`,
    },
  ];

  const player: PlayerAssessment = {
    id: assessment.id,
    title: assessment.title,
    kind: assessment.kind,
    timeLimitMinutes: assessment.timeLimitMinutes,
    description: assessment.description,
    areaLabels: assessment.areas,
    passMarkPercent: assessment.passMarkPercent,
    scoreBands: assessment.scoreBands,
    sections: assessment.sections.map(s => ({ title: s.title, questions: s.questions.map(sanitizedForClient) })),
  };

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
        <Link href="/assessments" className="text-[15px] font-extrabold text-muted hover:text-accent transition-colors inline-flex items-center gap-1.5 mb-4">
          <ArrowLeft className="h-4 w-4" /> All assessments
        </Link>

        <header className="page-hero">
          <span className="icon-tile icon-tile-accent"><ClipboardCheck className="h-7 w-7" /></span>
          <div>
            <h1>{assessment.title}</h1>
            <p className="page-sub line-clamp-2">{assessment.description.replace(/\$\$?[^$]*\$\$?/g, '').slice(0, 140)}</p>
          </div>
        </header>

        {/* meta stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metaTiles.map(t => (
            <div key={t.label} className="stat-tile min-w-0">
              <span className={`icon-tile icon-tile-sm ${t.tile}`}><t.icon className="h-5 w-5" /></span>
              <div className="stat-body">
                <div className="stat-value tnum">{t.value}</div>
                <div className="stat-label">{t.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* previous attempts */}
        {attempts.length > 0 && (
          <section className="mt-6">
            <div className="section-head">
              <span className="icon-tile icon-tile-sm icon-tile-neutral"><History className="h-5 w-5" /></span>
              <h2>Previous attempts</h2>
              <span className="chip tnum ml-auto">{attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'}</span>
            </div>
            <div className="qf-card-flat divide-y">
              {attempts.map((a, i) => {
                const pct = Math.round(a.scorePct);
                const fill = pct >= 80 ? 'bg-accent' : pct >= 50 ? 'bg-warning' : 'bg-danger';
                const day = a.submittedAt?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) ?? '';
                return (
                  <div key={a.id} className="px-4 py-2.5 flex items-center gap-4 text-[15px] font-semibold">
                    <span className="shrink-0 tnum text-faint">#{attempts.length - i} · {day} · {pct}%{isDevice(a.detail) ? ' · device, not verified' : ''}</span>
                    <span className="ml-auto w-1/2 max-w-md h-2 rounded-full bg-surface-3 overflow-hidden">
                      <span className={`block h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-6">
          <AssessmentPlayer assessment={player} compactIntro subduedIntro />
        </div>

        {/* also available: closes the gap between the start card and the footer */}
        {siblings.length > 0 && (
          <section className="mt-8" aria-label="Also available">
            <div className="section-head">
              <span className="icon-tile icon-tile-sm icon-tile-neutral"><ClipboardList className="h-5 w-5" /></span>
              <h2>Also available</h2>
              <span className="chip tnum ml-auto">{siblings.length} more</span>
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {siblings.map(s => (
              <Link key={s.id} href={`/assessments/${s.id}`} className="row-card">
                  <span className="icon-tile icon-tile-sm icon-tile-neutral"><ClipboardList /></span>
                  <span className="flex-1 min-w-0 font-semibold text-[15px] leading-tight truncate">{s.title}</span>
                  <span className="chip tnum shrink-0">{s.questionCount}q · {s.timeLimitMinutes}m</span>
                  <ChevronRight className="h-4 w-4 text-faint shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
