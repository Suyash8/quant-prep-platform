import * as React from 'react';
import Link from 'next/link';
import {
  Check, Star, Lock, BookOpen, Sigma, TrendingUp, Code2, Cpu,
  BrainCircuit, Compass, Percent, Database, Layers, Play, ChevronDown,
  Clock, Target, Binary, Puzzle, Coins, ArrowRight, 
} from 'lucide-react';
import type { CurriculumMap } from '@/lib/content';
import { buildCurriculumGraph, isUnlockedInGraph } from '@/lib/curriculum-graph';
import { cn } from '@/lib/utils';

/**
 * The winding learning path, a Duolingo-style vertical trail of lesson
 * nodes grouped into modules and colour-coded phases.
 *
 * Module rendering states:
 *  - complete  → collapsed crown row (native <details>)
 *  - active    → full node trail (started, or contains the recommended lesson)
 *  - distant   → compact teaser row, expandable
 *
 * A sticky progress rail on lg+ fills the right flank with phase jump cards,
 * so the page has no dead zones at any scroll position.
 */

type ProgressMap = Map<string, { status: string }>;

/* One distinct glyph per semantic phase key, so the trail reads as a map,
 * not eleven copies of the same layers icon (v3.2: keyed by phase.color,
 * the ids are ph0..ph10 and match nothing). */
const PHASE_ICON_BY_KEY: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  orientation: Compass,
  math: Sigma,
  cs: Binary,
  python: Code2,
  cpp: Cpu,
  dsa: BrainCircuit,
  aptitude: Puzzle,
  finance: TrendingUp,
  stats: Percent,
  pricing: Coins,
  systems: Database,
};

const PHASE_ICON_BY_TITLE: { match: RegExp; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { match: /orient|diagnostic/i, icon: Compass },
  { match: /math/i, icon: Sigma },
  { match: /computer science|fundamental/i, icon: Binary },
  { match: /python|programming/i, icon: Code2 },
  { match: /c\+\+/i, icon: Cpu },
  { match: /data structure|algorithm/i, icon: BrainCircuit },
  { match: /aptitude|logic/i, icon: Puzzle },
  { match: /finance|market|trading|risk/i, icon: TrendingUp },
  { match: /statistic|time series|modelling/i, icon: Percent },
  { match: /pricing|numerical/i, icon: Coins },
  { match: /system|network|engineering/i, icon: Database },
];

export function phaseIcon(colorOrTitle: string) {
  const byKey = PHASE_ICON_BY_KEY[colorOrTitle];
  if (byKey) return byKey as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  return (PHASE_ICON_BY_TITLE.find(p => p.match.test(colorOrTitle))?.icon ?? Layers) as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

/** plural helper, kills the "1 modules · 5 Lessons" wobble */
export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Discipline-family palette: the banner hue encodes the DISCIPLINE the phase
 * belongs to (onboarding / mathematics / computer science / programming /
 * markets / engineering), while the per-phase icon differentiates phases inside
 * a family. Deep enough that white banner text passes comfortably. */
const PHASE_PALETTE: Record<string, string> = {
  orientation: '#5f6f8c',
  math: '#1e9e4f',
  cs: '#7c3fd6',
  python: '#0284c7',
  cpp: '#0369a1',
  dsa: '#7c3fd6',
  aptitude: '#7c3fd6',
  finance: '#dd3d43',
  stats: '#1e9e4f',
  pricing: '#1e9e4f',
  systems: '#0891b2',
};

/** the discipline a phase colour key maps to (for the rail legend) */
const PHASE_FAMILY: Record<string, string> = {
  orientation: 'Onboarding',
  math: 'Mathematics',
  stats: 'Mathematics',
  pricing: 'Mathematics',
  cs: 'Computer science',
  dsa: 'Computer science',
  aptitude: 'Computer science',
  python: 'Programming',
  cpp: 'Programming',
  finance: 'Markets',
  systems: 'Engineering',
};

export function resolvePhaseColor(colorKey: string): string {
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorKey)) return colorKey;
  return PHASE_PALETTE[colorKey] ?? '#34c759';
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function darken(hex: string, f = 0.72): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `#${[16, 8, 0].map(s => Math.round(((n >> s) & 255) * f).toString(16).padStart(2, '0')).join('')}`;
}

