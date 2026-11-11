import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAssessment } from '@/lib/content';
import { AppShell } from '@/components/app-shell';
import { AssessmentPlayer, type PlayerAssessment } from '@/components/assessment-player';
import { sanitizedForClient } from '@/lib/grading';
import {
  Activity, Clock, Compass, Gauge, ListChecks, Route, ShieldCheck, Zap,
} from 'lucide-react';

export const metadata = { title: 'Diagnostic. QuantFoundry' };

const POP_DELAYS = ['0ms', '70ms', '140ms'];
const STEP_DELAYS = ['0ms', '80ms', '160ms'];

const STEPS = [
  {
    icon: ListChecks,
    tile: 'icon-tile-info',
    title: 'Answer 28 real questions',
    body: 'Arithmetic to finance fundamentals, escalating difficulty, no trick questions, and you can move freely between sections.',
  },
  {
    icon: Gauge,
    tile: 'icon-tile-gold',
    title: 'Get scored instantly',
    body: 'Server-side scoring maps your answers to skill areas and shows strengths and gaps with full explanations.',
  },
  {
    icon: Route,
    tile: 'icon-tile-accent',
    title: 'Your path is tuned',
    body: 'We place you at the right phase and calibrate lesson difficulty, skip what you already know, drill what you don’t.',
  },
];

const META_CHIP = 'inline-flex items-center gap-1.5 rounded-full border-2 border-transparent px-3.5 py-1.5 text-sm font-extrabold';

export default async function DiagnosticPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/diagnostic');

  const assessment = getAssessment('diag-core');
  if (!assessment) {
    return (
      <AppShell user={{ name: user.name, email: user.email, role: user.role }}>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="qf-empty">
            <span className="empty-emoji" aria-hidden>🧭</span>
            <h2 className="font-extrabold text-lg">Diagnostic not installed</h2>
            <p className="mt-1 text-sm text-muted">Run the content seed and reload this page, your path is waiting.</p>
          </div>
        </div>
      </AppShell>
    );
  }

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
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
        <header className="page-hero anim-slide-up">
          <span className="icon-tile icon-tile-accent"><Activity /></span>
          <div>
            <h1>Diagnostic</h1>
            <p className="page-sub">Find your true starting point</p>
          </div>
        </header>

        {/* orientation hero: text left, the 7 areas right */}
        <section className="qf-card p-6 sm:p-8 relative overflow-hidden anim-pop-in">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-44 bg-dots opacity-70 hidden sm:block [mask-image:linear-gradient(to_left,black,transparent)]"
          />
          <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-center">
            <div>
              <span className="chip chip-accent"><Route className="h-3 w-3" aria-hidden="true" /> PHASE 0 · ORIENTATION</span>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Find your true starting point</h2>
              <p className="mt-2.5 text-sm text-muted leading-relaxed max-w-xl">
                Seven mini-sections, arithmetic, algebra, logic, programming, CS fundamentals, probability and finance, escalate from quick warm-ups to genuinely challenging problems.
              </p>
              <p className="mt-2 text-sm text-muted leading-relaxed max-w-xl">
                No studying needed first: the score exists to place you at the right phase and calibrate difficulty, not to grade you.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <span className={`${META_CHIP} bg-warning-soft text-warning-strong dark:text-warning`}>
                  <Clock className="h-4 w-4" aria-hidden="true" /> ~{assessment.timeLimitMinutes} min
                </span>
                <span className={`${META_CHIP} bg-info-soft text-info-strong dark:text-info`}>
                  <ListChecks className="h-4 w-4" aria-hidden="true" /> {questionCount} questions
                </span>
                <span className={`${META_CHIP} bg-success-soft text-accent-deep dark:text-success`}>
                  <Zap className="h-4 w-4" aria-hidden="true" /> XP on completion
                </span>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/dashboard" className="btn3d btn3d-ghost">Maybe later, go home</Link>
              </div>
            </div>
            {/* the seven areas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
              {assessment.sections.map((s, i) => (
                <div key={s.title} className="qf-card-flat p-3 flex items-center gap-2.5 anim-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className={`icon-tile-sm icon-tile-${['accent', 'info', 'violet', 'warning', 'gold', 'danger', 'accent'][i % 7]}`}>
                    <Compass className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-black leading-tight">{s.title}</span>
                  <span className="chip tnum ml-auto shrink-0">{s.questions.length}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* the player itself, directly under the hero, the single green start */}
        <div id="diagnostic-player" className="mt-6 scroll-mt-24">
          <AssessmentPlayer assessment={player} compactIntro />
        </div>

        {/* what happens after */}
        <section className="mt-8">
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-info"><Compass /></span>
            <h2>What happens after</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="qf-card p-5 anim-slide-up hover:-translate-y-0.5 hover:shadow-lg transition-all" style={{ animationDelay: STEP_DELAYS[i] }}>
                <div className="flex items-center justify-between">
                  <span className={`icon-tile ${s.tile}`}><s.icon /></span>
                  <span className="text-[11px] font-black text-faint tnum uppercase tracking-wider">Step {i + 1}</span>
                </div>
                <h3 className="mt-3 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* reassurance */}
        <div className="mt-6 flex items-center gap-3 anim-slide-up" style={{ animationDelay: STEP_DELAYS[2] }}>
          <span className="icon-tile icon-tile-accent"><ShieldCheck /></span>
          <p className="font-semibold text-sm sm:text-base">
            No stakes, results only tune your path
            <span className="text-muted font-semibold"> · nothing is shared, and you can retake it any time.</span>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
