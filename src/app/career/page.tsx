import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { listCompanies, getCompany, getMatrix, getMap } from '@/lib/content';
import { AppShell, PublicHeader } from '@/components/app-shell';
import { ApplicationTracker } from '@/components/application-tracker';
import {
  ArrowRight, BarChart3, Briefcase, Building2, ChevronRight, ClipboardList, Compass, FileText, Layers,
  ListChecks, Route, ShieldCheck, Table2, Target,
} from 'lucide-react';

export const metadata = { title: 'Career explorer. QuantFoundry' };

const CATEGORY_LABEL: Record<string, string> = {
  'prop-trading': 'Proprietary trading',
  'asset-manager': 'Asset management',
  'bank': 'Investment banking',
  'market-maker': 'Market making',
  'fund': 'Fund',
  'market-data': 'Market data & fintech',
};

const CATEGORY_DESC: Record<string, string> = {
  'prop-trading': 'Speed, probability and low-latency C++ under exchange constraints.',
  'asset-manager': 'Portfolio analytics, factor research and platform engineering.',
  'bank': 'Pricing engines, risk systems and structured product technology.',
  'market-maker': 'Continuous two-sided quoting with microsecond decision loops.',
  'fund': 'Multi-manager platforms and research infrastructure at scale.',
  'market-data': 'Data pipelines, terminals and platform reliability engineering.',
};

// per-firm one-liners (derived from each profile's research notes)


const COMPANY_BLURB: Record<string, string> = {
  'barclays': 'Structured products tech with unusually concrete published skill bars.',
  'blackrock': 'Aladdin, one of the largest risk platforms in asset management.',
  'bloomberg': 'Terminals, data pipelines and platform reliability at global scale.',
  'citadel-securities': 'Market making with demanding C++ and low-latency interviews.',
  'goldman-sachs': 'The best-documented hiring prep of any bank, platforms and strats.',
  'imc': 'Publishes its full recruitment process, rare and genuinely useful.',
  'jane-street': 'OCaml-first trading tech; famously explicit interview guidance.',
  'jpmorgan': 'A structured how-we-hire path across payments and markets tech.',
  'jump-trading': 'Research-driven prop trading with a performance-first C++ culture.',
  'millennium': 'Multi-manager platform: many pods, heavy research infrastructure.',
  'morgan-stanley': 'Broad markets-and-banking tech org; breadth-oriented hiring.',
  'optiver': 'One of the few firms publishing an official SWE interview guide.',
  'susquehanna-international-group': 'Trading, quant research and technology with an options heritage.',
  'two-sigma': 'Data-driven fund: research engineering and platform at scale.',
  'ubs': 'Concrete skill bars published on its own job board.',
};


// fixed track colour coding, consistent on every career page


const TRACK_CHIP: Record<string, string> = { A: 'chip-success', B: 'chip-info', C: 'chip-danger', D: 'chip-warning', E: 'chip-accent' };
const TRACK_TILE: Record<string, string> = { A: 'icon-tile-accent', B: 'icon-tile-info', C: 'icon-tile-danger', D: 'icon-tile-warning', E: 'icon-tile-violet' };

// requirement tiers rendered as chips; tones follow the legend colours
// (essential=red, frequent=yellow, role-dependent=green, weak tiers ghost)
const TIER_META: Record<string, { label: string; cls: string }> = {
  essential: { label: 'Essential', cls: 'chip chip-danger' },
  'frequently required': { label: 'Frequent', cls: 'chip chip-warning' },
  'role-dependent': { label: 'Role dep.', cls: 'chip chip-accent' },
  desirable: { label: 'Desirable', cls: 'chip' },
  'advanced specialization': { label: 'Advanced', cls: 'chip' },
};
const TIER_ORDER = ['essential', 'frequently required', 'role-dependent', 'desirable', 'advanced specialization'];