/** Desktop-only zigzag offsets (mobile stays a clean straight column). */
const OFFSETS = [
  'sm:translate-x-0',
  'sm:translate-x-[80px]',
  'sm:translate-x-[140px]',
  'sm:translate-x-[80px]',
  'sm:translate-x-0',
  'sm:translate-x-[-80px]',
  'sm:translate-x-[-140px]',
  'sm:translate-x-[-80px]',
];

export function LearningPath({
  map,
  progress,
  phases,
  currentLessonId,
  rail = true,
  moduleIds,
}: {
  map: CurriculumMap;
  progress: ProgressMap;
  /** phase ids to render (defaults to all) */
  phases?: string[];
  /** the recommended next lesson, gets the bouncy START bubble */
  currentLessonId?: string;
  /** show the sticky progress rail (lg+ only) */
  rail?: boolean;
  /** render only these modules (dashboard spotlight mode) */
  moduleIds?: string[];
}) {
  const passed = new Set(
    [...progress.entries()].filter(([, p]) => ['passed', 'mastered'].includes(p.status)).map(([id]) => id),
  );

  // graph for unlock checks, built from the map without any server dependency
  const graph = React.useMemo(
    () => buildCurriculumGraph(map, []),
    [map],
  );

  const visiblePhases = map.phases
    .filter(ph => !phases || phases.includes(ph.id))
    .sort((a, b) => a.order - b.order);

  // which module contains the current lesson? that one stays expanded.


  const focusModuleId = currentLessonId
    ? map.phases.flatMap(p => p.modules).find(m => m.lessons.some(l => l.id === currentLessonId))?.id
    : undefined;

  // a completely fresh visitor (no progress, no recommendation) sees full trails


  const fresh = passed.size === 0 && !currentLessonId;

  const focusPhaseId = focusModuleId
    ? visiblePhases.find(ph => ph.modules.some(m => m.id === focusModuleId))?.id
    : undefined;

  const totalLessons = visiblePhases.reduce((n, p) => n + p.modules.reduce((m, mod) => m + mod.lessons.length, 0), 0);
  const totalDone = visiblePhases.reduce(
    (n, p) => n + p.modules.reduce((m, mod) => m + mod.lessons.filter(l => passed.has(l.id)).length, 0), 0);
  const totalMin = visiblePhases.reduce(
    (n, p) => n + p.modules.reduce((m, mod) => m + mod.lessons.reduce((k, l) => k + l.estMinutes, 0), 0), 0);
  const pct = totalLessons ? Math.round((totalDone / totalLessons) * 100) : 0;

  return (
    <div className={cn('grid gap-8', rail && 'lg:grid-cols-[minmax(0,1fr)_290px]')}>
      <div className="min-w-0 space-y-10">
        {visiblePhases.map(phase => {
          const Icon = phaseIcon(phase.color);
          const color = resolvePhaseColor(phase.color);
          const phaseLessons = phase.modules.flatMap(m => m.lessons);
          const phaseDone = phaseLessons.filter(l => passed.has(l.id)).length;
          const phasePct = phaseLessons.length ? Math.round((phaseDone / phaseLessons.length) * 100) : 0;
          const phaseMin = phaseLessons.reduce((n, l) => n + l.estMinutes, 0);
          const isFocusPhase = phase.id === focusPhaseId;
          // untouched phases render as one compact preview card, not 6+ module teasers


          const distantPhase = !fresh && !isFocusPhase && phaseDone === 0;
          return (
            <section key={phase.id} id={`phase-${phase.id}`} aria-label={phase.title}>
              {/* phase banner: jewel gradient, icon chip, balanced text vs progress lockup */}
              <div
                className="rounded-[28px] p-5 sm:p-6 text-white relative overflow-hidden"
                style={{
                  background: `linear-gradient(150deg, ${darken(color, 0.78)} 0%, ${color} 100%)`,
                  boxShadow: `0 6px 0 0 ${darken(color, 0.6)}, 0 14px 30px -12px ${hexToRgba(color, 0.55)}`,
                }}
              >
                <div className="relative flex items-center gap-4 gap-y-3 flex-wrap">
                  <span className="h-14 w-14 rounded-[20px] bg-white/20 backdrop-blur flex items-center justify-center shrink-0 border-2 border-white/30">
                    <Icon className="h-7 w-7" />
                  </span>
                  <div className="min-w-[240px] flex-1 basis-[300px]">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/85">Phase {phase.order} · ~{Math.round(phaseMin / 60)}h · {PHASE_FAMILY[phase.color] ?? 'Core'}</p>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5 leading-tight [text-wrap:balance]">{phase.title}</h2>
                    <p className="text-sm text-white/90 font-bold max-w-xl mt-1">{phase.summary}</p>
                  </div>
                  {/* progress lockup: one bordered unit, % big, count under, no floating parts */}
                  <div className="flex flex-col items-stretch gap-1.5 min-w-[132px] shrink-0 rounded-2xl bg-black/20 border border-white/20 px-3.5 py-2.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/80">Progress</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black tnum leading-none">{phasePct}</span><span className="text-xs font-black text-white/80">%</span>
                      <span className="ml-auto text-[11px] font-black tnum text-white/90">{phaseDone}/{phaseLessons.length}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-black/25 overflow-hidden">
                      <div className="h-full rounded-full bg-white/95 transition-all duration-700" style={{ width: `${phasePct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {distantPhase ? (
                <PhasePreview phase={phase} color={color} phaseMin={phaseMin} icon={Icon} />
              ) : (
                <ModuleList
                  phase={phase}
                  graph={graph}
                  color={color}
                  progress={progress}
                  passed={passed}
                  focusModuleId={focusModuleId}
                  currentLessonId={currentLessonId}
                  fresh={fresh}
                  moduleIds={moduleIds}
                />
              )}
            </section>
          );
        })}
      </div>

      {/* sticky progress rail */}
      {rail && (
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="qf-card p-5 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent-soft" aria-hidden />
              <div className="relative">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-faint flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-accent-deep dark:text-accent" /> Your progress
                </p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-4xl font-black tnum leading-none">{pct}</span>
                  <span className="text-base font-black text-muted mb-0.5">%</span>
                </div>
                <p className="mt-1 text-xs font-bold text-muted tnum">
                  {totalDone} of {totalLessons} lessons · ~{Math.round((totalMin * (1 - pct / 100)) / 60)}h to go
                </p>
                <div className="mt-3 h-3.5 rounded-full bg-surface-3 overflow-hidden border border-border">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-deep))] transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <Link href="/curriculum?view=list" className="btn3d btn3d-sm w-full mt-4 !text-xs">
                  Browse as list <BookOpen className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* recommended lesson: keeps the rail alive mid-scroll and gives
                the column a second anchor below the jump list */}
            {currentLessonId && (() => {
              const lesson = map.phases.flatMap(p => p.modules).flatMap(m => m.lessons).find(l => l.id === currentLessonId);
              const phaseOf = visiblePhases.find(ph => ph.modules.some(m => m.lessons.some(l => l.id === currentLessonId)));
              if (!lesson || !phaseOf) return null;
              return (
                <div className="qf-card p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-faint flex items-center gap-1.5">
                    <Play className="h-3.5 w-3.5" /> Next up
                  </p>
                  <p className="mt-2 text-sm font-black tracking-tight leading-snug">{lesson.title}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-faint">
                    Phase {phaseOf.order} · {phaseOf.title}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="chip tnum"><Clock className="h-3 w-3" /> {lesson.estMinutes} min</span>
                    <Link href={`/learn/${lesson.id}`} className="btn3d btn3d-sm !text-xs">Continue <ArrowRight className="h-3 w-3" /></Link>
                  </div>
                </div>
              );
            })()}

            <div className="qf-card-flat p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-faint mb-3">Jump to phase</p>
              <ol className="space-y-1">
                {visiblePhases.map(ph => {
                  const c = resolvePhaseColor(ph.color);
                  const lessons = ph.modules.flatMap(m => m.lessons);
                  const done = lessons.filter(l => passed.has(l.id)).length;
                  const p = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
                  return (
                    <li key={ph.id}>
                      <a
                        href={`#phase-${ph.id}`}
                        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface-2 transition-colors group"
                      >
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: c }} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-extrabold truncate group-hover:text-accent transition-colors">{ph.title}</span>
                          <span className="mt-1 block h-1.5 rounded-full bg-surface-3 overflow-hidden">
                            <span className="block h-full rounded-full" style={{ width: `${p}%`, background: c }} />
                          </span>
                        </span>
                        <span className="text-[10px] font-black text-faint tnum">{p}%</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="qf-card-flat p-4 !bg-surface-2/50">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-faint flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Total effort
              </p>
              <p className="mt-2 text-lg font-black tnum">~{Math.round(totalMin / 60)} hours</p>
              <p className="text-[11px] font-semibold text-muted mt-0.5">of fully authored lessons, labs and checks, at your pace.</p>
              <p className="mt-3 pt-3 border-t border-border text-[10px] font-bold text-faint leading-relaxed">
                Banner colour encodes the discipline: slate onboarding · green mathematics · violet computer science · blue programming · red markets · teal engineering.
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

/** Untouched phase → one compact, expandable preview card (not a wall of module teasers).
 * v3.2: shows the phase's own first modules and hours so each row differs. */
function PhasePreview({
  phase, color, phaseMin, icon: Icon,
}: {
  phase: CurriculumMap['phases'][number];
  color: string;
  phaseMin: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  const lessons = phase.modules.reduce((n, m) => n + m.lessons.length, 0);
  const lead = phase.modules[0];
  const rest = phase.modules.length - 1;
  return (
    <details className="mt-4 group">
      <summary className="qf-card-flat px-5 py-4 flex items-center gap-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden hover:border-[var(--border-strong)] transition-colors">
        <span
          className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center border-2"
          style={{ background: hexToRgba(color, 0.12), borderColor: hexToRgba(color, 0.35) }}
        >
          <Lock className="h-5 w-5" style={{ color }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black tracking-tight">
            {plural(phase.modules.length, 'module')} · {plural(lessons, 'lesson')} · ~{Math.round(phaseMin / 60)}h
          </p>
          <p className="mt-0.5 text-xs font-semibold text-muted truncate">
            Starts with <span className="font-extrabold text-foreground">{lead?.title}</span>
            {rest > 0 && <> and {plural(rest, 'more module')}</>}, unlocks in path order
          </p>
        </div>
        <ChevronDown className="h-4 w-4 text-faint shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-2.5 grid sm:grid-cols-2 gap-2">
        {phase.modules.map(mod => (
          <li key={mod.id} className="rounded-xl bg-surface-2/50 border border-border/60 px-3.5 py-2.5 flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-extrabold truncate">{mod.title}</span>
              <span className="block text-[11px] font-bold text-faint tnum">{plural(mod.lessons.length, 'lesson')} · {mod.difficulty}</span>
            </span>
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Modules of one phase, in learning order. Everything after the focus module
 *  collapses into a single combined teaser so long phases don't become walls. */
function ModuleList({
  phase, graph, color, progress, passed, focusModuleId, currentLessonId, fresh, moduleIds,
}: {
  phase: CurriculumMap['phases'][number];
  graph: ReturnType<typeof buildCurriculumGraph>;
  color: string;
  progress: ProgressMap;
  passed: Set<string>;
  focusModuleId?: string;
  currentLessonId?: string;
  fresh: boolean;
  moduleIds?: string[];
}) {
  const focusIdx = focusModuleId ? phase.modules.findIndex(m => m.id === focusModuleId) : -1;
  // spotlight mode (dashboard): render only the requested modules


  const visible = moduleIds
    ? phase.modules.filter(m => moduleIds.includes(m.id))
    : focusIdx >= 0
      ? phase.modules.slice(0, focusIdx + 1)
      : phase.modules;
  const rest = moduleIds ? [] : focusIdx >= 0 ? phase.modules.slice(focusIdx + 1) : [];
  const restLessons = rest.reduce((n, m) => n + m.lessons.length, 0);
  const restMin = rest.reduce((n, m) => n + m.lessons.reduce((k, l) => k + l.estMinutes, 0), 0);

  return (
    <div className="mt-6 space-y-7">
      {visible.map(mod => {
        const modDone = mod.lessons.filter(l => passed.has(l.id)).length;
        const modPct = mod.lessons.length ? Math.round((modDone / mod.lessons.length) * 100) : 0;
        const complete = modDone === mod.lessons.length && mod.lessons.length > 0;
        const isFocus = mod.id === focusModuleId;
        const started = modDone > 0;
        const distant = !complete && !started && !isFocus && !fresh;
        return (
          <ModuleTrail
            key={mod.id}
            mod={mod}
            graph={graph}
            phaseColor={color}
            progress={progress}
            passed={passed}
            complete={complete}
            isFocus={isFocus}
            distant={distant}
            currentLessonId={currentLessonId}
            modDone={modDone}
            modPct={modPct}
          />
        );
      })}
      {rest.length > 0 && (
        <details className="group">
          <summary className="qf-card-flat px-5 py-4 flex items-center gap-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden hover:border-[var(--border-strong)] transition-colors">
            <span
              className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center border-2"
              style={{ background: hexToRgba(color, 0.12), borderColor: hexToRgba(color, 0.35) }}
            >
              <Layers className="h-5 w-5" style={{ color }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black tracking-tight">{rest.length} more modules in this phase</p>
              <p className="mt-0.5 text-xs font-semibold text-muted tnum">{restLessons} lessons · ~{Math.round(restMin / 60)}h, they unlock in order as you progress</p>
            </div>
            <ChevronDown className="h-4 w-4 text-faint shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="mt-2.5 grid sm:grid-cols-2 gap-2">
            {rest.map(mod => (
              <li key={mod.id} className="rounded-xl bg-surface-2/50 border border-border/60 px-3.5 py-2.5 flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold truncate">{mod.title}</span>
                  <span className="block text-[11px] font-bold text-faint tnum">{mod.lessons.length} lessons · {mod.difficulty}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function ModuleTrail({
  mod, graph, phaseColor, progress, passed, complete, isFocus, distant, currentLessonId, modDone, modPct,
}: {
  mod: CurriculumMap['phases'][number]['modules'][number];
  graph: ReturnType<typeof buildCurriculumGraph>;
  phaseColor: string;
  progress: ProgressMap;
  passed: Set<string>;
  complete: boolean;
  isFocus: boolean;
  distant: boolean;
  currentLessonId?: string;
  modDone: number;
  modPct: number;
}) {
  const header = (
    <div className="flex items-center gap-2.5 flex-wrap">
      <h3 className="font-black text-base">{mod.title}</h3>
      <span className="chip">{mod.difficulty}</span>
      {complete && <span className="chip chip-warning"><Star className="h-3 w-3" /> complete</span>}
      {isFocus && !complete && <span className="chip chip-success"><Play className="h-3 w-3" /> up next</span>}
    </div>
  );

  const modMinutes = mod.lessons.reduce((n, l) => n + l.estMinutes, 0);

  // collapsed compact row for finished modules (unless it's the focus module)


  if (complete && !isFocus) {
    return (
      <details id={`module-${mod.id}`} className="qf-card-flat overflow-hidden group">
        <summary className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
          <span className="h-10 w-10 shrink-0 rounded-2xl bg-warning-soft flex items-center justify-center">
            <Star className="h-5 w-5 text-warning" />
          </span>
          {header}
          <span className="ml-auto flex items-center gap-2 text-xs font-black text-faint tnum">
            {modDone}/{mod.lessons.length}
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="px-4 pb-5 pt-1 border-t-2 border-border">
          <div className="relative flex flex-col items-center pt-6">
            <Trail mod={mod} graph={graph} progress={progress} passed={passed} phaseColor={phaseColor} currentLessonId={currentLessonId} />
          </div>
        </div>
      </details>
    );
  }

  // distant, untouched module → compact teaser (expandable)


  if (distant) {
    return (
      <details id={`module-${mod.id}`} className="group">
        <summary className="qf-card-flat px-4 py-3.5 flex items-center gap-3 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden hover:border-[var(--border-strong)] transition-colors">
          <span
            className="h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center border-2"
            style={{ background: hexToRgba(phaseColor, 0.12), borderColor: hexToRgba(phaseColor, 0.35) }}
          >
            <Lock className="h-[18px] w-[18px]" style={{ color: phaseColor }} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">{header}</div>
            <p className="mt-1 text-xs font-semibold text-muted tnum">
              {mod.lessons.length} lessons · ~{Math.round(modMinutes / 60 * 10) / 10}h · unlocks as you clear the path
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-faint shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="relative flex flex-col items-center pt-6">
          <Trail mod={mod} graph={graph} progress={progress} passed={passed} phaseColor={phaseColor} currentLessonId={currentLessonId} />
        </div>
      </details>
    );
  }

  return (
    <div id={`module-${mod.id}`}>
      <div className="flex items-center gap-2.5 flex-wrap mb-2 px-1">
        {header}
      </div>
      <div className="flex items-center gap-2.5 px-1 mb-5">
        <div className="flex-1 h-3.5 rounded-full border-2 border-border bg-surface-3 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${modPct}%`, background: phaseColor }} />
        </div>
        <span className="chip tnum shrink-0">{modDone}/{mod.lessons.length}</span>
      </div>
      {/* trail sits on a soft band so the winding path reads as intentional, band width hugs the zigzag so there are no dead margins */}
      <div className="relative flex flex-col items-center rounded-[44px] bg-surface-2/45 dark:bg-surface-2/25 border-2 border-dashed border-border/70 px-4 sm:px-6 py-5 max-w-[300px] sm:max-w-[560px] mx-auto w-full">
        <Trail mod={mod} graph={graph} progress={progress} passed={passed} phaseColor={phaseColor} currentLessonId={currentLessonId} />
      </div>
    </div>
  );
}

function Trail({
  mod, graph, progress, passed, phaseColor, currentLessonId,
}: {
  mod: CurriculumMap['phases'][number]['modules'][number];
  graph: ReturnType<typeof buildCurriculumGraph>;
  progress: ProgressMap;
  passed: Set<string>;
  phaseColor: string;
  currentLessonId?: string;
}) {
  return (
    <>
      {mod.lessons.map((lesson, i) => {
        const st = progress.get(lesson.id)?.status ?? 'not_started';
        const unlocked = isUnlockedInGraph(graph, lesson.id, passed);
        const isCurrent = lesson.id === currentLessonId;
        const last = i === mod.lessons.length - 1;
        return (
          <div
            key={lesson.id}
            className={cn('relative flex flex-col items-center transition-transform duration-200', OFFSETS[i % 8], isCurrent && 'mt-7')}
          >
            {!last && (
              <span
                aria-hidden
                className={cn('absolute top-[82px] bottom-0 w-[26px] rounded-full', passed.has(lesson.id) ? '' : 'bg-surface-3')}
                style={passed.has(lesson.id) ? { background: phaseColor, opacity: 0.55 } : undefined}
              />
            )}
            <PathNode
              lessonId={lesson.id}
              title={lesson.title}
              minutes={lesson.estMinutes}
              status={st}
              unlocked={unlocked}
              isCurrent={!!isCurrent}
              color={phaseColor}
            />
            {!last && <div className="h-3" />}
          </div>
        );
      })}
    </>
  );
}

function PathNode({
  lessonId, title, minutes, status, unlocked, isCurrent, color,
}: {
  lessonId: string;
  title: string;
  minutes: number;
  status: string;
  unlocked: boolean;
  isCurrent: boolean;
  color: string;
}) {
  const size = isCurrent ? 'h-[94px] w-[94px]' : 'h-[74px] w-[74px]';
  const ring = isCurrent ? 'anim-pulse-ring' : '';

  let inner: React.ReactNode;
  let bg: string;
  let shadow: string;

  if (status === 'mastered') {
    bg = 'linear-gradient(160deg, #ffd43e 0%, #ffb200 100%)';
    shadow = '#d9ab00';
    inner = <Star className="h-8 w-8 text-white fill-white" />;
  } else if (status === 'passed') {
    bg = 'linear-gradient(160deg, #3ddc84 0%, #29c463 100%)';
    shadow = '#1f9d4e';
    inner = <Check className="h-8 w-8 text-white" strokeWidth={3.2} />;
  } else if (!unlocked) {
    bg = 'var(--surface-3)';
    shadow = 'var(--border-strong)';
    inner = <Lock className="h-7 w-7 text-faint" />;
  } else {
    bg = `linear-gradient(160deg, ${color} 0%, ${hexToRgba(color, 0.72)} 100%)`;
    shadow = hexToRgba(color, 0.5);
    inner = <Play className="h-8 w-8 text-white fill-white" />;
  }

  const body = (
    <span className={cn('path-node relative flex flex-col items-center select-none', !unlocked && 'cursor-default')}>
      {isCurrent && (
        <span className="absolute -top-11 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-xl bg-foreground px-4 py-2 text-[12px] font-black tracking-wide text-background anim-bob shadow-md">
          START
        </span>
      )}
      <span
        className={cn(size, 'relative z-10 rounded-full flex items-center justify-center border-[3.5px] border-white dark:border-[#0f1622]', ring)}
        style={{ background: bg, boxShadow: `0 6px 0 0 ${shadow}` }}
      >
        {inner}
      </span>
      <span
        className={cn(
          'relative z-10 mt-2 text-center text-[13px] font-extrabold leading-tight bg-background px-2 py-0.5 rounded-lg',
          unlocked ? 'text-foreground' : 'text-faint',
        )}
        style={{ maxWidth: 200 }}
      >
        {title}
      </span>
      <span className="relative z-10 text-[11px] font-bold text-faint tnum bg-background px-1.5 rounded">{minutes} min</span>
    </span>
  );

  if (!unlocked) {
    return <span aria-label={`${title} (locked)`} title={`${title}, locked until prerequisites are passed`}>{body}</span>;
  }
  return (
    <Link href={`/learn/${lessonId}`} aria-label={`${title} (${status.replace('_', ' ')})`} className="group">
      {body}
    </Link>
  );
}
