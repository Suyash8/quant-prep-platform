import Link from 'next/link';
import {
  ArrowUpRight, BookOpen, ChevronRight, Coins, Cpu, Dices, FlaskConical, Landmark, RotateCcw, Sigma, Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { AppShell, PublicHeader } from '@/components/app-shell';
import { InteractiveBlock } from '@/components/interactive/registry';
import { REGISTRY } from '@/components/interactive/registry';
import { ClientMathFigure } from '@/components/gamified/client-md';

export const metadata = { title: 'Interactive labs — QuantFoundry' };

type LabEntry = { name: string; params: Record<string, unknown>; caption: string };
type LabGroup = { title: string; domain: string; Icon: LucideIcon; tile: string; desc: string; components: LabEntry[] };

const GROUPS: LabGroup[] = [
  {
    title: 'Functions & calculus',
    domain: 'Calculus',
    Icon: Sigma,
    tile: 'icon-tile-info',
    desc: 'Manipulate parameters and watch the mathematics respond — every lab is computed live from real formulas.',
    components: [
      { name: 'FunctionPlotter', params: { expression: 'x^2 - 2', xmin: -3, xmax: 3, ymin: -3, ymax: 6 }, caption: 'f(x) = x² − 2. Change the expression to any single-variable formula.' },
      { name: 'DerivativeLab', params: { function: 'x^3 - 3*x', xMin: -2.2, xMax: 2.2, point: 0.8 }, caption: 'Secant slope converging to the derivative as h → 0.' },
      { name: 'IntegralLab', params: { function: 'sin(x)', a: 0, b: 3.14159, n: 8 }, caption: 'Riemann sums approximating the area under sin on [0, π].' },
      { name: 'TaylorLab', params: { function: 'exp(x)', center: 0, order: 3, xMin: -3, xMax: 2 }, caption: 'Taylor polynomials of eˣ — raise the order and watch convergence.' },
    ],
  },
  {
    title: 'Probability & statistics',
    domain: 'Probability',
    Icon: Dices,
    tile: 'icon-tile-violet',
    desc: 'Simulation you can verify: empirical distributions converge to theory as trials grow.',
    components: [
      { name: 'ProbabilitySimulator', params: { experiment: 'dice', sides: 6, trials: 2000 }, caption: 'Roll a die thousands of times; the empirical mean approaches 3.5.' },
      { name: 'DistributionViewer', params: { distribution: 'normal', mu: 0, sigma: 1 }, caption: 'The normal density and its 68-95-99.7 bands.' },
      { name: 'NormalConvergence', params: { sampleSize: 30, trials: 2000 }, caption: 'The central limit theorem emerging from uniform noise.' },
      { name: 'MonteCarloPi', params: { points: 3000 }, caption: 'Estimating π by throwing darts — error scales as 1/√n.' },
      { name: 'ConfidenceIntervalLab', params: { diff: 0.005, se: 0.004, confidence: 0.95 }, caption: 'When does an interval exclude zero?' },
      { name: 'RegressionLab', params: { n: 30, noise: 0.8, fitPolynomial: 9 }, caption: 'Overfitting, live: raise the degree past the signal.' },
    ],
  },
  {
    title: 'Stochastic processes',
    domain: 'Stochastic',
    Icon: Waves,
    tile: 'icon-tile-accent',
    desc: 'Random walks, Brownian motion and Markov chains — the mathematical substrate of pricing.',
    components: [
      { name: 'RandomWalk', params: { n: 250 }, caption: 'Discrete random walks; variance grows linearly in time.' },
      { name: 'BrownianMotion', params: { steps: 250, dt: 0.004 }, caption: 'GBM price paths dS = μS dt + σS dW.' },
      { name: 'MarkovChainSim', params: { states: ['A', 'B'], transitions: { A: { A: 0.7, B: 0.3 }, B: { A: 0.4, B: 0.6 } }, steps: 12 }, caption: 'A two-state chain — watch the long-run frequencies.' },
      { name: 'TimeSeriesDecompose', params: { n: 48, trend: 0.4, seasonalAmp: 2, noise: 0.8, period: 4 }, caption: 'Trend + seasonality + noise decomposition.' },
    ],
  },
  {
    title: 'Finance',
    domain: 'Finance',
    Icon: Coins,
    tile: 'icon-tile-gold',
    desc: 'Pricing and portfolio labs: the Greeks, payoffs, curves and the efficient frontier.',
    components: [
      { name: 'BlackScholesLab', params: { spot: 100, strike: 100, rate: 0.05, vol: 0.25, maturity: 1, type: 'call' }, caption: 'Full Black-Scholes pricing with every parameter live.' },
      { name: 'GreeksLab', params: { spot: 100, strike: 100, rate: 0.05, vol: 0.2, maturity: 1 }, caption: 'Delta, gamma, theta, vega, rho as you move the world.' },
      { name: 'PayoffDiagram', params: { kind: 'straddle', side: 'long', strike: 100, premium: 6, minSpot: 60, maxSpot: 140 }, caption: 'A long straddle payoff — profits from movement either way.' },
      { name: 'BinomialTreeLab', params: { spot: 100, strike: 105, u: 1.0823, d: 0.924, rate: 0.05, periods: 3, option: 'call' }, caption: 'Backward induction on a CRR tree.' },
      { name: 'YieldCurveLab', params: { tenors: [0.25, 0.5, 1, 2, 5, 10, 30], yields: [0.042, 0.0415, 0.041, 0.0395, 0.0385, 0.039, 0.0405] }, caption: 'Curve shapes and parallel shifts.' },
      { name: 'EfficientFrontier', params: { sigmaA: 20, sigmaB: 10, rho: 0.3 }, caption: 'Diversification’s dip: blends beat both endpoints when ρ < 1.' },
      { name: 'VolatilitySmile', params: { spot: 100, strikes: [80, 90, 100, 110, 120], impliedVols: [0.22, 0.2, 0.19, 0.2, 0.22] }, caption: 'The smile the market actually quotes.' },
    ],
  },
  {
    title: 'Markets & systems',
    domain: 'Markets',
    Icon: Landmark,
    tile: 'icon-tile-warning',
    desc: 'Order books, matching engines and computer internals — see the machine the lessons describe.',
    components: [
      { name: 'OrderBookVisual', params: { bids: [[99.98, 1200], [99.97, 800], [99.96, 2500]], asks: [[100.02, 900], [100.03, 1500], [100.05, 700]] }, caption: 'Level-2 depth; trade at a touch and watch the book thin.' },
      { name: 'MatchingSim', params: { orders: [{ side: 'buy', qty: 500, price: 100.0 }, { side: 'sell', qty: 300, price: 100.02 }, { side: 'buy', qty: 200, price: 100.02 }, { side: 'sell', qty: 700, price: 99.98 }] }, caption: 'Price-time priority matching, step by step.' },
      { name: 'MemoryLayout', params: { value: 42.17, type: 'double' }, caption: 'The actual little-endian bytes of 42.17 as IEEE 754.' },
      { name: 'ComplexityCompare', params: { expressions: ['n', 'n*log(n)', 'n^2'], nMax: 500 }, caption: 'Growth rates side by side.' },
      { name: 'HashTableVisual', params: { buckets: 4, keys: ['acct-1000', 'acct-1001', 'acct-1002', 'acct-1003', 'acct-1004', 'acct-1005'] }, caption: 'Chaining and load factor, visualised.' },
      { name: 'BSTVisual', params: { values: [8, 3, 10, 1, 6, 14, 4, 7, 13], target: 6 }, caption: 'BST search paths.' },
      { name: 'SortingVisual', params: { data: [43, 42, 41, 45, 38, 47], algorithm: 'bubble' }, caption: 'One comparison per step — count them.' },
      { name: 'MatrixTransform', params: { matrix: [[4, 1], [2, 3]], gridRange: 5 }, caption: 'Linear maps: determinant as area.' },
    ],
  },
  {
    title: 'Systems & performance',
    domain: 'Systems',
    Icon: Cpu,
    tile: 'icon-tile-info',
    desc: 'The plumbing behind trading platforms: shells, sockets, allocators, floating point — the lessons made tangible.',
    components: [
      { name: 'TerminalSteps', params: { steps: [
          { cmd: 'ps aux --sort=-%cpu | head -3', out: ['USER  PID %CPU %MEM COMMAND', 'qf    4123 38.1  1.9 code-runner', 'qf    1129  2.4  0.8 next-server'] },
          { cmd: 'ss -tulpn | grep 3010', out: ['tcp LISTEN 0 128 127.0.0.1:3010 users:(("code-runner",pid=4123,fd=6))'] },
          { cmd: 'df -h /data | tail -1', out: ['/dev/nvme0n1p2 916G 612G 258G 71% /data'] },
        ] }, caption: 'A safe simulated shell — step through the commands a quant dev runs daily.' },
      { name: 'PipePipeline', params: { commands: ['cat fills.csv', 'grep BUY', "awk -F, '{print $3}'", 'sort -n', 'head -5'] }, caption: 'Every command reads stdin and writes stdout; the pipe is a kernel buffer.' },
      { name: 'PermissionBits', params: { initialOctal: '755' }, caption: 'Toggle rwx bits and watch the octal and symbolic forms.' },
      { name: 'PacketJourney', params: {}, caption: 'TCP retransmits; UDP moves on. Loss, latency and the trade-off.' },
      { name: 'JoinVisual', params: {}, caption: 'INNER / LEFT / RIGHT / FULL OUTER joins on toy ticker tables.' },
      { name: 'LatencyBudget', params: {}, caption: 'Where a round trip spends its microseconds — and what tuning which layer buys.' },
      { name: 'PercentileExplorer', params: {}, caption: 'Why p99 is quoted instead of the mean: the tail is a different world.' },
      { name: 'OrderStateMachine', params: { quantity: 1000 }, caption: 'An order’s life: NEW → SENT → ACKED → FILLED, and every exit.' },
      { name: 'MemoryPool', params: {}, caption: 'malloc vs a fixed-slot pool: cost in nanoseconds, visually.' },
      { name: 'CovarianceLab', params: {}, caption: 'Correlation, covariance and the eigenvector axes of a scatter.' },
      { name: 'FloatErrorLab', params: {}, caption: 'float32 vs float64: cancellation, naive sums and the one-pass variance trap.' },
    ],
  },
];

const FORMULAS: Record<string, { tex: string; label: string }> = {
  FunctionPlotter: { tex: String.raw`f(x) = x^2 - 2`, label: 'Plot of f over the viewport' },
  DerivativeLab: { tex: String.raw`\lim_{h \to 0}\frac{f(x+h)-f(x)}{h}`, label: 'Definition of the derivative' },
  IntegralLab: { tex: String.raw`\int_a^b f(x)\,dx \approx \sum_{i} f(x_i^{*})\,\Delta x`, label: 'Riemann sum' },
  TaylorLab: { tex: String.raw`\sum_{k=0}^{n}\frac{f^{(k)}(a)}{k!}(x-a)^k`, label: 'Taylor polynomial around a' },
  ProbabilitySimulator: { tex: String.raw`\bar{X}_n = \frac{1}{n}\sum_{i=1}^{n} X_i \;\xrightarrow{\;n\to\infty\;}\; \mu`, label: 'Law of large numbers' },
  DistributionViewer: { tex: String.raw`f(x)=\frac{1}{\sigma\sqrt{2\pi}}\,e^{-\frac{(x-\mu)^2}{2\sigma^2}}`, label: 'Normal density' },
  NormalConvergence: { tex: String.raw`\sqrt{n}\,(\bar{X}_n-\mu)\;\xrightarrow{d}\;\mathcal{N}(0,\sigma^2)`, label: 'Central limit theorem' },
  MonteCarloPi: { tex: String.raw`\pi \approx 4\cdot\frac{N_{\text{inside}}}{N}`, label: 'Hit-and-miss estimator' },
  ConfidenceIntervalLab: { tex: String.raw`\bar{x} \pm z_{\alpha/2}\cdot\frac{s}{\sqrt{n}}`, label: 'Confidence interval' },
  RegressionLab: { tex: String.raw`\hat{y} = \sum_{k=0}^{d}\beta_k x^k`, label: 'Polynomial fit of degree d' },
  RandomWalk: { tex: String.raw`S_t=\sum_{i=1}^{t}\xi_i,\qquad \operatorname{Var}(S_t)=t`, label: 'Variance grows linearly' },
  BrownianMotion: { tex: String.raw`dS_t=\mu S_t\,dt+\sigma S_t\,dW_t`, label: 'Geometric Brownian motion' },
  MarkovChainSim: { tex: String.raw`\boldsymbol{\pi}_{t+1}=\boldsymbol{\pi}_t P`, label: 'Chain evolution' },
  TimeSeriesDecompose: { tex: String.raw`y_t = T_t + S_t + \varepsilon_t`, label: 'Additive decomposition' },
  BlackScholesLab: { tex: String.raw`C=S\,\Phi(d_1)-K e^{-rT}\Phi(d_2)`, label: 'Black–Scholes call price' },
  GreeksLab: { tex: String.raw`\Delta=\Phi(d_1),\qquad \Gamma=\frac{\varphi(d_1)}{S\sigma\sqrt{T}}`, label: 'Delta and gamma' },
  PayoffDiagram: { tex: String.raw`\Pi(S_T)=f(S_T)-\text{premium}`, label: 'Payoff at expiry' },
  BinomialTreeLab: { tex: String.raw`u=e^{\sigma\sqrt{\Delta t}},\qquad d=1/u`, label: 'CRR up / down factors' },
  YieldCurveLab: { tex: String.raw`y(\tau)=\beta_0+\beta_1\frac{1-e^{-\tau}}{\tau}+\beta_2\!\left(\frac{1-e^{-\tau}}{\tau}-e^{-\tau}\right)`, label: 'Nelson–Siegel curve shape' },
  EfficientFrontier: { tex: String.raw`\sigma_p^2=\mathbf{w}^{\mathsf{T}}\boldsymbol{\Sigma}\,\mathbf{w}`, label: 'Portfolio variance' },
  VolatilitySmile: { tex: String.raw`C_{\text{mkt}}(K)=C_{\text{BS}}\big(S,K,\sigma_{\text{impl}}(K)\big)`, label: 'Implied volatility per strike' },
  OrderBookVisual: { tex: String.raw`\text{spread}=a_{\text{best}}-b_{\text{best}}`, label: 'Best bid–ask spread' },
  MatchingSim: { tex: String.raw`\text{priority}=(\text{price},\ \text{time})`, label: 'Price–time priority' },
  MemoryLayout: { tex: String.raw`\text{double}=\pm\,1.M\times 2^{\,e-1023}`, label: 'IEEE 754 double' },
  ComplexityCompare: { tex: String.raw`O(n) \prec O(n\log n) \prec O(n^2)`, label: 'Growth rates compared' },
  HashTableVisual: { tex: String.raw`\alpha=\frac{n}{m}`, label: 'Load factor' },
  BSTVisual: { tex: String.raw`\mathbb{E}[\text{depth}]=O(\log n)`, label: 'Search cost' },
  SortingVisual: { tex: String.raw`\text{swaps}_{\text{bubble}}\sim\frac{n^2}{4}`, label: 'Average swap count' },
  MatrixTransform: { tex: String.raw`\mathbf{y}=A\mathbf{x},\qquad \det A=\text{area scale}`, label: 'Linear map' },
  TerminalSteps: { tex: String.raw`\text{cmd}_1 \mid \text{cmd}_2 \mid \cdots`, label: 'Pipelines' },
  PipePipeline: { tex: String.raw`\text{stdout}\rightarrow\text{stdin}`, label: 'Kernel buffer between stages' },
  PermissionBits: { tex: String.raw`\text{rwx}=4+2+1`, label: 'Octal bit mask' },
  PacketJourney: { tex: String.raw`\text{RTT}\approx 2\,d/v+\text{queueing}`, label: 'Round-trip time' },
  JoinVisual: { tex: String.raw`R \bowtie S`, label: 'Relational join' },
  LatencyBudget: { tex: String.raw`t_{p99}\gg t_{\text{mean}}`, label: 'Tail latency' },
  PercentileExplorer: { tex: String.raw`P(X\le x_p)=p`, label: 'Percentile definition' },
  OrderStateMachine: { tex: String.raw`\text{NEW}\to\text{SENT}\to\text{ACKED}\to\text{FILLED}`, label: 'Order lifecycle' },
  MemoryPool: { tex: String.raw`\text{alloc}=O(1)`, label: 'Fixed-slot pool' },
  CovarianceLab: { tex: String.raw`\operatorname{Cov}(X,Y)=\mathbb{E}[XY]-\mathbb{E}[X]\mathbb{E}[Y]`, label: 'Covariance' },
  FloatErrorLab: { tex: String.raw`0.1+0.2\neq 0.3`, label: 'Binary floating point' },
};

const USED_COUNT = GROUPS.reduce((n, g) => n + g.components.length, 0);

// static Tailwind spans for the grid remainder filler (dynamic strings don't compile)
const FILLER_SPAN: Record<number, string> = {
  1: 'sm:col-span-1 lg:col-span-1',
  2: 'sm:col-span-2 lg:col-span-2',
  3: 'sm:col-span-1 lg:col-span-3',
};

const pretty = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
const slideDelay = (i: number) => ({ animationDelay: i * 60 + 'ms' });

export default async function LabPage({ searchParams }: { searchParams: Promise<{ lab?: string }> }) {
  const user = await getCurrentUser();
  const sp = await searchParams;

  const groupOf = (name: string) => GROUPS.find(g => g.components.some(c => c.name === name));
  const activeGroup = sp.lab ? groupOf(sp.lab) : undefined;
  const active = activeGroup?.components.find(c => c.name === sp.lab) ?? null;
  const activeFormula = active ? FORMULAS[active.name] : undefined;

  const others = active && activeGroup
    ? [
        ...activeGroup.components.filter(c => c.name !== active.name),
        ...GROUPS.filter(g => g.title !== activeGroup.title).flatMap(g => g.components),
      ].slice(0, 6)
    : [];

  const body = (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero">
        <span className="icon-tile icon-tile-info">
          <FlaskConical />
        </span>
        <div>
          <h1>Interactive labs</h1>
          <p className="page-sub">
            {USED_COUNT} interactive laboratories, free to explore without any lesson context — every visualization is
            computed from real formulas in your browser.
          </p>
        </div>
      </header>

      {/* active lab */}
      {active && activeGroup && (
        <section className="mt-6 anim-slide-up">
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 min-w-0">
              <div className="qf-card overflow-hidden">
                <div className="px-5 py-4 border-b bg-surface-2/40 flex items-center gap-3 flex-wrap">
                  <span className={'icon-tile ' + activeGroup.tile}>
                    <activeGroup.Icon />
                  </span>
                  <div className="flex-1 min-w-[160px]">
                    <h2 className="text-lg font-black tracking-tight">{pretty(active.name)}</h2>
                  </div>
                  <span className="chip chip-info">{activeGroup.domain}</span>
                  <span className="chip chip-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse inline-block" aria-hidden />
                    Live
                  </span>
                </div>
                <div className="p-3 sm:p-4">
                  <div className="rounded-2xl border-2 border-border bg-dots p-3 sm:p-4 [&_figure]:my-0">
                    <InteractiveBlock component={active.name} params={active.params} caption={active.caption} />
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-4 min-w-0">
              <div className="qf-card p-5">
                <div className="section-head">
                  <span className="icon-tile-sm icon-tile-info">
                    <FlaskConical />
                  </span>
                  <h2>About this lab</h2>
                </div>
                <p className="text-sm text-muted font-semibold leading-relaxed">{active.caption}</p>
                <div className="mt-4">
                  {activeFormula ? (
                    <div className="qf-card-flat p-3">
                      <ClientMathFigure tex={activeFormula.tex} caption={activeFormula.label} />
                    </div>
                  ) : (
                    <div className="qf-card-flat p-3 font-mono text-center text-lg">{pretty(active.name)}</div>
                  )}
                </div>
                <Link href="/lab" className="btn3d btn3d-ghost btn3d-sm mt-4 w-full">
                  <RotateCcw className="h-4 w-4" />
                  Back to all labs
                </Link>
              </div>

              <div className="qf-card p-5">
                <div className="section-head">
                  <span className="icon-tile-sm icon-tile-violet">
                    <Dices />
                  </span>
                  <h2>Other labs</h2>
                  <span className="chip tnum ml-auto">{USED_COUNT - 1}</span>
                </div>
                <ul className="space-y-2">
                  {others.map((o, i) => {
                    const og = activeGroup && activeGroup.components.some(c => c.name === o.name) ? activeGroup : groupOf(o.name)!;
                    const OIcon = og.Icon;
                    return (
                      <li key={o.name}>
                        <Link href={'/lab?lab=' + o.name} className="row-card anim-slide-up" style={slideDelay(i)}>
                          <span className={'icon-tile-sm ' + og.tile}>
                            <OIcon />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{pretty(o.name)}</p>
                            <p className="text-xs text-muted font-semibold truncate">{og.domain}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-faint shrink-0" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* lab browser */}
      {GROUPS.map((g, gi) => {
        const GIcon = g.Icon;
        return (
          <section key={g.title} className="mt-10 anim-slide-up" style={slideDelay(gi)}>
            <div className="section-head">
              <span className={'icon-tile-sm ' + g.tile}>
                <GIcon />
              </span>
              <div className="flex-1 min-w-0">
                <h2>{g.title}</h2>
                <p className="text-xs text-muted font-semibold">{g.desc}</p>
              </div>
              <span className="chip tnum ml-auto">{g.components.length} labs</span>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
              {g.components.map((c, ci) => {
                const isActive = active?.name === c.name;
                const num = GROUPS.slice(0, gi).reduce((n, x) => n + x.components.length, 0) + ci + 1;
                return (
                  <Link
                    key={c.name}
                    href={'/lab?lab=' + c.name}
                    className="qf-card p-5 flex flex-col gap-3 press hover:-translate-y-0.5 transition-transform anim-slide-up"
                    style={slideDelay(ci)}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`icon-tile icon-tile-sm ${g.tile} !text-[13px] font-black tnum`} style={isActive ? { outline: '2px solid var(--info)' } : undefined}>
                        {num}
                      </span>
                      <span className="chip hidden sm:inline-flex">{g.domain}</span>
                      {isActive && <span className="chip chip-info">viewing</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold tracking-tight">{pretty(c.name)}</h3>
                      <p className="mt-1.5 text-xs text-muted font-semibold leading-relaxed line-clamp-3">{c.caption}</p>
                    </div>
                    <span className="btn3d btn3d-ghost btn3d-sm mt-auto w-full">
                      Launch
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                );
              })}
              {/* remainder filler — completes the last row instead of leaving orphans */}
              {g.components.length % 4 !== 0 && (
                <div
                  className={`rounded-2xl border-2 border-dashed border-border bg-surface-2/40 p-5 flex flex-col justify-center gap-2 ${FILLER_SPAN[4 - (g.components.length % 4)] ?? ''}`}
                >
                  <span className="icon-tile icon-tile-sm"><BookOpen /></span>
                  <p className="text-xs font-bold text-muted leading-relaxed">
                    These labs also live inside the lessons that teach them — theory first, then the sandbox.
                  </p>
                  <Link href="/curriculum" className="text-xs font-extrabold text-info hover:underline">Open the curriculum →</Link>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* closing CTA — no dead zones */}
      <div className="mt-10 qf-card p-4 flex items-center gap-3.5 flex-wrap anim-slide-up">
        <span className="icon-tile-sm icon-tile-accent shrink-0">
          <BookOpen />
        </span>
        <p className="flex-1 min-w-[220px] text-sm font-semibold text-muted">
          Every one of these labs is embedded inside the lesson that teaches it — with the theory just before it.
        </p>
        <Link href="/curriculum" className="btn3d btn3d-ghost btn3d-sm shrink-0">
          Open the curriculum
        </Link>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader user={null} />
        {body}
      </div>
    );
  }
  return <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>{body}</AppShell>;
}
