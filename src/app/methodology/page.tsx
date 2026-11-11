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
    { icon: Brain, tile: 'icon-tile-accent', title: 'First principles, actually', desc: 'Nothing is assumed. Variables, derivatives, pointers, distributions, instruments, all taught from zero, and no formula shows up before the reason it exists.' },
    { icon: Layers, tile: 'icon-tile-info', title: 'Prerequisites are enforced, not suggested', desc: `Lessons unlock through a prerequisite graph covering ${reg.lessons.length} lessons. If a lesson says you need something, the thing you need is on the platform, you shouldn’t have to leave mid-lesson to go find it.` },
    { icon: Gauge, tile: 'icon-tile-violet', title: 'Mastery over exposure', desc: 'Score 80%+ on the knowledge check and finish the exercises, and the lesson is “passed”. To call it “mastered” you have to hold onto it, the material comes back later, and you have to land it again.' },
    { icon: Repeat, tile: 'icon-tile-warning', title: 'Spaced retrieval', desc: 'Every lesson generates flashcards, scheduled with SM-2 (the Anki algorithm). Quiz questions you miss join the same queue. Reviewing a card after it was due is what upgrades a lesson from passed to mastered.' },
    { icon: ClipboardCheck, tile: 'icon-tile-gold', title: 'No fake anything', desc: 'No employment promises, no “learn C++ in 21 days”, no metrics invented to look impressive. If a module isn’t finished, the platform says so. Every number you see was measured.' },
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

  const lessonParts = ['Title & estimated time', 'Prerequisites (enforced)', 'Learning objectives', 'A real motivating problem', 'Intuitive explanation', 'Formal explanation', 'Visual/interactive demonstration', 'Step-by-step derivation', 'Worked examples with verified numbers', 'Guided exercise', 'Independent exercise', 'Coding implementation where applicable', 'Common mistakes', 'Real-world application', 'Quantitative finance application', 'Knowledge check (server-scored)', 'Summary', 'Flashcards created', 'Further practice links', 'References'];

  // the 20 parts grouped into 4 phases with distinct visual identity


  const partPhases = [
    { title: 'Set up', icon: Target, tile: 'icon-tile-info', numCls: 'bg-info', from: 0, to: 5 },
    { title: 'Practice', icon: PencilLine, tile: 'icon-tile-accent', numCls: 'bg-accent', from: 5, to: 12 },
    { title: 'Feedback', icon: MessageSquareText, tile: 'icon-tile-warning', numCls: 'bg-warning', from: 12, to: 16 },
    { title: 'Retention', icon: RefreshCcw, tile: 'icon-tile-violet', numCls: 'bg-violet', from: 16, to: 20 },
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
        them without compromise to a curriculum with the standards of a university programme and the practical bent of
        actual engineering work.
      </p>

      {/* evidence band — canonical horizontal stat tiles, two hues + neutral */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BookCheck, tile: 'icon-tile-accent', value: String(reg.lessons.length), label: 'Authored lessons' },
          { icon: Layers, tile: 'icon-tile-info', value: String(map.phases.reduce((n, p) => n + p.modules.length, 0)), label: 'Modules' },
          { icon: ListChecks, tile: 'icon-tile-neutral', value: '20', label: 'Parts per lesson' },
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
                    <span className="text-[10px] font-black text-faint tnum">01</span>
                  </h2>
                  <p className="mt-1.5 text-sm text-muted leading-relaxed font-semibold">{hero.desc}</p>
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
                  <span className="text-[10px] font-black text-faint tnum">0{i + 2}</span>
                </h2>
                <p className="mt-1 text-sm text-muted leading-relaxed font-semibold">{p.desc}</p>
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
            <p className="text-xs font-bold text-muted">Every lesson follows the same 20-part structure so you always know where you are</p>
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
                <span className="text-muted tnum">{ph.from + 1}–{ph.to}</span>
              </span>
            );
          })}
        </div>
        <ol className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {lessonParts.map((t, i) => {
            const ph = partPhases.find(p => i >= p.from && i < p.to) ?? partPhases[0];
            return (
              <li key={t} className="flex items-center gap-2.5 rounded-xl bg-surface-2/50 border border-border/60 px-2.5 py-1.5 text-[13px] font-bold min-w-0">
                <span className={`h-5 w-5 shrink-0 rounded-lg ${ph.numCls} text-white text-[10px] font-black tnum flex items-center justify-center`}>{i + 1}</span>
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
            <p className="text-xs font-bold text-muted">Nine ways you prove it, none of them guessable</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {assessmentTypes.map(a => (
            <span key={a.t} className={`${a.chip} justify-center`}>{a.t}</span>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted font-semibold qf-card-flat p-4 !bg-surface-2/50">
          The bar is deliberately strict: you can’t guess your way through, and time-on-page counts for nothing.
          That can feel harsh. It beats the alternative.
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
              'Automated schema gate on every lesson, quiz answers, math delimiters, code plausibility',
              'Interactive components must be registered, broken embeds fail validation, not at runtime',
              'Prerequisites must resolve inside the platform, no lesson sends you off-site mid-stream',
              'Mathematical examples carry hand-verified numbers; finance examples use clearly-hypothetical data',
              'References prefer primary sources, cppreference, OpenStax, Python/NumPy, PostgreSQL, Linux docs',
              'References never substitute for the lesson itself',
            ].map(t => (
              <li key={t} className="flex items-start gap-2.5 rounded-xl bg-surface-2/50 border border-border/60 px-3 py-2.5 text-sm font-semibold text-muted">
                <BookCheck className="h-4 w-4 text-info shrink-0 mt-0.5" />
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted leading-relaxed font-semibold max-w-2xl">
            The gate currently covers {reg.lessons.length} lessons across {map.phases.reduce((n, p) => n + p.modules.length, 0)} modules, and every one of them passed it.
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
