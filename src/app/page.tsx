import { APP_VERSION } from '@/lib/version';
import Link from 'next/link';
import { PublicHeader } from '@/components/app-shell';
import { getCurrentUser } from '@/lib/auth';
import { countLabs, getMap, getRegistry, listProblems, listProjects } from '@/lib/content';
import { mathText } from '@/lib/math-text';
import { Mascot } from '@/components/brand/mascot';
import { Ring } from '@/components/page-kit';
import { resolvePhaseColor, phaseIcon } from '@/components/gamified/learning-path';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowRight, BookOpenCheck, BrainCircuit, CheckCircle2, ChevronDown, CloudOff, Code2,
  Compass, Download, FileCode2, FlaskConical, GraduationCap, Landmark, Layers, LineChart,
  Lock, ListChecks, Plane, ShieldCheck, Sigma, Swords, Timer, Trophy, Undo2, Zap, Flame,
  Wifi, WifiOff, Play, SquarePen, Gauge,
} from 'lucide-react';

const FAQ = [
  {
    q: 'Do I need to know programming already?', icon: Compass,
    a: 'No. Phase 3 starts from "what is a variable", and Phase 1 repairs the school math most people half-remember. If you already code, the diagnostic skips you ahead instead of making you redo it.',
  },
  {
    q: 'Does it work offline?', icon: Plane,
    a: 'Yes. Lessons, labs and your progress state download to your device. You can study on a plane and everything syncs when you land.',
  },
  {
    q: 'Is my code really compiled and run?', icon: Play,
    a: 'Yes. C++17 and C++20 go through g++, Python 3 through the interpreter, in a sandboxed runner with CPU, memory and output limits. The judge compares your output against hidden tests.',
  },
  {
    q: 'How is progress scored?', icon: Gauge,
    a: 'Quizzes grade locally and sync with server verification. A lesson needs 80 percent plus a completed exercise. "Mastered" only sticks if the spaced-repetition reviews keep passing.',
  },
  {
    q: 'Can I skip ahead?', icon: Sigma,
    a: 'Take the diagnostic. It places you at the right phase, and the unlock rule (all prerequisites passed) still protects you from holes in the base. If the diagnostic says Phase 5, you start there.',
  },
  {
    q: 'What does it cost?', icon: Landmark,
    a: 'The site owner sets plan pricing, so we refuse to invent a number here. The lessons, labs, problems and the diagnostic you can start today are included while pricing is decided.',
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const map = getMap();
  const reg = getRegistry();
  const problems = listProblems();
  const projects = listProjects();

  const publishedLessons = reg.lessons.length;
  const labCount = countLabs();
  const modules = map.phases.reduce((n, p) => n + p.modules.length, 0);
  const totalHours = Math.round(reg.lessons.reduce((n, l) => n + l.estMinutes, 0) / 60);

  const TRACK_SKILLS: Record<string, string[]> = {
    A: ['Portfolio analytics', 'Factor models', 'Backtesting'],
    B: ['Derivatives pricing', 'Numerical methods', 'C++ libraries'],
    C: ['Lock-free concurrency', 'CPU architecture', 'Order-book systems'],
    D: ['Research infrastructure', 'Statistics', 'Signal pipelines'],
    E: ['Distributed systems', 'Streaming data', 'Reliability'],
  };
  /* one neutral card border for every track, the colour lives in the pill only */
  const TRACK_CHIP: Record<string, string> = {
    A: 'chip-accent',
    B: 'chip-info',
    C: 'border-transparent bg-violet-soft text-violet-ink dark:text-violet',
    D: 'chip-warning',
    E: 'chip-danger',
  };

  const pillars = [
    { icon: BrainCircuit, tone: 'info', title: 'Learn the math first', desc: 'If your algebra is shaky, we fix that first. The sequence runs from fractions to stochastic calculus, and every formula shows up only after you know why it exists.' },
    { icon: Code2, tone: 'violet', title: 'Write C++ and Python, for real', desc: 'Nine C++ levels that end at lock-free concurrency, plus a Python track through NumPy and friends. You submit code, a real compiler runs it, and you see the result.' },
    { icon: LineChart, tone: 'accent', title: 'Implement the finance', desc: 'Not finance trivia. Order books, options pricing, portfolio math, the pieces you can actually put in code, built up from first principles.' },
    { icon: ShieldCheck, tone: 'warning', title: 'Trust your progress', desc: 'Quizzes are scored on the server, exercises must be done, and lessons you pass come back later to be re-earned through spaced review. No participation trophies.' },
  ];

  const lessonSteps = [
    { n: 1, icon: BookOpenCheck, title: 'Read a small card', desc: 'One idea at a time, about six minutes each. Short enough to finish, long enough to actually teach.' },
    { n: 2, icon: FlaskConical, title: 'Try it yourself', desc: 'Every lesson ends in a lab, a drill or a judged coding problem, not a multiple-choice victory lap.' },
    { n: 3, icon: Gauge, title: 'Get scored instantly', desc: 'Answers grade on the spot, code runs against hidden tests, and missed questions come back as review cards.' },
  ];

  const features = [
    { icon: Code2, tone: 'accent', title: 'Your code actually runs', desc: 'C++17/C++20 compiled with g++ and Python 3, executed in a sandboxed runner with CPU, memory and output limits.', chip: 'Real compiler', chipIcon: Play },
    { icon: Timer, tone: 'warning', title: 'Mental math drills', desc: 'Timed arithmetic practice with speed and accuracy tracking, so the easy stuff stops slowing you down later.', chip: '8 modes', chipIcon: Zap },
    { icon: Undo2, tone: 'info', title: 'Flashcards that come back', desc: 'Every lesson generates cards, scheduled by SM-2, the same algorithm Anki uses. Miss a quiz question and it joins the queue too.', chip: 'SM-2', chipIcon: Undo2 },
    { icon: FlaskConical, tone: 'violet', title: 'Interactive labs', desc: `${labCount} labs you drive with sliders and checkboxes: geometric Brownian motion, queues, cache behaviour, Black-Scholes.`, chip: 'In the browser', chipIcon: FlaskConical },
    { icon: WifiOff, tone: 'danger', title: 'Works fully offline', desc: 'Download the packs once. Lessons, labs and quizzes all keep working with the network off, and sync when you reconnect.', chip: 'PWA', chipIcon: Plane },
    { icon: LineChart, tone: 'gold', title: 'Honest analytics', desc: 'Every metric on your dashboard is computed from what you actually did. Unfinished topics say so. We would rather be boring than fake.', chip: 'No inflated numbers', chipIcon: ShieldCheck },
  ];

  const phases = map.phases;
  const tracks = Object.entries(map.tracks);

  return (
    <div className="min-h-screen flex flex-col overflow-x-clip">
      <PublicHeader user={user ? { name: user.name } : null} />

      <main className="flex-1">
        {/* 1. Hero */}
        <section className="border-b-2 border-border bg-surface relative overflow-hidden">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent-soft blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-info-soft blur-2xl" aria-hidden />

          <div className="relative max-w-6xl mx-auto px-4 lg:px-6 py-14 lg:py-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-12 items-center">
            <div className="min-w-0">
              <span className="chip chip-accent !text-[13px] !px-3 !py-1.5 anim-pop-in">Zero → quantitative developer</span>
              <h1 className="mt-5 text-4xl lg:text-6xl font-black tracking-tight leading-[1.05] max-w-3xl anim-slide-up">
                Everything between your first line of code and{' '}
                <span className="text-accent">building trading systems.</span>
              </h1>
              <p className="mt-5 text-lg text-muted max-w-2xl leading-relaxed font-semibold anim-slide-up" style={{ animationDelay: '0.1s' }}>
                {publishedLessons} lessons in {modules} modules, {problems.length} judged coding problems and {projects.length} portfolio
                projects, one path from &ldquo;what is a variable&rdquo; to pricing libraries, order books and low-latency C++.
              </p>
              <div className="mt-7 flex flex-wrap gap-4 anim-slide-up" style={{ animationDelay: '0.2s' }}>
                <Link href={user ? '/dashboard' : '/register'} className="btn3d btn3d-lg">
                  {user ? 'Continue learning' : 'Start free, take the diagnostic'} <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/curriculum" className="btn3d btn3d-ghost btn3d-lg">See the curriculum</Link>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-2.5 anim-slide-up" style={{ animationDelay: '0.3s' }}>
                <span className="chip"><Plane className="h-3.5 w-3.5" aria-hidden /> Works offline</span>
                <span className="chip"><Play className="h-3.5 w-3.5" aria-hidden /> Real C++ compiler</span>
                <span className="chip"><ListChecks className="h-3.5 w-3.5" aria-hidden /> {publishedLessons} lessons</span>
              </div>
            </div>

            {/* live product preview: stacked real components, not a stock image */}
            <div className="relative min-w-0 anim-pop-in" style={{ animationDelay: '0.25s' }} aria-hidden>
              <div className="qf-card p-6 rotate-1 hover:rotate-0 transition-transform duration-300">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-[15px] font-black truncate min-w-0">Lesson 12 · Pre-algebra</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="hud-pill"><Flame className="h-3.5 w-3.5 text-flame anim-flame" /><span className="text-[13px] tnum">7</span></span>
                    <span className="hud-pill"><Zap className="h-3.5 w-3.5 text-warning" /><span className="text-[13px] tnum">1,480</span></span>
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Ring value={62} size={44} thickness={5} tone="var(--accent)">
                    <span className="text-[12px] font-black tnum">62%</span>
                  </Ring>
                  <div className="min-w-0">
                    <p className="text-[15px] font-extrabold leading-snug">Solve for x in one step</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="chip">6 min</span>
                      <span className="chip chip-warning">+20 XP</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <span className="qf-answer-tile qf-selected">
                    <span className="qf-answer-badge">A</span>
                    <span className="min-w-0 flex-1 text-[15px]">x = 7, add 5 to both sides</span>
                    <CheckCircle2 className="h-4 w-4 flex-none text-accent-deep dark:text-accent" />
                  </span>
                  <span className="qf-answer-tile opacity-90">
                    <span className="qf-answer-badge">B</span>
                    <span className="min-w-0 flex-1 text-[15px]">x = 2, subtract from both sides</span>
                    <ChevronDown className="h-4 w-4 flex-none opacity-40" />
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="chip chip-info anim-pop-in" style={{ animationDelay: '0.9s' }}><Zap className="h-3.5 w-3.5" aria-hidden /> +20 XP</span>
                  <span className="chip chip-gold"><Trophy className="h-3.5 w-3.5" aria-hidden /> 3 day streak</span>
                  <span className="ml-auto tnum text-[13px] font-black text-faint">7 / 10 today</span>
                </div>
                {/* the practice layer lives inside the same mock, not a detached chip */}
                <div className="mt-4 qf-card-flat p-3 bg-surface-2 flex items-center gap-3">
                  <span className="icon-tile-sm icon-tile-accent"><Code2 aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-extrabold truncate">practice: two-sum (easy)</p>
                    <div className="mt-1 prog-track h-1.5 w-32"><span className="prog-fill" style={{ width: '70%' }} /></div>
                  </div>
                  <span className="chip chip-success"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> 7/10 tests</span>
                </div>
              </div>
              {/* mascot tucked into the corner margin, fully inside the hero bounds */}
              <Mascot pose="cheer" size={84} className="absolute -bottom-7 -left-7 z-[-1] drop-shadow-md anim-bob" aria-hidden />
            </div>
          </div>

          {/* 2. Proof strip: canonical stat tiles, two hues max, distinct subs */}
          <div className="relative max-w-6xl mx-auto px-4 lg:px-6 pb-14">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { k: `${publishedLessons}`, v: 'bite-sized lessons', sub: `across ${modules} modules`, tone: 'accent', icon: BookOpenCheck },
                { k: String(labCount), v: 'interactive labs', sub: 'computed live in-browser', tone: 'info', icon: FlaskConical },
                { k: `${problems.length}`, v: 'judged problems', sub: 'C++17 · C++20 · Python 3', tone: 'neutral', icon: Code2 },
                { k: `${totalHours}h+`, v: 'of core content', sub: 'lesson time only', tone: 'neutral', icon: Timer },
              ].map((s, i) => (
                <div key={s.v} className="stat-tile anim-pop-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className={`icon-tile-sm icon-tile-${s.tone}`}><s.icon aria-hidden /></span>
                  <div className="stat-body min-w-0">
                    <dt className="stat-value tnum">{s.k}</dt>
                    <dd className="stat-label">{s.v}</dd>
                    <dd className="stat-sub">{s.sub}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* 3. How a lesson feels */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight">How a lesson feels</h2>
          <p className="mt-2 text-muted max-w-2xl font-semibold">No hour-long videos. A lesson is a small card, a thing to try, and a score. That loop repeats {publishedLessons} times.</p>
          <div className="mt-8 grid sm:grid-cols-3 gap-4 items-stretch">
            {lessonSteps.map((s, i) => (
              <div key={s.n} className="qf-card p-5 anim-slide-up relative overflow-hidden" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="icon-tile icon-tile-sm icon-tile-neutral !text-[13px] font-black tnum absolute right-4 top-3" aria-hidden>{s.n}</span>
                <span className={`icon-tile icon-tile-${['accent', 'info', 'violet'][i]}`}><s.icon aria-hidden /></span>
                <h3 className="mt-3 font-black">{s.title}</h3>
                <p className="mt-1.5 text-[15px] text-muted leading-relaxed font-semibold">{s.desc}</p>
                {i === 1 && (
                  <div className="mt-3 flex items-center gap-2 text-[13px] font-bold text-muted" aria-hidden>
                    <span className="kbd">drag</span><span className="prog-track flex-1 h-2"><span className="prog-fill" style={{ width: '55%' }} /></span><span className="tnum">σ=1.2</span>
                  </div>
                )}
                {i === 2 && (
                  <div className="mt-3 flex items-center gap-1.5" aria-hidden>
                    <span className="chip chip-success">+20 XP</span><span className="chip">2 cards</span><span className="chip chip-info">next in 1d</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 4. Four pillars */}
        <section className="border-y-2 border-border bg-surface-2/60">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight">What you will actually study</h2>
            <p className="mt-2 text-muted max-w-2xl font-semibold">The four strands run side by side. The derivative you play with in the math lab is the same delta you hedge in the finance module, and the same number you compute in C++.</p>
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
              {pillars.map((p, i) => (
                <div key={p.title} className={`qf-card-flat p-5 anim-slide-up`} style={{ animationDelay: `${i * 80}ms` }}>
                  <span className={`icon-tile icon-tile-${p.tone}`}><p.icon aria-hidden strokeWidth={2.5} /></span>
                  <h3 className="mt-3 font-black">{p.title}</h3>
                  <p className="mt-1.5 text-[15px] text-muted leading-relaxed font-semibold">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. The path: the 11 phases as a visual strip */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight">The path, phase by phase</h2>
          <p className="mt-2 text-muted max-w-2xl font-semibold">Eleven phases in one fixed order. Each one unlocks the next only when its lessons pass, so the base never gets holes.</p>
          <div className="mt-8 relative">
            <div className="qf-strip thin-scroll">
            {phases.map((ph, i) => {
              const color = resolvePhaseColor(ph.color);
              const Icon = phaseIcon(ph.color);
              return (
                <Link
                  key={ph.id}
                  href="/curriculum"
                  className="qf-card-flat p-4 w-44 min-w-0 flex flex-col gap-2.5 press bg-dots"
                  style={{ borderColor: i === 0 ? 'var(--accent)' : undefined }}
                >
                  <span className="flex items-center justify-between">
                    <span className="path-node h-14 w-14 rounded-full flex items-center justify-center border-[3px] border-surface shadow-[0_4px_0_0_var(--shadow-hard)]" style={{ background: color }}>
                      <Icon className="h-6 w-6 text-white" aria-hidden />
                    </span>
                    <span className="chip !text-[12px] tnum">{ph.modules.reduce((n, m) => n + m.lessons.length, 0)}</span>
                  </span>
                  <span className="text-[13px] font-black leading-tight line-clamp-2">{ph.title.split(/[,.]/)[0]}</span>
                  <span className="text-[12px] font-bold text-faint">{ph.modules.length} modules</span>
                </Link>
              );
            })}
            </div>
            {/* scroll affordance so the strip reads as a carousel, not a clipped row */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-background" aria-hidden />
            <span className="absolute right-1 top-1 chip"><ArrowRight className="h-3.5 w-3.5" aria-hidden /> scroll for all 11</span>
          </div>
        </section>

        {/* 6. Feature grid */}
        <section className="border-y-2 border-border bg-surface-2/60">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight">Built like the systems it teaches</h2>
            <p className="mt-2 text-muted max-w-2xl font-semibold">Most course platforms are a video player bolted to a payment form. This one is an engineering project, because that is the honest way to teach engineering.</p>
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
              {features.map((f, i) => (
                <div key={f.title} className="qf-card-flat p-5 anim-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`icon-tile icon-tile-${f.tone}`}><f.icon aria-hidden strokeWidth={2.5} /></span>
                    <span className="chip"><f.chipIcon className="h-3.5 w-3.5" aria-hidden /> {f.chip}</span>
                  </div>
                  <h3 className="mt-3 font-black">{f.title}</h3>
                  <p className="mt-1.5 text-[15px] text-muted leading-relaxed font-semibold">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Tracks */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight">One foundation, five directions after</h2>
          <p className="mt-2 text-muted max-w-2xl font-semibold">Asset management, banking, HFT, research and infrastructure all draw on the same base, but they weight it differently. Pick a track and the planner tilts your schedule accordingly.</p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {tracks.map(([key, t], i) => (
              <Link
                key={key} href={`/career#${key}`}
                className="qf-card p-5 hover:-translate-y-1 hover:shadow-lg transition-all press relative overflow-hidden group anim-slide-up flex flex-col"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className={`chip ${TRACK_CHIP[key]}`}>Track {key}</span>
                  <ArrowRight className="h-4 w-4 text-faint group-hover:text-foreground transition-colors" />
                </div>
                <h3 className="mt-3 font-black leading-snug">{t.title}</h3>
                <p className="mt-1.5 text-[15px] text-muted leading-relaxed font-semibold">{t.focus}</p>
                <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                  {(TRACK_SKILLS[key] ?? []).map(s => <span key={s} className="chip !text-[12px]">{s}</span>)}
                </div>
              </Link>
            ))}
            {/* same internal structure as a track card so the fallback never reads as empty */}
            <Link href="/diagnostic" className="qf-card-flat p-5 hover:-translate-y-1 hover:shadow-lg transition-all press relative overflow-hidden group border-2 border-dashed anim-slide-up flex flex-col" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-between">
                <span className="chip chip-strong"><Compass className="h-3.5 w-3.5" aria-hidden /> Not sure yet?</span>
                <ArrowRight className="h-4 w-4 text-faint group-hover:text-foreground transition-colors" />
              </div>
              <h3 className="mt-3 font-black leading-snug">Take the diagnostic first</h3>
              <p className="mt-1.5 text-[15px] text-muted leading-relaxed font-semibold">
                It places you at the right phase and the track picks itself.
              </p>
              <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                <span className="chip !text-[12px]">28 questions</span>
                <span className="chip !text-[12px]">~45 min</span>
                <span className="chip !text-[12px]">no stakes</span>
              </div>
            </Link>
          </div>
        </section>

        {/* 8. Offline / PWA band */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <div className="qf-card p-6 lg:p-8 grid lg:grid-cols-[1fr_0.9fr] gap-8 items-center bg-dots">
            <div className="min-w-0">
              <span className="icon-tile icon-tile-info"><Plane aria-hidden /></span>
              <h2 className="mt-4 text-2xl font-black tracking-tight">Download once, study on a plane.</h2>
              <p className="mt-2 text-muted font-semibold max-w-md">
                Lessons, labs and quizzes ship as content packs to your device. Your progress state lives locally and syncs when you are back online, with idempotent events so nothing double-counts.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="chip chip-info"><WifiOff className="h-3.5 w-3.5" aria-hidden /> Offline quizzes</span>
                <span className="chip"><Download className="h-3.5 w-3.5" aria-hidden /> One tap download</span>
                <span className="chip"><Sigma className="h-3.5 w-3.5" aria-hidden /> PWA installable</span>
              </div>
            </div>
            <div className="qf-card-flat p-4 bg-surface" aria-hidden>
              <div className="flex items-center gap-3">
                <span className="icon-tile-sm icon-tile-accent"><Download /></span>
                <p className="text-[15px] font-black flex-1">Downloading content packs</p>
                <span className="chip chip-warning">Illustration</span>
              </div>
              <div className="mt-3 prog-track h-3"><span className="prog-fill" style={{ width: '100%' }} /></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] font-bold text-muted">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent-deep dark:text-accent" /> {publishedLessons} lessons</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent-deep dark:text-accent" /> {labCount} labs</span>
                <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> packs v3</span>
                <span className="flex items-center gap-1.5">Sizes shown in Settings</span>
              </div>
            </div>
          </div>
        </section>

        {/* 9. The honest section */}
        <section className="border-y-2 border-border bg-surface-2/60">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
            <div className="mx-auto max-w-3xl text-center relative overflow-hidden">
              <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-accent-soft blur-2xl" aria-hidden />
              <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-info-soft blur-2xl" aria-hidden />
              <p className="relative text-xl lg:text-2xl leading-relaxed font-bold tracking-tight">
                {mathText('We won\u2019t promise you a job in 90 days. It is 150+ hours of core lesson time, and the role demands that depth. What we promise instead: the work you do here is real, measured, and stays yours.')}
              </p>
              <div className="relative mt-7 flex flex-wrap justify-center gap-2">
                <span className="chip"><Timer className="h-3.5 w-3.5" aria-hidden /> {totalHours}h of lessons</span>
                <span className="chip"><Swords className="h-3.5 w-3.5" aria-hidden /> 80% + exercise to pass</span>
                <span className="chip"><Undo2 className="h-3.5 w-3.5" aria-hidden /> Mastery decays without review</span>
                <span className="chip"><Lock className="h-3.5 w-3.5" aria-hidden /> Prerequisites gate unlocks</span>
              </div>
            </div>
          </div>
        </section>

        {/* 10. FAQ */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight">Straight answers</h2>
          <Accordion type="single" collapsible className="mt-6 space-y-3">
            {FAQ.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`} className="qf-card-flat px-4 !border-b-0">
                <AccordionTrigger className="text-left font-black text-base py-4 [&>svg]:hidden">
                  <span className="flex items-center gap-2.5">
                    <span className={`icon-tile-sm icon-tile-${['accent', 'info', 'violet', 'warning', 'danger', 'gold'][i]}`}><f.icon aria-hidden /></span>
                    {f.q}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-auto flex-none text-muted" aria-hidden />
                </AccordionTrigger>
                <AccordionContent className="text-[15px] text-muted font-semibold px-1 pb-4 pt-1">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* 11. Final CTA band */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <div className="qf-card bg-dots qf-closing p-8 lg:p-10">
            <div className="flex flex-col items-center gap-3">
              <Mascot pose="wave" size={104} />
              <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-center">Start with the 10-minute diagnostic</h2>
              <p className="max-w-lg text-[15px] font-semibold text-muted text-center">
                It maps what you already know across 7 areas and drops you at the right phase. No account needed to look at the curriculum.
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                <Link href={user ? '/dashboard' : '/register'} className="btn3d btn3d-lg">
                  {user ? 'Back to studying' : 'Start free'} <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/curriculum" className="btn3d btn3d-ghost btn3d-lg">Explore first</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 12. Rich footer */}
      <footer className="border-t-2 border-border bg-surface mt-auto">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2.5 font-black tracking-tight">
              <span className="h-8 w-8 rounded-2xl bg-accent shadow-[0_3px_0_0_var(--accent-deep)] flex items-center justify-center">
                <Sigma className="h-4 w-4 text-on-accent" aria-hidden />
              </span>
              QuantFoundry
            </div>
            <p className="text-[15px] font-semibold text-muted max-w-xs">An honest preparation pathway for quantitative engineering. Learn by doing, track real mastery.</p>
            <span className="chip chip-info"><Wifi className="h-3.5 w-3.5" aria-hidden /> Works offline</span>
          </div>
          <nav aria-label="Learn links" className="space-y-2.5">
            <p className="text-[13px] font-black uppercase tracking-wider text-faint">Learn</p>
            <Link href="/curriculum" className="block text-[15px] font-bold text-muted hover:text-foreground">Curriculum</Link>
            <Link href="/learn" className="block text-[15px] font-bold text-muted hover:text-foreground">All lessons</Link>
            <Link href="/revision" className="block text-[15px] font-bold text-muted hover:text-foreground">Spaced repetition</Link>
            <Link href="/drills" className="block text-[15px] font-bold text-muted hover:text-foreground">Mental math drills</Link>
          </nav>
          <nav aria-label="Practice links" className="space-y-2.5">
            <p className="text-[13px] font-black uppercase tracking-wider text-faint">Practice</p>
            <Link href="/practice" className="block text-[15px] font-bold text-muted hover:text-foreground">Code problems</Link>
            <Link href="/assessments" className="block text-[15px] font-bold text-muted hover:text-foreground">Assessments</Link>
            <Link href="/projects" className="block text-[15px] font-bold text-muted hover:text-foreground">Projects</Link>
            <Link href="/lab" className="block text-[15px] font-bold text-muted hover:text-foreground">Interactive labs</Link>
          </nav>
          <nav aria-label="Product links" className="space-y-2.5">
            <p className="text-[13px] font-black uppercase tracking-wider text-faint">Product</p>
            <Link href="/methodology" className="block text-[15px] font-bold text-muted hover:text-foreground">Methodology</Link>
            <Link href="/career" className="block text-[15px] font-bold text-muted hover:text-foreground">Career tracks</Link>
            <Link href="/about" className="block text-[15px] font-bold text-muted hover:text-foreground">About</Link>
            <Link href="/login" className="block text-[15px] font-bold text-muted hover:text-foreground">Sign in</Link>
          </nav>
        </div>
        <div className="border-t-2 border-border">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold text-muted">
            <span>QuantFoundry · {APP_VERSION} · conventions follow cppreference, OpenStax, Python and NumPy docs</span>
            <span>No fake numbers, no fake testimonials.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
