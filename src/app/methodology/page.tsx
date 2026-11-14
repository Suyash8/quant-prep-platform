import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getRegistry, getMap } from '@/lib/content';
import { AppShell, PublicHeader } from '@/components/app-shell';
import { Brain, Repeat, Layers, Gauge, ClipboardCheck, ListChecks, GraduationCap, ArrowRight, BookCheck, Target, PencilLine, MessageSquareText, RefreshCcw } from 'lucide-react';

export const metadata = { title: 'Methodology. QuantFoundry' };

export default async function MethodologyPage() {
  const user = await getCurrentUser();
  const reg = getRegistry();
  const map = getMap();

  const principles = [
    { icon: Brain, tile: 'icon-tile-accent', title: 'Start with foundations', desc: 'The teaching goal is to explain variables, derivatives, pointers, distributions and instruments from their foundations, with reasons before formulas.' },
    { icon: Layers, tile: 'icon-tile-info', title: 'Learning in prerequisite order', desc: `Lessons unlock through a prerequisite graph covering ${reg.lessons.length} lessons. The graph supports learning order; its size does not establish that every prerequisite explanation is complete.` },
    { icon: Gauge, tile: 'icon-tile-violet', title: 'Mastery over exposure', desc: 'In the classic workspace, score 80%+ on the knowledge check and finish the exercises, and the lesson is “passed”. To call it “mastered” you have to hold onto it, the material comes back later, and you have to land it again.' },
    { icon: Repeat, tile: 'icon-tile-warning', title: 'Spaced retrieval', desc: 'The classic workspace schedules flashcards with SM-2. The rebuilt workspace also offers retrieval review, with its own saved progress and review records.' },
    { icon: ClipboardCheck, tile: 'icon-tile-gold', title: 'Clear limits', desc: 'No employment promises or fixed-time mastery guarantees. Inventory counts, structural checks, grader fixtures and evidence of learning answer different questions.' },
  ];

  const assessmentTypes: { t: string; chip: string }[] = [
    // one tone per category: knowledge & reasoning = info, code = success, performance = warning
    { t: 'Multiple-choice', chip: 'chip chip-info' },
    { t: 'Multiple-select', chip: 'chip chip-info' },
    { t: 'Numeric problems', chip: 'chip chip-info' },
    { t: 'Short-answer reasoning', chip: 'chip chip-info' },
    { t: 'Code-output prediction', chip: 'chip chip-success' },
    { t: 'Full judged programming problems', chip: 'chip chip-success' },
    { t: 'Timed assessments', chip: 'chip chip-warning' },
    { t: 'Screening simulations', chip: 'chip chip-warning' },
    { t: 'Cumulative retrieval checks', chip: 'chip chip-info' },
  ];

  const lessonParts = ['Title & estimated time', 'Prerequisites (enforced)', 'Learning objectives', 'A real motivating problem', 'Intuitive explanation', 'Formal explanation', 'Visual/interactive demonstration', 'Step-by-step derivation', 'Worked examples', 'Guided exercise', 'Independent exercise', 'Coding implementation where applicable', 'Common mistakes', 'Real-world application', 'Quantitative finance application', 'Knowledge check (server-scored)', 'Summary', 'Flashcards created', 'Further practice links', 'References'];

  // the 20 parts grouped into 4 phases with distinct visual identity


  const partPhases = [
    { title: 'Set up', icon: Target, tile: 'icon-tile-info', numCls: 'bg-info-strong text-on-info', from: 0, to: 5 },
    { title: 'Practice', icon: PencilLine, tile: 'icon-tile-accent', numCls: 'bg-accent-strong text-on-accent', from: 5, to: 12 },
    { title: 'Feedback', icon: MessageSquareText, tile: 'icon-tile-warning', numCls: 'bg-warning text-[#232f3f]', from: 12, to: 16 },
    { title: 'Retention', icon: RefreshCcw, tile: 'icon-tile-violet', numCls: 'bg-violet text-on-violet', from: 16, to: 20 },
  ];

  const body = (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero">
        <span className="icon-tile icon-tile-violet"><GraduationCap className="h-7 w-7" /></span>
        <div>
          <h1>How this platform teaches</h1>
          <p className="page-sub">Retrieval practice, spacing, interleaving, immediate feedback, old ideas from learning research, applied seriously to a curriculum this deep.</p>
        </div>
      </header>

      <p className="text-muted leading-relaxed font-semibold max-w-3xl">
        The methods here are not new: the things learning research has backed for decades. What’s unusual is applying
        them to learning and practice. The principles below describe the intended teaching approach, not a guarantee
        that every lesson or example has completed every check.
      </p>

      {/* evidence band, canonical horizontal stat tiles, two hues + neutral */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BookCheck, tile: 'icon-tile-accent', value: String(reg.lessons.length), label: 'Classic lessons' },
          { icon: Layers, tile: 'icon-tile-info', value: String(map.phases.reduce((n, p) => n + p.modules.length, 0)), label: 'Classic modules' },
          { icon: ListChecks, tile: 'icon-tile-neutral', value: '20', label: 'Target lesson parts' },
          { icon: ClipboardCheck, tile: 'icon-tile-neutral', value: '9', label: 'Assessment types' },
        ].map((s, i) => (
          <div key={s.label} className="stat-tile anim-pop-in min-w-0" style={{ animationDelay: `${i * 60}ms` }}>
            <span className={`icon-tile icon-tile-sm ${s.tile}`}><s.icon className="h-5 w-5" /></span>
            <div className="stat-body min-w-0">
              <div className="stat-value tnum">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7">
        {/* card 01 is the feature row, the rest sit in a 2-col rhythm grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {(() => {
            const hero = principles[0];
            const HeroIcon = hero.icon;
            return (
              <div className="qf-card p-6 flex gap-4 anim-slide-up sm:col-span-2 min-w-0">
                <span className={`icon-tile ${hero.tile} h-14 w-14 shrink-0`}>
                  <HeroIcon className="h-7 w-7" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                    {hero.title}
                    <span className="text-[12px] font-black text-faint tnum">01</span>
                  </h2>
                  <p className="mt-1.5 text-[15px] text-muted leading-relaxed font-semibold">{hero.desc}</p>
                </div>
              </div>
            );
          })()}
          {principles.slice(1).map((p, i) => (
            <div key={p.title} className="qf-card-flat p-5 flex gap-4 hover:border-[var(--border-strong)] transition-colors anim-slide-up min-w-0">
              <span className={`icon-tile ${p.tile} h-12 w-12 shrink-0`}>
                <p.icon className="h-6 w-6" strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <h2 className="font-extrabold tracking-tight flex items-center gap-2">
                  {p.title}
                  <span className="text-[12px] font-black text-faint tnum">0{i + 2}</span>
                </h2>
                <p className="mt-1 text-[15px] text-muted leading-relaxed font-semibold">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-10">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-accent"><ListChecks className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-black tracking-tight">How a lesson works</h2>
            <p className="text-[13px] font-bold text-muted">A target structure for classic lessons, not a claim that every lesson has passed a content review</p>
          </div>
        </div>
        {/* the 20 parts are ONE numbered sequence: phase legend + a single flowing list,
            so both former columns fill evenly with no dead area under short phases */}
        <div className="mt-4 flex flex-wrap gap-2">
          {partPhases.map(ph => {
            const PhIcon = ph.icon;
            return (
              <span key={ph.title} className="chip !py-1">
                <span className={`icon-tile icon-tile-sm !h-5 !w-5 !rounded-md ${ph.tile}`}><PhIcon className="!h-3 !w-3" /></span>
                {ph.title}
                <span className="text-muted tnum">{ph.from + 1} to {ph.to}</span>
              </span>
            );
          })}
        </div>
        <ol className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {lessonParts.map((t, i) => {
            const ph = partPhases.find(p => i >= p.from && i < p.to) ?? partPhases[0];
            return (
              <li key={t} className="flex items-center gap-2.5 rounded-xl bg-surface-2/50 border border-border/60 px-2.5 py-1.5 text-[13px] font-bold min-w-0">
                <span className={`h-5 w-5 shrink-0 rounded-lg ${ph.numCls} text-[12px] font-black tnum flex items-center justify-center`}>{i + 1}</span>
                <span className="min-w-0 truncate">{t}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-10">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-warning"><ClipboardCheck className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-black tracking-tight">Assessment types</h2>
            <p className="text-[13px] font-bold text-muted">Different formats for recall, reasoning and application</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {assessmentTypes.map(a => (
            <span key={a.t} className={`${a.chip} justify-center`}>{a.t}</span>
          ))}
        </div>
        <p className="mt-4 text-[15px] text-muted font-semibold qf-card-flat p-4 !bg-surface-2/50">
          Answer checks and practice records provide different kinds of evidence. A correct response alone does not prove durable understanding.
        </p>
      </section>

      <section className="mt-10 qf-card p-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-12 h-40 w-40 rounded-full bg-accent-soft" aria-hidden />
        <div className="relative">
          <div className="section-head !mb-2">
            <span className="icon-tile icon-tile-sm icon-tile-info"><BookCheck className="h-5 w-5" /></span>
            <h2 className="text-lg font-black tracking-tight">Content standards</h2>
          </div>
          <ul className="mt-3 grid sm:grid-cols-2 gap-2.5">
            {[
              'Automated checks inspect lesson structure, quiz answers, math delimiters and code plausibility',
              'Interactive component registration is checked; this does not replace testing each activity',
              'Prerequisite references are checked against the curriculum; learning order still needs review',
              'Automated checks do not prove every calculation or finance example correct; examples need separate review',
              'Primary references are preferred, including cppreference, OpenStax and official software documentation',
              'References support a lesson; a reference link alone is not evidence of learning quality',
            ].map(t => (
              <li key={t} className="flex items-start gap-2.5 rounded-xl bg-surface-2/50 border border-border/60 px-3 py-2.5 text-[15px] font-semibold text-muted">
                <BookCheck className="h-4 w-4 text-info shrink-0 mt-0.5" />
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[15px] text-muted leading-relaxed font-semibold max-w-2xl">
            The classic inventory contains {reg.lessons.length} lessons across {map.phases.reduce((n, p) => n + p.modules.length, 0)} modules. These counts are not a validation pass report. The rebuilt workspace has separate content and progress. Check results apply only to the version and scope tested; passing a structural check does not certify teaching quality or mathematical correctness.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/curriculum" className="btn3d">
              Browse the curriculum <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/diagnostic" className="btn3d btn3d-ghost">
              Take the diagnostic
            </Link>
          </div>
        </div>
      </section>
    </div>
  );

  if (!user) {
    return <div className="min-h-screen flex flex-col"><PublicHeader user={null} />{body}</div>;
  }
  return <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>{body}</AppShell>;
}