// display-only expansion of jargon skill slugs (data stays untouched)
const SKILL_LABEL: Record<string, string> = {
  cpp: 'C++',
  dsa: 'DSA',
  'databases/sql': 'Databases / SQL',
  'calculus/numerical methods': 'Calculus / numerical methods',
  'concurrency/low-latency': 'Concurrency / low latency',
  'linux/tooling': 'Linux / tooling',
};
function matrixSkillLabel(skill: string): string {
  const hit = SKILL_LABEL[skill];
  if (hit) return hit;
  return skill.replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

/** graduate / internship hiring signal derived from mapped role titles */
function hasGraduateRoles(roles: readonly { title: string }[]): boolean {
  return roles.some(r => /intern|graduate|campus|analyst program|placement/i.test(r.title));
}

const POP_DELAYS = ['0ms', '70ms', '140ms', '210ms'];
const SLIDE_DELAYS = ['0ms', '60ms', '120ms', '180ms', '240ms', '300ms'];

const RESUME_TIPS = [
  {
    icon: BarChart3,
    tile: 'icon-tile-info',
    title: 'Present projects with evidence',
    body: 'Quantify: “order book sustaining 1.2M updates/s with p99 match latency 3.4µs (benchmark included in repo)” beats “built a fast order book”. Every claimed number must be reproducible from your repository, a reviewer may check.',
  },
  {
    icon: ListChecks,
    tile: 'icon-tile-accent',
    title: 'Structure',
    body: 'One page for internships and graduate roles. Projects with metrics, then skills grouped honestly (C++17/20, Python, NumPy/pandas, SQL, Linux), then education. No skill bars, no invented familiarity.',
  },
  {
    icon: Target,
    tile: 'icon-tile-warning',
    title: 'What reviewers screen for',
    body: 'Evidence of C++ depth (memory, concurrency, performance work), numerical/linear algebra coursework or projects, and genuine algorithmic practice. Research infrastructure and reproducible benchmarks read stronger than buzzwords.',
  },
  {
    icon: ShieldCheck,
    tile: 'icon-tile-violet',
    title: 'Credibility rule',
    body: 'Never invent accomplishments, benchmark results or employment history. If you cannot demonstrate it, do not claim it, interviewers probe every line.',
  },
];

export default async function CareerPage() {
  const user = await getCurrentUser();
  const companies = listCompanies();
  const matrix = getMatrix();
  const map = getMap();

  let applications: { id: string; company: string; role: string; status: string; note: string; updatedAt: Date }[] = [];
  if (user) {
    applications = await db.application.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } });
  }

  const enriched = companies.map(c => {
    const full = getCompany(c.slug);
    const trackSet = [...new Set((full?.roles ?? []).map(r => r.track))].sort();
    return {
      ...c,
      roles: full?.roles.length ?? 0,
      areas: full?.competencyAreas.length ?? 0,
      tracks: trackSet.length,
      primaryTrack: trackSet[0],
      trackLetters: trackSet.join('·'),
      gradRoles: hasGraduateRoles(full?.roles ?? []),
    };
  });
  const rolesTotal = enriched.reduce((n, c) => n + c.roles, 0);
  const areasTotal = enriched.reduce((n, c) => n + c.areas, 0);
  const tracksCount = Object.keys(map.tracks).length;

  const statTiles = [
    { icon: Building2, tile: 'icon-tile-accent', value: String(companies.length), label: 'Companies profiled' },
    { icon: Briefcase, tile: 'icon-tile-info', value: String(rolesTotal), label: 'Roles mapped' },
    { icon: Layers, tile: 'icon-tile-neutral', value: String(areasTotal), label: 'Competency areas' },
    { icon: Route, tile: 'icon-tile-info', value: String(tracksCount), label: 'Career tracks' },
  ];

  const body = (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero anim-slide-up">
        <span className="icon-tile icon-tile-gold"><Briefcase /></span>
        <div>
          <h1>Career explorer</h1>
          <p className="page-sub">{companies.length} companies · {rolesTotal} mapped roles · {tracksCount} career tracks</p>
        </div>
      </header>
      <p className="-mt-2.5 mb-6 max-w-3xl text-[13px] font-semibold leading-relaxed text-muted anim-slide-up">
        Honest preparation for quantitative hiring. Facts marked <em>sourced</em> come from official career pages with
        retrieval dates; patterns are labelled <em>inferred</em> ,  never presented as guarantees.
      </p>

      {/* stat row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statTiles.map((s, i) => (
          <div key={s.label} className="stat-tile min-w-0 anim-pop-in" style={{ animationDelay: POP_DELAYS[i] }}>
            <span className={`icon-tile icon-tile-sm ${s.tile}`}><s.icon /></span>
            <div className="stat-body">
              <p className="stat-value tnum">{s.value}</p>
              <p className="stat-label">{s.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Tracks */}
      <section className="mt-10">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-info"><Route /></span>
          <h2>Career tracks</h2>
          <span className="chip ml-auto">{tracksCount} tracks · one curriculum each</span>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(map.tracks).map(([key, t], i) => (
            <div
              key={key}
              id={key}
              className="qf-card p-5 flex flex-col scroll-mt-20 anim-slide-up hover:-translate-y-0.5 hover:shadow-lg transition-all"
              style={{ animationDelay: SLIDE_DELAYS[i % SLIDE_DELAYS.length] }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`chip ${TRACK_CHIP[key] ?? 'chip-accent'}`}>Track {key}</span>
                <span className={`icon-tile icon-tile-sm ${TRACK_TILE[key] ?? 'icon-tile-accent'}`}><Route /></span>
              </div>
              <h3 className="mt-3 font-extrabold tracking-tight leading-snug">{t.title}</h3>
              <p className="mt-1 text-[13px] font-bold text-faint">Typical employers: {t.employers}</p>
              <p className="mt-2 text-[15px] text-muted leading-relaxed">{t.focus}</p>
              <div className="mt-auto pt-4">
                <Link href="/curriculum" className="btn3d btn3d-ghost btn3d-sm">
                  Mapped curriculum <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
          {/* undecided card, completes the grid, routes to the diagnostic */}
          <div className="qf-card-flat p-5 flex flex-col !bg-accent-soft/60 border-2 border-accent/30">
            <div className="flex items-center justify-between gap-2">
              <span className="chip">Track ?</span>
              <span className="icon-tile icon-tile-sm"><Compass /></span>
            </div>
            <h3 className="mt-3 font-extrabold tracking-tight leading-snug">Undecided?</h3>
            <p className="mt-1 text-[13px] font-bold text-faint">Every track shares the same core phases</p>
            <p className="mt-2 text-[15px] text-muted leading-relaxed">
              The first phases are common to all five tracks, start the curriculum and take the diagnostic; your
              placement picks the track with you.
            </p>
            <div className="mt-auto pt-4">
              <Link href="/diagnostic" className="btn3d btn3d-ghost btn3d-sm">
                Take the diagnostic <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements matrix */}
      {matrix && (
        <section className="mt-10">
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-warning"><Table2 /></span>
            <h2>Requirements matrix</h2>
            <span className="chip ml-auto tnum">Updated {matrix.generatedAt}</span>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-faint font-bold">Legend:</span>
            {TIER_ORDER.map(k => (
              <span key={k} className={TIER_META[k].cls}>{TIER_META[k].label}</span>
            ))}
            <span className="ml-auto text-faint font-semibold">Hover any cell for the full requirement wording</span>
          </div>
          <div className="qf-card p-2 sm:p-4 overflow-x-auto thin-scroll">
            <table className="qf-table text-[15px]">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-surface z-10">Skill</th>
                  <th className="text-center">Asset managers</th>
                  <th className="text-center">Banks</th>
                  <th className="text-center">Prop trading</th>
                  <th className="text-center">Hedge funds</th>
                  <th className="text-center">Market data</th>
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map(r => (
                  <tr key={r.skill}>
                    <td className="font-bold sticky left-0 bg-surface z-10" title={r.note ?? undefined}>
                      {matrixSkillLabel(r.skill)}
                      {r.note && <span className="ml-1.5 text-faint" title={r.note}>ⓘ</span>}
                    </td>
                    {['assetManagers', 'banks', 'propTrading', 'hedgeFunds', 'marketData'].map(k => {
                      const v = r[k as keyof typeof r] as string;
                      const tier = TIER_META[v];
                      return (
                        <td key={k} className="text-center">
                          <span className={tier?.cls ?? 'chip'} title={v}>{tier?.label ?? v}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Company profiles, grouped by category for scannable rhythm */}
      <section className="mt-10">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-gold"><Building2 /></span>
          <h2>Company preparation profiles</h2>
          <span className="chip ml-auto">{companies.length} firms</span>
        </div>
        <div className="space-y-6">
          {Object.entries(CATEGORY_LABEL).flatMap(([cat, label]) => {
            const firms = enriched.filter(c => c.category === cat);
            if (!firms.length) return [];
            return [(
              <div key={cat}>
                <div className="flex items-center gap-2.5 mb-2.5 px-1">
                  <h3 className="text-[13px] font-black uppercase tracking-[0.12em] text-muted">{label}</h3>
                  <span className="flex-1 h-0.5 rounded-full bg-border" />
                  <span className="chip tnum">{firms.length} firms</span>
                </div>
                <div className="qf-card-flat divide-y">
                  {firms.map((c, i) => (
                    <Link
                      key={c.slug}
                      href={`/career/${c.slug}`}
                      className="row-card !py-3 anim-slide-up group hover:bg-surface-2/50 transition-colors"
                      style={{ animationDelay: SLIDE_DELAYS[i % SLIDE_DELAYS.length] }}
                    >
                      <span className={`icon-tile ${TRACK_TILE[c.primaryTrack ?? ''] ?? 'icon-tile-neutral'}`}>
                        <span className="font-black text-lg">{c.name.charAt(0)}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[15px] ${i === 0 ? 'font-black' : 'font-bold'} group-hover:text-accent-deep dark:group-hover:text-accent transition-colors`}>{c.name}</span>
                          {c.gradRoles && <span className="chip chip-accent">Graduate roles</span>}
                          <span className="text-[13px] font-bold text-faint tnum hidden sm:inline">{c.roles} roles · tracks {c.trackLetters}</span>
                        </span>
                        <span className="block mt-0.5 text-[13px] text-muted font-semibold truncate">{COMPANY_BLURB[c.slug] ?? CATEGORY_DESC[c.category] ?? 'Quantitative hiring preparation profile.'}</span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                    </Link>
                  ))}
                </div>
              </div>
            )];
          })}
        </div>
      </section>

      {/* Resume guidance */}
      <section className="mt-10">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-violet"><FileText /></span>
          <h2>Resume guidance for quantitative developers</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {RESUME_TIPS.map((tip, i) => (
            <div
              key={tip.title}
              className="qf-card-flat p-5 anim-slide-up hover:-translate-y-0.5 hover:shadow-lg transition-all"
              style={{ animationDelay: SLIDE_DELAYS[i % SLIDE_DELAYS.length] }}
            >
              <div className="flex items-center gap-3">
                <span className={`icon-tile icon-tile-sm ${tip.tile}`}><tip.icon /></span>
                <h3 className="font-extrabold tracking-tight">{tip.title}</h3>
              </div>
              <p className="mt-2.5 text-[15px] text-muted leading-relaxed">{tip.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Application tracker */}
      {user ? (
        <section className="mt-10">
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-accent"><ClipboardList /></span>
            <h2>Application tracker</h2>
            <span className="chip ml-auto tnum">{applications.length} logged</span>
          </div>
          <ApplicationTracker initial={applications.map(a => ({ id: a.id, company: a.company, role: a.role, status: a.status, note: a.note }))} />
        </section>
      ) : (
        <section className="mt-10 rounded-2xl border-2 border-accent bg-accent-soft p-5 sm:p-6 anim-slide-up">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <span className="icon-tile bg-surface text-accent-deep dark:text-accent"><Compass /></span>
              <div>
                <h2 className="font-extrabold text-lg tracking-tight">Not sure where you stand?</h2>
                <p className="text-[15px] text-muted">Take the 28-question diagnostic and start at the phase that matches you, no wasted weeks.</p>
              </div>
            </div>
            <Link href="/diagnostic" className="btn3d">Take the diagnostic <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      )}
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
