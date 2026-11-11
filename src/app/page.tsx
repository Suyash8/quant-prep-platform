import Link from 'next/link';
import { PublicHeader } from '@/components/app-shell';
import { getCurrentUser } from '@/lib/auth';
import { getMap, getRegistry, listProblems, listProjects } from '@/lib/content';
import { mathText } from '@/lib/math-text';
import { Mascot } from '@/components/brand/mascot';
import { ProgressRing } from '@/components/ui/page-kit';
import { sectionHeadClass } from '@/components/marketing/landing-helpers';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowRight, BookOpenCheck, BrainCircuit, Code2, LineChart, ShieldCheck, Timer, Undo2, Zap, Flame,
  Trophy, Map as MapIcon, FlaskConical, CloudOff, CheckCircle2, Target, ListChecks, CloudDownload,
  Sigma, ChevronDown, GraduationCap, Calculator, Binary, Braces, Boxes, Gauge, Banknote, Percent,
  Landmark, Cpu,
} from 'lucide-react';

const PHASE_ICONS: Record<string, typeof MapIcon> = {
  orientation: GraduationCap, math: Calculator, cs: Binary, python: Braces, cpp: Boxes,
  dsa: Gauge, aptitude: Target, finance: Banknote, stats: Percent, pricing: Landmark, systems: Cpu,
};
const PHASE_TONES: Record<string, string> = {
  orientation: 'accent', math: 'info', cs: 'violet', python: 'info', cpp: 'accent',
  dsa: 'warning', aptitude: 'violet', finance: 'accent', stats: 'info', pricing: 'gold', systems: 'danger',
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  const map = getMap();
  const reg = getRegistry();
  const problems = listProblems();
  const projects = listProjects();

  const publishedLessons = reg.lessons.length;
  const modules = map.phases.reduce((n, p) => n + p.modules.length, 0);
  const totalHours = Math.round(reg.lessons.reduce((n, l) => n + l.estMinutes, 0) / 60);

  const pillars = [
    { icon: BrainCircuit, tone: 'info', title: 'Math, from arithmetic up', desc: 'If your algebra is shaky, we fix that first. The sequence runs from fractions to stochastic calculus, and every formula shows up only after you know why it exists.' },
    { icon: Code2, tone: 'violet', title: 'C++ and Python, for real', desc: 'Nine C++ levels that end at lock-free concurrency, plus a Python track through NumPy and friends. You submit code, a real compiler runs it, and you see the result.' },
    { icon: LineChart, tone: 'accent', title: 'Finance you can implement', desc: 'Not finance trivia. Order books, options pricing, portfolio math, the pieces you can actually put in code, built up from first principles.' },
    { icon: BookOpenCheck, tone: 'warning', title: 'Progress you can trust', desc: 'Quizzes are scored on the server, exercises must be done, and lessons you pass come back later to be re-earned through spaced review. No participation trophies.' },
  ];

  const features = [
    { icon: Code2, tone: 'accent', title: 'Your code actually runs', chip: 'Real g++', desc: 'C++17/C++20 compiled with g++ and Python 3, executed in a sandboxed runner with CPU, memory and output limits. Not a toy textarea.' },
    { icon: Timer, tone: 'info', title: 'Mental math drills', chip: '8 modes', desc: 'Timed arithmetic practice with speed and accuracy tracking, so the easy stuff stops slowing you down later.' },
    { icon: Undo2, tone: 'violet', title: 'Flashcards that come back', chip: 'SM-2', desc: 'Every lesson generates cards, scheduled by SM-2, the same algorithm Anki uses. Miss a quiz question and it joins the queue too.' },
    { icon: FlaskConical, tone: 'gold', title: 'Interactive labs', chip: `${33} labs`, desc: 'Derivative plots, order book simulators, memory layout visualizers. You drag a slider and watch the math move, inside the lesson.' },
    { icon: CloudOff, tone: 'info', title: 'Works offline', chip: 'PWA', desc: 'Download the content packs once, then keep studying on a plane. Progress syncs when you land. No subscription required for that.' },
    { icon: ShieldCheck, tone: 'danger', title: 'No inflated numbers', chip: 'Honest', desc: 'Every metric on your dashboard is computed from what you actually did. Unfinished topics say so. We would rather be boring than fake.' },
  ];

  const steps = [
    { icon: BookOpenCheck, tone: 'accent', title: 'Read a small card', desc: 'One idea at a time, five to twenty minutes, with the math rendered and the jargon decoded.' },
    { icon: FlaskConical, tone: 'info', title: 'Try it yourself', desc: 'A lab to drag, an exercise to work, a quiz question to answer. Doing the thing beats watching the thing.' },
    { icon: Trophy, tone: 'gold', title: 'Get scored instantly', desc: 'Answers grade on the spot, XP lands in your streak, and missed cards come back tomorrow. Nothing is a mystery.' },
  ];

  const tracks = Object.entries(map.tracks);
  const trackTones = ['accent', 'info', 'violet', 'warning', 'danger'];

  const stats = [
    { k: `${publishedLessons}`, v: 'bite-sized lessons', tone: 'text-accent-deep dark:text-accent' },
    { k: '33', v: 'interactive labs', tone: 'text-info' },
    { k: `${problems.length}`, v: 'judged problems', tone: 'text-violet' },
    { k: `${totalHours}h+`, v: 'of core content', tone: 'text-warning-strong dark:text-warning' },
  ];

  const phases = map.phases.map(p => ({
    id: p.id,
    title: p.title,
    tone: PHASE_TONES[p.color] ?? 'accent',
    icon: PHASE_ICONS[p.color] ?? MapIcon,
    lessons: p.modules.reduce((n, mod) => n + mod.lessons.length, 0),
  }));

  const faqs = [
    { q: 'Do I need to know programming already?', a: 'No. Phase 0 assumes nothing. Arithmetic and pre-algebra are lessons here, not prerequisites, and the first C++ you see is explained line by line.' },
    { q: 'Does it really work offline?', a: 'Yes. The lessons, labs, drills, flashcards and the problem statements are content packs your browser caches. Quiz grading happens on your device, and your progress syncs the next time you are online.' },
    { q: 'Is the code run for real?', a: 'Yes. When the runner service is up, your C++ is compiled with g++ and your Python runs on Python 3, in a sandbox with CPU, memory and output limits. If the runner is unreachable you get a clearly labeled simulator instead, never a fake pass.' },
    { q: 'How is progress scored?', a: 'A lesson needs 80 percent on its quiz plus a completed exercise to count as passed. Lessons you pass come back through spaced review, and mastering them requires passing again later. The server verifies every XP event, and the same grader runs locally so the two never disagree.' },
    { q: 'Can I skip ahead?', a: 'Only through what you can prove. The diagnostic can place you into a later phase, and each lesson unlocks when its prerequisites are passed. There is no fast-forward button, because that is exactly how people end up lost at stochastic calculus.' },
    { q: 'What does it cost?', a: 'The price is set by the site owner, not by a countdown timer. There are no invented testimonials and no fake urgency. What you can check right now, for free, is the whole curriculum and the diagnostic.' },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-x-clip">
      <PublicHeader user={user ? { name: user.name } : null} />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b-2 border-border bg-surface relative overflow-hidden">
          {/* floating math symbols */}
          <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
            <span className="absolute left-[6%] top-[18%] text-5xl font-black text-accent/20 anim-float" style={{ animationDelay: '0.4s' }}>Σ</span>
            <span className="absolute right-[8%] top-[14%] text-4xl font-black text-info/25 anim-float-slow">σ</span>
            <span className="absolute left-[14%] bottom-[16%] text-5xl font-black text-violet/20 anim-float-slow" style={{ animationDelay: '1.2s' }}>Δ</span>
            <span className="absolute right-[16%] bottom-[24%] text-4xl font-black text-flame/25 anim-float" style={{ animationDelay: '0.8s' }}>π</span>
            <span className="absolute left-[42%] top-[8%] text-3xl font-black text-warning/15 anim-float" style={{ animationDelay: '1.6s' }}>∫</span>
            <span className="absolute right-[38%] bottom-[10%] text-3xl font-black text-danger/15 anim-float-slow" style={{ animationDelay: '0.2s' }}>λ</span>
          </div>
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent-soft blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-info-soft blur-2xl" aria-hidden />

          <div className="relative max-w-6xl mx-auto px-4 lg:px-6 py-16 lg:py-24 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
            <div>
              <span className="chip chip-accent anim-pop-in">Zero to quantitative developer</span>
              <h1 className="mt-5 text-4xl lg:text-6xl font-black tracking-tight leading-[1.05] max-w-3xl anim-slide-up">
                Everything between your first line of code and{' '}
                <span className="text-accent">building trading systems.</span>
              </h1>
              <p className="mt-5 text-lg text-muted max-w-2xl leading-relaxed font-semibold anim-slide-up" style={{ animationDelay: '0.1s' }}>
                {publishedLessons} lessons in {modules} modules, {problems.length} judged coding problems and {projects.length} portfolio
                projects, one path from what a variable is to pricing libraries, order books and low-latency C++.
                The lessons build on each other, in order, on purpose.
              </p>
              <p className="mt-3 text-sm text-faint max-w-2xl font-semibold anim-slide-up" style={{ animationDelay: '0.15s' }}>
                We won&apos;t promise you a job in 90 days. It&apos;s {totalHours}+ hours of core lesson time, and the role demands that depth.
              </p>
              <div className="mt-8 flex flex-wrap gap-4 anim-slide-up" style={{ animationDelay: '0.2s' }}>
                <Link href={user ? '/dashboard' : '/register'} className="btn3d btn3d-lg">
                  {user ? 'Continue learning' : 'Start free, take the diagnostic'} <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link href="/curriculum" className="btn3d btn3d-ghost btn3d-lg">
                  Explore the path
                </Link>
              </div>

              {/* trust chips */}
              <div className="mt-8 flex flex-wrap items-center gap-3 anim-slide-up" style={{ animationDelay: '0.3s' }}>
                <span className="chip"><CloudOff className="h-3 w-3" aria-hidden="true" /> Works offline</span>
                <span className="chip"><Code2 className="h-3 w-3" aria-hidden="true" /> Real C++ compiler</span>
                <span className="chip"><ListChecks className="h-3 w-3" aria-hidden="true" /> {publishedLessons} lessons</span>
              </div>
            </div>

            {/* product mock, a slice of the real path UI + quiz + ring + mascot */}
            <div className="relative anim-pop-in" style={{ animationDelay: '0.25s' }} aria-hidden>
              <div className="qf-card p-6 rotate-1 hover:rotate-0 transition-transform duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">Your path</span>
                  <span className="flex items-center gap-2">
                    <span className="hud-pill"><Flame className="h-3.5 w-3.5 text-flame anim-flame" /><span className="text-xs tnum">7</span></span>
                    <span className="hud-pill"><Zap className="h-3.5 w-3.5 text-warning" /><span className="text-xs tnum">1,480</span></span>
                  </span>
                </div>
                <div className="mt-4 flex flex-col items-center gap-0">
                  <div className="flex flex-col items-center">
                    <span className="h-14 w-14 rounded-full flex items-center justify-center border-[3.5px] border-white shadow-[0_5px_0_0_var(--warning-strong)] bg-gold">
                      <Trophy className="h-6 w-6 text-white fill-white" />
                    </span>
                    <span className="mt-1.5 text-xs font-extrabold">Orientation</span>
                    <span className="h-5 w-2 rounded bg-accent" />
                  </div>
                  <div className="flex flex-col items-center translate-x-9">
                    <span className="h-14 w-14 rounded-full flex items-center justify-center border-[3.5px] border-white shadow-[0_5px_0_0_var(--accent-deep)] bg-accent">
                      <BookOpenCheck className="h-6 w-6 text-white" strokeWidth={3} />
                    </span>
                    <span className="mt-1.5 text-xs font-extrabold">Arithmetic</span>
                    <span className="h-5 w-2 rounded bg-surface-3" />
                  </div>
                  <div className="flex flex-col items-center -translate-x-6">
                    <span className="relative h-16 w-16 rounded-full flex items-center justify-center border-[3.5px] border-white shadow-[0_5px_0_0_var(--accent-deep)] bg-accent anim-pulse-ring">
                      <Zap className="h-7 w-7 text-white fill-white" />
                    </span>
                    <span className="mt-1.5 text-xs font-extrabold">Pre-algebra</span>
                    <span className="mt-1.5 rounded-xl bg-foreground px-3 py-1 text-xs font-black tracking-wide text-background anim-bob">START</span>
                  </div>
                  <div className="flex flex-col items-center translate-x-6">
                    <span className="h-14 w-14 rounded-full flex items-center justify-center border-[3.5px] border-white shadow-[0_5px_0_0_var(--border-strong)] bg-surface-3">
                      <Sigma className="h-6 w-6 text-faint" />
                    </span>
                    <span className="mt-1.5 text-xs font-extrabold text-faint">Algebra</span>
                  </div>
                </div>
                {/* quiz tile mock: a selected answer */}
                <div className="qf-answer-tile qf-selected mt-5">
                  <span className="qf-letter">B</span>
                  <span className="flex-1 text-sm">buy the dip, explained</span>
                  <CheckCircle2 className="h-5 w-5 text-accent-deep" />
                </div>
                {/* daily goal ring */}
                <div className="mt-5 flex items-center gap-4">
                  <ProgressRing value={50} size={52} label="Daily goal half done">
                    <span className="text-xs font-black tnum">50%</span>
                  </ProgressRing>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-black text-faint tnum">
                      <span>Daily goal</span><span>30 / 60 XP</span>
                    </div>
                    <div className="prog-track mt-1.5">
                      <div className="prog-fill" style={{ width: '50%' }} />
                    </div>
                  </div>
                </div>
              </div>
              {/* mascot peeking inside the card, fully contained */}
              <span className="absolute bottom-3 right-4 anim-bob">
                <Mascot pose="cheer" size={64} />
              </span>
            </div>
          </div>

          {/* stats strip */}
          <div className="relative max-w-6xl mx-auto px-4 lg:px-6 pb-14">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map(s => (
                <div key={s.v} className="stat-tile anim-pop-in">
                  <dt className={`text-3xl font-black tnum ${s.tone}`}>{s.k}</dt>
                  <dd className="stat-label">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* How a lesson feels */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <div className="section-head">
            <span className="icon-tile-sm icon-tile-accent"><GraduationCap className="h-4 w-4" aria-hidden="true" /></span>
            <h2 className={sectionHeadClass}>How a lesson feels</h2>
          </div>
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {steps.map((s, i) => (
              <div key={s.title} className="qf-card p-5 anim-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center gap-3">
                  <span className={`icon-tile icon-tile-${s.tone}`}><s.icon className="h-5 w-5" aria-hidden="true" strokeWidth={2.5} /></span>
                  <span className="chip">Step {i + 1}</span>
                </div>
                <h3 className="mt-3 font-black">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted leading-relaxed font-semibold">{s.desc}</p>
                <div className="mt-4 qf-card-flat p-3">
                  {i === 0 && (
                    <div className="space-y-1.5" aria-hidden="true">
                      <div className="h-2 w-10/12 rounded-full bg-surface-3" />
                      <div className="h-2 w-full rounded-full bg-surface-3" />
                      <div className="h-2 w-8/12 rounded-full bg-surface-3" />
                      <span className="text-warning-strong dark:text-warning font-mono text-xs font-black">E = mc²</span>
                      <div className="h-2 w-11/12 rounded-full bg-surface-3" />
                    </div>
                  )}
                  {i === 1 && (
                    <div className="flex items-center gap-3" aria-hidden="true">
                      <input type="range" className="qf-range w-24" style={{ ['--fill' as string]: '55%' }} readOnly aria-hidden="true" tabIndex={-1} />
                      <span className="chip chip-info tnum">v = 5.5</span>
                    </div>
                  )}
                  {i === 2 && (
                    <div className="flex items-center gap-2" aria-hidden="true">
                      <span className="chip chip-success tnum">+20 XP</span>
                      <span className="chip chip-gold tnum">7 day streak</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pillars */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 pb-16">
          <div className="section-head">
            <span className="icon-tile-sm icon-tile-violet"><BrainCircuit className="h-4 w-4" aria-hidden="true" /></span>
            <h2 className={sectionHeadClass}>What you&apos;ll actually study</h2>
          </div>
          <p className="mt-2 text-muted max-w-2xl font-semibold">The four strands run side by side. The derivative you play with in the math lab is the same delta you hedge in the finance module, and the same number you compute in C++.</p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((p, i) => (
              <div key={p.title} className={`qf-card-flat p-5 anim-slide-up`} style={{ animationDelay: `${i * 80}ms` }}>
                <span className={`icon-tile icon-tile-${p.tone}`}><p.icon className="h-5 w-5" aria-hidden="true" strokeWidth={2.5} /></span>
                <h3 className="mt-3 font-black">{p.title}</h3>
                <p className="mt-1.5 text-sm text-muted leading-relaxed font-semibold">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The path: all 11 phases as a visual strip */}
        <section className="border-y-2 border-border bg-surface-2/60">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
            <div className="section-head">
              <span className="icon-tile-sm icon-tile-accent"><MapIcon className="h-4 w-4" aria-hidden="true" /></span>
              <h2 className={sectionHeadClass}>The path, all {phases.length} phases</h2>
            </div>
            <p className="mt-2 text-muted max-w-2xl font-semibold">One spine from orientation to low-latency systems. Each phase unlocks when you clear the ones before it.</p>
            <div className="mt-8 qf-card bg-dots p-6 overflow-x-auto thin-scroll">
              <div className="flex items-stretch gap-3 min-w-max">
                {phases.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="path-node w-44 shrink-0">
                      <div className="qf-card-flat p-4 text-center">
                        <span className={`icon-tile icon-tile-${p.tone} mx-auto`}><p.icon className="h-5 w-5" aria-hidden="true" /></span>
                        <p className="mt-2 text-xs font-black leading-snug">{p.title}</p>
                        <span className="chip mt-2 tnum"><ListChecks className="h-3 w-3" aria-hidden="true" /> {p.lessons}</span>
                      </div>
                    </div>
                    {i < phases.length - 1 && (
                      <span className="h-1 w-6 rounded-full bg-surface-3 shrink-0" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <div className="section-head">
            <span className="icon-tile-sm icon-tile-info"><FlaskConical className="h-4 w-4" aria-hidden="true" /></span>
            <h2 className={sectionHeadClass}>Built like an engineering project</h2>
          </div>
          <p className="mt-2 text-muted max-w-2xl font-semibold">Most course platforms are a video player bolted to a payment form. This one is different in the parts you can check.</p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={f.title} className="qf-card-flat p-5 anim-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between">
                  <span className={`icon-tile icon-tile-${f.tone}`}><f.icon className="h-5 w-5" aria-hidden="true" strokeWidth={2.5} /></span>
                  <span className="chip">{f.chip}</span>
                </div>
                <h3 className="mt-3 font-black">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted leading-relaxed font-semibold">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tracks */}
        <section className="border-y-2 border-border bg-surface-2/60">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
            <div className="section-head">
              <span className="icon-tile-sm icon-tile-warning"><Target className="h-4 w-4" aria-hidden="true" /></span>
              <h2 className={sectionHeadClass}>One foundation, five directions after</h2>
            </div>
            <p className="mt-2 text-muted max-w-2xl font-semibold">Asset management, banking, HFT, research and infrastructure all draw on the same base, but they weight it differently. Pick a track and the planner tilts your schedule accordingly.</p>
            <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tracks.map(([key, t], i) => {
                const tone = trackTones[i % trackTones.length];
                return (
                  <Link
                    key={key} href={`/career#${key}`}
                    className={`qf-card-flat p-5 hover:-translate-y-1 transition-all press block relative overflow-hidden group anim-slide-up`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-center justify-between relative">
                      <span className={`chip chip-${tone}`}>Track {key}</span>
                      <ArrowRight className="h-4 w-4 text-faint group-hover:text-foreground transition-colors" aria-hidden="true" />
                    </div>
                    <h3 className="mt-3 font-black leading-snug relative">{t.title}</h3>
                    <p className="mt-1.5 text-sm text-muted leading-relaxed font-semibold relative">{t.focus}</p>
                  </Link>
                );
              })}
              <Link href="/diagnostic" className="qf-card-flat p-5 hover:-translate-y-1 transition-all press block relative overflow-hidden group !bg-surface-2/50 border-2 border-dashed">
                <div className="flex items-center justify-between">
                  <span className="chip">Not sure yet?</span>
                  <ArrowRight className="h-4 w-4 text-faint group-hover:text-foreground transition-colors" aria-hidden="true" />
                </div>
                <h3 className="mt-3 font-black leading-snug">Take the diagnostic first</h3>
                <p className="mt-1.5 text-sm text-muted leading-relaxed font-semibold">
                  28 questions, about 45 minutes, it places you at the right phase and the track picks itself.
                </p>
              </Link>
            </div>
          </div>
        </section>

        {/* Offline / PWA band */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <div className="qf-card p-6 lg:p-8 grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            <div>
              <div className="section-head">
                <span className="icon-tile-sm icon-tile-info"><CloudDownload className="h-4 w-4" aria-hidden="true" /></span>
                <h2 className={sectionHeadClass}>Download once, study on a plane.</h2>
              </div>
              <p className="mt-2 text-muted max-w-xl font-semibold leading-relaxed">
                The whole curriculum is a set of content packs your browser caches. Lessons, labs, drills and flashcards keep working with the network off, and your progress syncs the moment you reconnect. It is a PWA, not a promise.
              </p>
            </div>
            <div className="qf-card-flat p-5 space-y-4" aria-hidden="true">
              <div className="flex items-center justify-between text-xs font-black">
                <span>Downloading Phase 4: Modern C++</span>
                <span className="tnum text-muted">64%</span>
              </div>
              <div className="prog-track"><div className="prog-fill prog-fill-info" style={{ width: '64%' }} /></div>
              <div className="flex items-center gap-2">
                <span className="chip chip-success"><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Phase 0 cached</span>
                <span className="chip chip-info tnum">18 of 46 lessons</span>
              </div>
            </div>
          </div>
        </section>

        {/* Honest quote */}
        <section className="border-t-2 border-border bg-surface">
          <div className="max-w-4xl mx-auto px-4 lg:px-6 py-16 text-center relative overflow-hidden">
            <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-accent-soft blur-2xl" aria-hidden />
            <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-info-soft blur-2xl" aria-hidden />
            <p className="relative text-xl lg:text-2xl leading-relaxed font-bold tracking-tight">
              {mathText('Math connects to algorithms, algorithms to implementations, implementations to the machine they run on. A quant developer who can\u2019t trace that chain end to end is guessing. This platform exists so you never have to guess.')}
            </p>
            <p className="relative mt-4 text-sm font-bold text-muted">We would rather be boring than fake.</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <div className="section-head">
            <span className="icon-tile-sm icon-tile-violet"><Zap className="h-4 w-4" aria-hidden="true" /></span>
            <h2 className={sectionHeadClass}>Straight answers</h2>
          </div>
          <Accordion type="single" collapsible className="mt-6 qf-card-flat p-2 sm:p-4">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm font-black text-left px-3 py-3 hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted font-semibold px-3 pb-4">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Final CTA band */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 pb-16">
          <div className="qf-card bg-dots p-8 flex flex-col items-center gap-4 text-center">
            <Mascot pose="celebrate" size={110} />
            <h2 className="text-2xl font-black tracking-tight max-w-lg">Your first lesson is 6 minutes long.</h2>
            <p className="text-sm font-semibold text-muted max-w-md">
              That is the whole commitment to start. The diagnostic after it tells you where to begin for real.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-1">
              <Link href={user ? '/dashboard' : '/register'} className="btn3d btn3d-lg">
                {user ? 'Back to studying' : 'Start with the diagnostic'} <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 qf-footer !grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="press text-foreground mb-2">
              <span className="flex items-center gap-2.5 font-black tracking-tight text-lg">
                <span className="h-9 w-9 rounded-2xl bg-accent shadow-[0_3px_0_0_var(--accent-deep)] flex items-center justify-center font-black text-white text-lg">Σ</span>
                QuantFoundry
              </span>
            </Link>
            <p className="text-sm font-semibold text-muted max-w-xs mb-3">
              Original teaching content, conventions following cppreference, OpenStax, Python and NumPy docs.
            </p>
            <div className="flex items-center gap-2">
              <span className="chip chip-accent"><CloudOff className="h-3 w-3" aria-hidden="true" /> Works offline</span>
              <span className="chip">v3.1</span>
            </div>
          </div>
          <nav aria-label="Learn links">
            <h3>Learn</h3>
            <Link href="/curriculum">Curriculum</Link>
            <Link href="/learn">Lessons</Link>
            <Link href="/lab">Interactive labs</Link>
            <Link href="/drills">Mental drills</Link>
          </nav>
          <nav aria-label="Practice links">
            <h3>Practice</h3>
            <Link href="/practice">Code problems</Link>
            <Link href="/assessments">Assessments</Link>
            <Link href="/projects">Projects</Link>
            <Link href="/diagnostic">Diagnostic</Link>
          </nav>
          <nav aria-label="Product links">
            <h3>Product</h3>
            <Link href="/methodology">Methodology</Link>
            <Link href="/career">Career tracks</Link>
            <Link href="/about">About</Link>
            <Link href="/register">Start free</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
