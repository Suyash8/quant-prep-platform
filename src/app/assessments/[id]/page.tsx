import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAssessment } from '@/lib/content';
import { db } from '@/lib/db';
import { AppShell } from '@/components/app-shell';
import { AssessmentPlayer, type PlayerAssessment } from '@/components/assessment-player';
import { sanitizedForClient } from '@/lib/grading';
import { SectionHead, ClosingCta, ProgressRing } from '@/components/ui/page-kit';
import {
  ArrowLeft, ClipboardCheck, Clock, History, ListChecks, RotateCcw, Trophy, BookOpenCheck,
  Timer, Pause, SkipForward, ShieldCheck, Lightbulb, Layers,
} from 'lucide-react';

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

  const rules = [
    { icon: Timer, text: assessment.timeLimitMinutes > 0 ? `Timed, ${assessment.timeLimitMinutes} minutes, visible countdown` : 'Untimed, take it at your own pace' },
    { icon: Pause, text: 'No pausing once started, the clock is part of the test' },
    { icon: SkipForward, text: 'You can skip a question and come back to it' },
    { icon: ShieldCheck, text: 'Graded locally from the content pack, verified on sync' },
  ];

  const tips = [
    'Answer every question, blanks score zero and there is no penalty for a wrong guess.',
    '80 percent is the passing bar. Below that, the affected lessons land in your revision queue.',
    'The result feeds your diagnostic profile, so retakes keep the honest history you see below.',
  ];

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
        <Link href="/assessments" className="text-sm font-extrabold text-muted hover:text-accent transition-colors inline-flex items-center gap-1.5 mb-4">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All assessments
        </Link>

        <header className="page-hero">
          <span className="icon-tile icon-tile-violet"><ClipboardCheck className="h-7 w-7" aria-hidden="true" /></span>
          <div>
            <h1>{assessment.title}</h1>
            <p className="page-sub line-clamp-2">{assessment.description.replace(/\$\$?[^$]*\$\$?/g, '').slice(0, 140)}</p>
          </div>
        </header>

        {/* meta stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-tile">
            <span className="icon-tile icon-tile-sm icon-tile-info"><ListChecks className="h-5 w-5" aria-hidden="true" /></span>
            <div className="stat-value mt-1 tnum">{questionCount}</div>
            <div className="stat-label mt-1">questions · {assessment.sections.length} {assessment.sections.length === 1 ? 'section' : 'sections'}</div>
          </div>
          <div className="stat-tile">
            <span className="icon-tile icon-tile-sm icon-tile-warning"><Clock className="h-5 w-5" aria-hidden="true" /></span>
            <div className="stat-value mt-1 tnum">{assessment.timeLimitMinutes > 0 ? assessment.timeLimitMinutes : '∞'}</div>
            <div className="stat-label mt-1">{assessment.timeLimitMinutes > 0 ? 'minute limit' : 'untimed'}</div>
          </div>
          <div className="stat-tile">
            <span className="icon-tile icon-tile-sm icon-tile-gold"><Trophy className="h-5 w-5" aria-hidden="true" /></span>
            <div className="stat-value mt-1 tnum">{best !== null ? Math.round(best) + '%' : 'no try yet'}</div>
            <div className="stat-label mt-1">your best score</div>
          </div>
          <div className="stat-tile">
            <span className="icon-tile icon-tile-sm icon-tile-accent"><RotateCcw className="h-5 w-5" aria-hidden="true" /></span>
            <div className="stat-value mt-1 tnum">{attempts.length}</div>
            <div className="stat-label mt-1">{attempts.length === 1 ? 'attempt' : 'attempts'} · retake any time</div>
          </div>
        </div>

        {/* what to expect: section breakdown */}
        <section className="mt-8">
          <SectionHead icon={Layers} tone="info" title="What to expect" right={<span className="chip tnum">{questionCount} questions</span>} />
          <div className="qf-card p-5 space-y-3">
            {assessment.sections.map((s, i) => (
              <div key={i} className="row-card !shadow-none border-0 bg-surface-2/60">
                <span className="icon-tile-sm icon-tile-violet"><BookOpenCheck className="h-4 w-4" aria-hidden="true" /></span>
                <span className="flex-1 min-w-0 font-bold text-sm">{s.title}</span>
                <span className="chip tnum"><ListChecks className="h-3 w-3" aria-hidden="true" /> {s.questions.length} {s.questions.length === 1 ? 'question' : 'questions'}</span>
                <span className="chip tnum hidden sm:inline-flex"><Clock className="h-3 w-3" aria-hidden="true" /> ~{Math.max(1, Math.round(s.questions.length * 1.2))} min</span>
              </div>
            ))}
          </div>
        </section>

        {/* rules + best summary */}
        <section className="mt-8 grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
          <div className="qf-card-flat p-5">
            <SectionHead icon={ShieldCheck} tone="accent" title="The rules, plainly" />
            <ul className="space-y-2.5">
              {rules.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm font-semibold">
                  <span className="icon-tile-sm icon-tile-accent shrink-0"><r.icon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                  {r.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="qf-card-flat p-5 flex flex-col items-center justify-center text-center gap-2">
            {best !== null ? (
              <>
                <ProgressRing value={Math.round(best)} size={72} tone="var(--gold)" label={`Best score ${Math.round(best)} percent`}>
                  <span className="text-sm font-black tnum">{Math.round(best)}%</span>
                </ProgressRing>
                <p className="stat-label">best of {attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'}</p>
              </>
            ) : (
              <>
                <ProgressRing value={0} size={72} label="No attempts yet">
                  <ClipboardCheck className="h-6 w-6 text-violet" aria-hidden="true" />
                </ProgressRing>
                <p className="stat-label">first attempt not taken yet</p>
              </>
            )}
          </div>
        </section>

        {/* the start card, holds the single dominant green CTA */}
        <div className="mt-8">
          <AssessmentPlayer assessment={player} compactIntro />
        </div>

        {/* previous attempts */}
        {attempts.length > 0 && (
          <section className="mt-8">
            <SectionHead icon={History} tone="danger" title="Previous attempts" right={<span className="chip tnum">{attempts.length} shown</span>} />
            <div className="qf-card-flat divide-y">
              {attempts.map((a, i) => (
                <div key={a.id} className="px-4 py-3 flex items-center gap-3 text-sm font-semibold">
                  <span className="flex items-center gap-2.5 min-w-0 shrink-0">
                    <span className="h-8 w-8 rounded-xl bg-surface-2 flex items-center justify-center text-xs font-black tnum shrink-0">#{attempts.length - i}</span>
                    <span className="text-faint tnum text-xs">{a.submittedAt?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </span>
                  <span className="prog-track flex-1 min-w-[64px] h-2.5">
                    <span className={`prog-fill ${a.scorePct >= 80 ? '' : a.scorePct >= 50 ? 'prog-fill-gold' : 'prog-fill-danger'}`} style={{ width: `${Math.round(a.scorePct)}%` }} />
                  </span>
                  <span className={`chip tnum shrink-0 ${a.scorePct >= 80 ? 'chip-success' : a.scorePct >= 50 ? 'chip-warning' : 'chip-danger'}`}>{Math.round(a.scorePct)}%</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* tips */}
        <section className="mt-8">
          <SectionHead icon={Lightbulb} tone="warning" title="Before you start" />
          <div className="qf-callout qf-callout-warn">
            <Lightbulb className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
            <ul className="space-y-1.5">
              {tips.map((t, i) => <li key={i} className="text-sm font-semibold">{t}</li>)}
            </ul>
          </div>
        </section>

        <section className="mt-8">
          <ClosingCta
            icon={ClipboardCheck}
            tone="violet"
            title={`${questionCount} questions, no surprises after that.`}
            line={`${assessment.timeLimitMinutes > 0 ? `${assessment.timeLimitMinutes} minutes on the clock, o` : 'O'}pen the card above when you are ready and the timer starts with question one.`}
            ghost={<Link href="/revision" className="btn3d btn3d-ghost">Warm up on revision first</Link>}
            pose="think"
          />
        </section>
      </div>
    </AppShell>
  );
}
