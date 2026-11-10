import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getCompany, getMap, listAssessments, listCompanies } from '@/lib/content';
import { AppShell, PublicHeader } from '@/components/app-shell';
import {
  ArrowRight, BookOpen, Briefcase, Check, ChevronRight, ClipboardCheck, ClipboardList,
  ExternalLink, HelpCircle, Info, Layers, Route, ScrollText, ShieldCheck,
} from 'lucide-react';

// fixed track colour coding, consistent on every career page


const TRACK_CHIP: Record<string, string> = { A: 'chip-success', B: 'chip-info', C: 'chip-danger', D: 'chip-warning', E: 'chip-accent' };
const TRACK_TILE: Record<string, string> = { A: 'icon-tile-accent', B: 'icon-tile-info', C: 'icon-tile-danger', D: 'icon-tile-warning', E: 'icon-tile-violet' };

const TRACK_SKILLS: Record<string, string[]> = {
  A: ['Python', 'Portfolio analytics', 'Factor models', 'Backtesting', 'Statistics'],
  B: ['C++', 'Derivatives', 'Numerical methods', 'Stochastic calculus', 'Pricing'],
  C: ['C++', 'Low latency', 'Concurrency', 'CPU architecture', 'Networking'],
  D: ['Python', 'Statistics', 'ML foundations', 'Research pipelines', 'Time series'],
  E: ['Distributed systems', 'Databases', 'Streaming', 'Market data', 'Reliability'],
};

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

const AVATAR_TILES = ['icon-tile-accent', 'icon-tile-info', 'icon-tile-warning', 'icon-tile-danger', 'icon-tile-violet', 'icon-tile-gold'];
const SLIDE_DELAYS = ['0ms', '60ms', '120ms', '180ms', '240ms', '300ms'];

const SKILL_RE = /(C\+\+|Python|Java|SQL|Linux|Go|Rust|probability|statistics|mental math|machine learning|linear algebra|stochastic calculus|stochastic modelling|distributed systems|multi-threading|latency|concurrency|networking|databases|streaming|market data|microstructure|calibration|curve construction|time series|finance|economics|numerical libraries|testing|performance tuning|co-location|skills assessment|probability & statistics)/gi;

function highlightSkills(text: string): ReactNode[] {
  return text.split(SKILL_RE).map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-bold">{part}</strong> : part,
  );
}

