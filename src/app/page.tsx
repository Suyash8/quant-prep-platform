import Link from 'next/link';
import { PublicHeader } from '@/components/app-shell';
import { getCurrentUser } from '@/lib/auth';
import { getMap, getRegistry, listProblems, listProjects } from '@/lib/content';
import { mathText } from '@/lib/math-text';
import {
  ArrowRight, BookOpenCheck, BrainCircuit, Code2, LineChart, ShieldCheck, Timer, Undo2, Zap, Flame, Trophy,
} from 'lucide-react';

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
    { icon: BrainCircuit, title: 'Math, from arithmetic up', desc: 'If your algebra is shaky, we fix that first. The sequence runs from fractions to stochastic calculus, and every formula shows up only after you know why it exists.', cls: 'bg-info-soft', icls: 'text-info' },
    { icon: Code2, title: 'C++ and Python, for real', desc: 'Nine C++ levels that end at lock-free concurrency, plus a Python track through NumPy and friends. You submit code, a real compiler runs it, and you see the result.', cls: 'bg-violet-soft', icls: 'text-violet' },
    { icon: LineChart, title: 'Finance you can implement', desc: 'Not finance trivia. Order books, options pricing, portfolio math, the pieces you can actually put in code, built up from first principles.', cls: 'bg-accent-soft', icls: 'text-accent-deep dark:text-accent' },
    { icon: BookOpenCheck, title: 'Progress you can trust', desc: 'Quizzes are scored on the server, exercises must be done, and lessons you “pass” come back later to be re-earned through spaced review. No participation trophies.', cls: 'bg-warning-soft', icls: 'text-warning-strong dark:text-warning' },
  ];

  const features = [
    { icon: Code2, title: 'Your code actually runs', desc: 'C++17/C++20 compiled with g++ and Python 3, executed in a separate sandboxed runner with CPU, memory and output limits. Not a toy textarea.' },
    { icon: Timer, title: 'Mental math drills', desc: 'Timed arithmetic practice with speed and accuracy tracking, so the easy stuff stops slowing you down later.' },
    { icon: Undo2, title: 'Flashcards that come back', desc: 'Every lesson generates cards, scheduled by SM-2, the same algorithm Anki uses. Miss a quiz question and it joins the queue too.' },
    { icon: ShieldCheck, title: 'No inflated numbers', desc: 'Every metric on your dashboard is computed from what you actually did. Unfinished topics say so. We would rather be boring than fake.' },
  ];

  const tracks = Object.entries(map.tracks);
  const trackColors = ['#34c759', '#1cb0f6', '#a566ff', '#ff9600', '#ff5a5f'];

  const stats = [
    { k: `${publishedLessons}`, v: 'bite-sized lessons', cls: 'text-accent-deep dark:text-accent' },
    { k: '33', v: 'interactive labs', cls: 'text-info' },
    { k: `${problems.length}`, v: 'judged problems', cls: 'text-violet' },
    { k: `${totalHours}h+`, v: 'of core content', cls: 'text-warning-strong dark:text-warning' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
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
            <span className="absolute left-[42%] top-[8%] text-3xl font-black text-warning/25 anim-float" style={{ animationDelay: '1.6s' }}>∫</span>
            <span className="absolute right-[38%] bottom-[10%] text-3xl font-black text-danger/15 anim-float-slow" style={{ animationDelay: '0.2s' }}>λ</span>
          </div>
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent-soft blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-info-soft blur-2xl" aria-hidden />

          <div className="relative max-w-6xl mx-auto px-4 lg:px-6 py-16 lg:py-24 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
            <div>
              <span className="chip chip-accent !text-xs !px-3 !py-1.5 anim-pop-in">Zero → quantitative developer</span>
              <h1 className="mt-5 text-4xl lg:text-6xl font-black tracking-tight leading-[1.05] max-w-3xl anim-slide-up">
                Everything between your first line of code and{' '}
                <span className="text-accent">building trading systems.</span>
              </h1>
              <p className="mt-5 text-lg text-muted max-w-2xl leading-relaxed font-semibold anim-slide-up" style={{ animationDelay: '0.1s' }}>
                {publishedLessons} lessons in {modules} modules, {problems.length} judged coding problems and {projects.length} portfolio
                projects, one path from “what is a variable” to pricing libraries, order books and low-latency C++.
                The lessons build on each other, in order, on purpose.
              </p>
              <p className="mt-3 text-sm text-faint max-w-2xl font-semibold anim-slide-up" style={{ animationDelay: '0.15s' }}>
                We won’t promise you a job in 90 days. It’s {totalHours}+ hours of core lesson time, and the role demands that depth.
              </p>
              <div className="mt-8 flex flex-wrap gap-4 anim-slide-up" style={{ animationDelay: '0.2s' }}>
                <Link href={user ? '/dashboard' : '/register'} className="btn3d !text-base !px-8 !py-4">
                  {user ? 'Continue learning' : 'Start free, take the diagnostic'} <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/curriculum" className="btn3d btn3d-ghost !text-base !px-8 !py-4">
                  Explore the path
                </Link>
              </div>

              {/* gamification teaser */}
              <div className="mt-8 flex flex-wrap items-center gap-3 anim-slide-up" style={{ animationDelay: '0.3s' }}>
                <span className="hud-pill"><Flame className="h-4 w-4 text-flame" /> streaks</span>
                <span className="hud-pill"><Zap className="h-4 w-4 text-warning" /> XP & levels</span>
                <span className="hud-pill"><Trophy className="h-4 w-4 text-violet" /> mastery tracking</span>
                <span className="hud-pill"><Undo2 className="h-4 w-4 text-info" /> spaced repetition</span>
              </div>
            </div>

            {/* product mock, a slice of the real path UI */}
            <div className="relative anim-pop-in" style={{ animationDelay: '0.25s' }} aria-hidden>
              <div className="qf-card p-6 rotate-1 hover:rotate-0 transition-transform duration-300 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">Your path</span>
                  <span className="flex items-center gap-2">
                    <span className="hud-pill"><Flame className="h-3.5 w-3.5 text-flame" /><span className="text-xs tnum">7</span></span>
                    <span className="hud-pill"><Zap className="h-3.5 w-3.5 text-warning" /><span className="text-xs tnum">1,480</span></span>
                  </span>
                </div>
                <div className="mt-4 flex flex-col items-center gap-0">
                  <div className="flex flex-col items-center">
                    <span className="h-14 w-14 rounded-full flex items-center justify-center border-[3.5px] border-white shadow-[0_5px_0_0_#d9ab00]" style={{ background: 'linear-gradient(160deg,#ffd43e,#ffb200)' }}>
                      <Trophy className="h-6 w-6 text-white fill-white" />
                    </span>
                    <span className="mt-1.5 text-[11px] font-extrabold">Orientation</span>
                    <span className="h-5 w-2 rounded bg-accent" />
                  </div>
                  <div className="flex flex-col items-center translate-x-9">
                    <span className="relative h-14 w-14 rounded-full flex items-center justify-center border-[3.5px] border-white shadow-[0_5px_0_0_#1f9d4e]" style={{ background: 'linear-gradient(160deg,#3ddc84,#29c463)' }}>
                      <BookOpenCheck className="h-6 w-6 text-white" strokeWidth={3} />
                    </span>
                    <span className="mt-1.5 text-[11px] font-extrabold">Arithmetic</span>
                    <span className="h-5 w-2 rounded bg-surface-3" />
                  </div>
                  <div className="flex flex-col items-center -translate-x-6">
                    <span className="relative h-16 w-16 rounded-full flex items-center justify-center border-[3.5px] border-white shadow-[0_5px_0_0_rgba(52,199,89,0.5)] anim-pulse-ring" style={{ background: 'linear-gradient(160deg,#34c759,#28a357)' }}>
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-foreground px-3 py-1 text-[10px] font-black tracking-wide text-background anim-bob">START</span>
                      <Zap className="h-7 w-7 text-white fill-white" />
                    </span>
                    <span className="mt-1.5 text-[11px] font-extrabold">Pre-algebra</span>
                    <span className="h-5 w-2 rounded bg-surface-3" />
                  </div>
                  <div className="flex flex-col items-center translate-x-6">
                    <span className="h-14 w-14 rounded-full flex items-center justify-center border-[3.5px] border-white shadow-[0_5px_0_0_var(--border-strong)] bg-surface-3">
                      <span className="text-xl">🔒</span>
                    </span>
                    <span className="mt-1.5 text-[11px] font-extrabold text-faint">Algebra</span>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="flex justify-between text-[11px] font-black text-faint tnum">
                    <span>Daily goal</span><span>30 / 60 XP</span>
                  </div>
                  <div className="mt-1.5 h-3 rounded-full bg-surface-3 border border-border overflow-hidden">
                    <div className="h-full w-1/2 rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-deep))]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* stats strip (full width, below hero grid) */}
          <div className="relative max-w-6xl mx-auto px-4 lg:px-6 pb-14">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl">
              {stats.map(s => (
                <div key={s.v} className="qf-card-flat p-4 anim-pop-in">
                  <dt className={`text-3xl font-black tnum ${s.cls}`}>{s.k}</dt>
                  <dd className="text-xs font-extrabold text-muted mt-1">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Pillars */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight">What you’ll actually study</h2>
          <p className="mt-2 text-muted max-w-2xl font-semibold">The four strands run side by side. The derivative you play with in the math lab is the same delta you hedge in the finance module, and the same number you compute in C++.</p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((p, i) => (
              <div key={p.title} className={`qf-card-flat p-5 ${p.cls} anim-slide-up`} style={{ animationDelay: `${i * 80}ms` }}>
                <span className="h-11 w-11 rounded-2xl bg-surface border-2 border-border flex items-center justify-center">
                  <p.icon className={`h-5 w-5 ${p.icls}`} aria-hidden strokeWidth={2.5} />
                </span>
                <h3 className="mt-3 font-black">{p.title}</h3>
                <p className="mt-1.5 text-sm text-muted leading-relaxed font-semibold">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tracks */}
        <section className="border-y-2 border-border bg-surface-2/60">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight">One foundation, five directions after</h2>
            <p className="mt-2 text-muted max-w-2xl font-semibold">Asset management, banking, HFT, research and infrastructure all draw on the same base, but they weight it differently. Pick a track and the planner tilts your schedule accordingly.</p>
            <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tracks.map(([key, t], i) => (
                <Link
                  key={key} href={`/career#${key}`}
                  className="qf-card-flat p-5 hover:-translate-y-1 hover:shadow-lg transition-all press block relative overflow-hidden group"
                >
                  <span
                    className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-15 group-hover:opacity-30 transition-opacity"
                    style={{ background: trackColors[i % trackColors.length] }}
                    aria-hidden
                  />
                  <div className="flex items-center justify-between relative">
                    <span className="chip" style={{ borderColor: trackColors[i % trackColors.length], color: trackColors[i % trackColors.length] }}>Track {key}</span>
                    <ArrowRight className="h-4 w-4 text-faint group-hover:text-foreground transition-colors" />
                  </div>
                  <h3 className="mt-3 font-black leading-snug relative">{t.title}</h3>
                  <p className="mt-1.5 text-sm text-muted leading-relaxed font-semibold relative">{t.focus}</p>
                </Link>
              ))}
              <Link href="/diagnostic" className="qf-card-flat p-5 hover:-translate-y-1 hover:shadow-lg transition-all press block relative overflow-hidden group !bg-surface-2/50 border-2 border-dashed">
                <div className="flex items-center justify-between">
                  <span className="chip">Not sure yet?</span>
                  <ArrowRight className="h-4 w-4 text-faint group-hover:text-foreground transition-colors" />
                </div>
                <h3 className="mt-3 font-black leading-snug">Take the diagnostic first</h3>
                <p className="mt-1.5 text-sm text-muted leading-relaxed font-semibold">
                  28 questions, ~45 minutes, it places you at the right phase and the track picks itself.
                </p>
              </Link>
            </div>
          </div>
        </section>

        {/* Engineering honesty */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight">The unglamorous parts, done properly</h2>
          <p className="mt-2 text-muted max-w-2xl font-semibold">Most course platforms are a video player bolted to a payment form. This one is an engineering project, because that’s the honest way to teach engineering.</p>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {features.map(f => (
              <div key={f.title} className="qf-card-flat p-5 flex gap-4">
                <span className="h-10 w-10 shrink-0 rounded-2xl bg-accent-soft flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-accent-deep dark:text-accent" aria-hidden strokeWidth={2.5} />
                </span>
                <div>
                  <h3 className="font-black">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted leading-relaxed font-semibold">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Principle quote */}
        <section className="border-t-2 border-border bg-surface">
          <div className="max-w-4xl mx-auto px-4 lg:px-6 py-16 text-center relative overflow-hidden">
            <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-accent-soft blur-2xl" aria-hidden />
            <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-info-soft blur-2xl" aria-hidden />
            <p className="relative text-xl lg:text-2xl leading-relaxed font-bold tracking-tight">
              {mathText('Math connects to algorithms, algorithms to implementations, implementations to the machine they run on. A quant developer who can’t trace that chain end to end is guessing. This platform exists so you never have to guess.')}
            </p>
            <div className="relative mt-8 flex justify-center">
              <Link href={user ? '/dashboard' : '/register'} className="btn3d !text-base !px-8 !py-4">
                {user ? 'Back to studying' : 'Start with the diagnostic'} <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-10 w-10 rounded-2xl bg-accent shadow-[0_3px_0_0_var(--accent-deep)] flex items-center justify-center font-black text-white text-lg">Q</span>
              <div>
                <p className="font-black tracking-tight">QuantFoundry <span className="chip !text-[10px] !px-1.5 !py-0 ml-1 align-middle">v3</span></p>
                <p className="text-xs font-semibold text-faint">Original teaching content; conventions follow cppreference, OpenStax, Python & NumPy docs. Works offline.</p>
              </div>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Footer">
              <Link href="/curriculum" className="btn3d btn3d-ghost btn3d-sm">Curriculum</Link>
              <Link href="/methodology" className="btn3d btn3d-ghost btn3d-sm">Methodology</Link>
              <Link href="/about" className="btn3d btn3d-ghost btn3d-sm">About</Link>
              <Link href="/login" className="btn3d btn3d-sm">Sign in</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
