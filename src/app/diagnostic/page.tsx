import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAssessment } from '@/lib/content';
import { AppShell } from '@/components/app-shell';
import { AssessmentPlayer, type PlayerAssessment } from '@/components/assessment-player';
import { sanitizedForClient } from '@/lib/grading';
import {
  Activity, ArrowRight, Clock, Compass, Gauge, ListChecks, Route, ShieldCheck, Zap,
} from 'lucide-react';

export const metadata = { title: 'Diagnostic — QuantFoundry' };

const POP_DELAYS = ['0ms', '70ms', '140ms'];
const STEP_DELAYS = ['0ms', '80ms', '160ms'];

const STEPS = [
  {
    icon: ListChecks,
    tile: 'icon-tile-info',
    title: 'Answer 28 real questions',
    body: 'Arithmetic to finance fundamentals, escalating difficulty — no trick questions, and you can move freely between sections.',
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
    body: 'We place you at the right phase and calibrate lesson difficulty — skip what you already know, drill what you don’t.',
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
            <p className="mt-1 text-sm text-muted">Run the content seed and reload this page — your path is waiting.</p>
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
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
        <header className="page-hero anim-slide-up">
          <span className="icon-tile icon-tile-danger"><Activity /></span>
          <div>
            <h1>Diagnostic</h1>
            <p className="page-sub">Find your true starting point</p>
          </div>
        </header>

        {/* orientation hero */}
        <section className="qf-card p-6 sm:p-8 relative overflow-hidden anim-pop-in">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-44 bg-dots opacity-70 hidden sm:block [mask-image:linear-gradient(to_left,black,transparent)]"
          />
          <div className="relative">
            <span className="chip chip-accent"><Route className="h-3 w-3" /> PHASE 0 · ORIENTATION</span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Find your true starting point</h2>
            <p className="mt-2.5 text-sm text-muted leading-relaxed max-w-xl">
              Seven mini-sections — arithmetic, algebra, logic, programming, CS fundamentals, probability and finance —
              escalate from quick warm-ups to genuinely challenging problems.
            </p>
            <p className="mt-2 text-sm text-muted leading-relaxed max-w-xl">
              No studying needed first: the score exists to place you at the right phase and calibrate difficulty, not to grade you.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className={`${META_CHIP} bg-warning-soft text-warning-strong dark:text-warning`}>
                <Clock className="h-4 w-4" /> ~{assessment.timeLimitMinutes} min
              </span>
              <span className={`${META_CHIP} bg-info-soft text-info-strong dark:text-info`}>
                <ListChecks className="h-4 w-4" /> {questionCount} questions
              </span>
              <span className={`${META_CHIP} bg-success-soft text-accent-deep dark:text-success`}>
                <Zap className="h-4 w-4" /> XP on completion
              </span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="#diagnostic-player" className="btn3d btn3d-lg press">
                Start diagnostic <ArrowRight className="h-5 w-5" />
              </a>
              <Link href="/dashboard" className="btn3d btn3d-ghost">Maybe later</Link>
            </div>
          </div>
        </section>

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
            No stakes — results only tune your path
            <span className="text-muted font-semibold"> · nothing is shared, and you can retake it any time.</span>
          </p>
        </div>

        {/* the player itself — compact strip, the hero above already sells it */}
        <div id="diagnostic-player" className="mt-8 scroll-mt-24">
          <AssessmentPlayer assessment={player} compactIntro />
        </div>
      </div>
    </AppShell>
  );
}