function seniorityOf(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('intern')) return 'Internship';
  if (t.includes('graduate') || t.includes('campus') || t.includes('analyst program')) return 'Graduate';
  if (t.includes('senior')) return 'Senior';
  if (t.includes('lead') || t.includes('principal') || t.includes('staff') || t.includes('head of')) return 'Lead';
  return 'Experienced';
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const company = getCompany(slug);
  if (!company) notFound();
  const map = getMap();
  const assessments = listAssessments();

  const allModules = map.phases.flatMap(p => p.modules);
  const prepModules = company.prepModules
    .map(id => allModules.find(m => m.id === id))
    .filter(Boolean) as typeof allModules;
  const prepAssessments = assessments.filter(a => company.prepAssessments.includes(a.id));

  const roster = listCompanies();
  const rosterIdx = Math.max(0, roster.findIndex(c => c.slug === company.slug));
  const avatarTile = AVATAR_TILES[rosterIdx % AVATAR_TILES.length];
  const trackSet = [...new Set(company.roles.map(r => r.track))];

  const body = (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
      <nav className="text-xs text-faint mb-3 font-semibold">
        <Link href="/career" className="hover:text-muted">Career explorer</Link> › {company.name}
      </nav>

      {/* hero */}
      <header className="qf-card p-6 anim-pop-in">
        <div className="flex items-start gap-4 sm:gap-5 flex-wrap sm:flex-nowrap">
          <span className={`h-16 w-16 rounded-2xl inline-flex items-center justify-center shrink-0 ${avatarTile}`}>
            <span className="font-black text-2xl">{company.name.charAt(0)}</span>
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight">{company.name}</h1>
            <p className="mt-0.5 text-sm text-muted font-semibold">
              {CATEGORY_DESC[company.category] ?? CATEGORY_LABEL[company.category] ?? 'Quantitative hiring preparation profile.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="chip">{CATEGORY_LABEL[company.category] ?? company.category}</span>
              <span className="chip"><Briefcase className="h-3 w-3" /> {company.roles.length} mapped roles</span>
              {trackSet.map(t => (
                <span key={t} className={`chip ${TRACK_CHIP[t] ?? 'chip-accent'}`}>Track {t}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* posting note */}
      <div className="mt-4 qf-card-flat p-4 flex items-start gap-3 anim-slide-up">
        <span className="icon-tile icon-tile-sm icon-tile-info"><Info /></span>
        <p className="text-sm text-muted italic leading-relaxed">
          Full posting not imported, mapping inferred from track data.
        </p>
      </div>

      {/* mapped roles */}
      <section className="mt-8">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-info"><Briefcase /></span>
          <h2>Mapped roles</h2>
          <span className="chip ml-auto tnum">{company.roles.length} roles</span>
        </div>
        <div className="space-y-3">
          {company.roles.map((r, i) => (
            <div
              key={i}
              className="row-card anim-slide-up items-start"
              style={{ animationDelay: SLIDE_DELAYS[i % SLIDE_DELAYS.length] }}
            >
              <span className={`icon-tile icon-tile-sm ${TRACK_TILE[r.track] ?? 'icon-tile-accent'}`}><Briefcase /></span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold">{r.title}</h3>
                  <span className="chip">{seniorityOf(r.title)}</span>
                  <span className={`chip ${TRACK_CHIP[r.track] ?? 'chip-accent'}`}>Track {r.track}</span>
                </div>
                <p className="mt-1.5 text-sm text-muted leading-relaxed">{highlightSkills(r.notes)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(TRACK_SKILLS[r.track] ?? []).slice(0, 5).map(s => (
                    <span key={s} className="chip">{s}</span>
                  ))}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-faint shrink-0 mt-1" />
            </div>
          ))}
        </div>
      </section>

      {/* published expectations */}
      <section className="mt-8">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-gold"><ScrollText /></span>
          <h2>Published expectations & research notes</h2>
          <span className="chip ml-auto tnum">{company.publishedExpectations.length} notes</span>
        </div>
        <ul className="space-y-3">
          {company.publishedExpectations.map((e, i) => (
            <li
              key={i}
              className="qf-card-flat p-4 anim-slide-up hover:-translate-y-0.5 hover:shadow-md transition-all"
              style={{ animationDelay: SLIDE_DELAYS[i % SLIDE_DELAYS.length] }}
            >
              <div className="flex items-start gap-3.5">
                <span className={`icon-tile icon-tile-sm shrink-0 ${e.confidence === 'sourced' ? 'icon-tile-accent' : 'icon-tile-warning'}`}>
                  {e.confidence === 'sourced' ? <ShieldCheck /> : <HelpCircle />}
                </span>
                <div className="flex-1 min-w-0">
                  <blockquote className="border-l-4 border-accent/50 pl-3.5 text-sm leading-relaxed font-semibold">
                    {highlightSkills(e.claim)}
                  </blockquote>
                  <div className="mt-2.5 flex items-center gap-2 flex-wrap text-xs">
                    <span className={`chip ${e.confidence === 'sourced' ? 'chip-success' : 'chip-warning'}`}>
                      {e.confidence === 'sourced' ? 'Sourced' : 'Inferred'}
                    </span>
                    <span className="text-faint font-semibold">retrieved {e.retrievedAt}</span>
                    <a
                      href={e.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-info-strong hover:underline inline-flex items-center gap-0.5 font-bold"
                    >
                      {new URL(e.sourceUrl).hostname} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* competency areas */}
      <section className="mt-8">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-violet"><Layers /></span>
          <h2>Competency areas</h2>
          <span className="chip ml-auto tnum">{company.competencyAreas.length} areas</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {company.competencyAreas.map(a => (
            <li key={a} className="flex items-center gap-2.5 rounded-xl bg-surface-2/60 border border-border/60 px-3 py-2.5">
              <span className="h-6 w-6 shrink-0 rounded-lg bg-violet-soft text-violet flex items-center justify-center">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span className="text-sm font-bold capitalize leading-tight">{a.replace(/-/g, ' ')}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* prep assessments */}
      <section className="mt-8">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-gold"><ClipboardCheck /></span>
          <h2>Preparation assessments</h2>
        </div>
        {prepAssessments.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-2">
            {prepAssessments.map(a => (
              <Link key={a.id} href={`/assessments/${a.id}`} className="row-card">
                <span className="icon-tile icon-tile-sm icon-tile-accent"><ClipboardList /></span>
                <span className="flex-1 min-w-0 font-semibold text-sm leading-tight">{a.title}</span>
                <span className="chip tnum shrink-0">{a.questionCount}q · {a.timeLimitMinutes}m</span>
                <ChevronRight className="h-4 w-4 text-faint shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted leading-relaxed">
            No assessments mapped yet, the curriculum modules below cover the same ground.
          </p>
        )}
      </section>

      {/* curriculum modules */}
      {prepModules.length > 0 && (
        <section className="mt-8">
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-accent"><BookOpen /></span>
            <h2>Relevant curriculum modules</h2>
            <span className="chip ml-auto tnum">{prepModules.length} modules</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {prepModules.map((m, i) => (
              <Link
                key={m.id}
                href={`/curriculum#module-${m.id}`}
                className="row-card anim-slide-up"
                style={{ animationDelay: SLIDE_DELAYS[i % SLIDE_DELAYS.length] }}
              >
                <span className="icon-tile icon-tile-sm icon-tile-info"><BookOpen /></span>
                <div className="flex-1 min-w-0">
                  <span className="block font-bold text-sm">{m.title}</span>
                  <span className="block text-xs text-muted mt-0.5">{m.summary}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-faint shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* closing CTA */}
      <section className="mt-10 rounded-2xl border-2 border-accent bg-accent-soft p-5 sm:p-6 anim-slide-up">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <span className="icon-tile bg-surface text-accent-deep dark:text-accent"><Route /></span>
            <div>
              <h2 className="font-extrabold text-lg tracking-tight">See how these roles map to your learning path</h2>
              <p className="text-sm text-muted">Every track above is backed by a phase-by-phase curriculum with lessons, drills and assessments.</p>
            </div>
          </div>
          <Link href="/curriculum" className="btn3d">
            Open curriculum <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );

  if (!user) {
    return <div className="min-h-screen flex flex-col"><PublicHeader user={null} />{body}</div>;
  }
  return <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>{body}</AppShell>;
}
