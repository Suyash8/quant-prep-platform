'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CalendarClock, CalendarDays, Clock, Coffee, Gauge, Info, Route,
  SlidersHorizontal, Sparkles, Sun, BookOpen, Zap,
} from 'lucide-react';
import { toast } from 'sonner';

export interface PlanTask { week: number; day: number; kind: string; title: string; ref?: string; minutes: number }
export interface Plan { tasks: PlanTask[]; weeks: number; totalHours: number; note: string; feasibility: string }

// one unified chip system for activity types: lesson = filled green, practice/drill = filled info,
// revision = ghost, assessment = filled amber, buffer = ghost
const KIND_STYLE: Record<string, string> = {
  lesson: 'chip-success',
  practice: 'chip-info',
  revision: '',
  assessment: 'chip-warning',
  buffer: '',
};

const POP_DELAYS = ['0ms', '70ms', '140ms', '210ms'];

function groupByDay(tasks: PlanTask[]): [number, PlanTask[]][] {
  const m = new Map<number, PlanTask[]>();
  for (const t of tasks) {
    if (!m.has(t.day)) m.set(t.day, []);
    m.get(t.day)!.push(t);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}

export function Planner({ initialPlan }: { initialPlan: Plan | null }) {
  const [hoursPerWeek, setHours] = React.useState(10);
  const [daysPerWeek, setDays] = React.useState(5);
  const [track, setTrack] = React.useState('any');
  const [mode, setMode] = React.useState('balanced');
  const [targetDate, setTargetDate] = React.useState('');
  const [plan, setPlan] = React.useState<Plan | null>(initialPlan);
  const [busy, setBusy] = React.useState(false);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch('/api/planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hoursPerWeek, daysPerWeek, track, mode,
          targetDate: targetDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed.'); return; }
      setPlan(data.plan);
      toast.success('Schedule generated from the prerequisite graph.');
    } catch { toast.error('Network error.'); } finally { setBusy(false); }
  }

  const byWeek = React.useMemo(() => {
    if (!plan) return new Map<number, PlanTask[]>();
    const m = new Map<number, PlanTask[]>();
    for (const t of plan.tasks) {
      if (!m.has(t.week)) m.set(t.week, []);
      m.get(t.week)!.push(t);
    }
    return m;
  }, [plan]);

  const stats = React.useMemo(() => {
    if (!plan) return null;
    const lessons = plan.tasks.filter(t => t.kind === 'lesson').length;
    const minutes = plan.tasks.reduce((n, t) => n + t.minutes, 0);
    const finish = new Date(Date.now() + plan.weeks * 7 * 86400000);
    return {
      lessonsPerWeek: Math.max(1, Math.round(lessons / plan.weeks)),
      xpPerWeek: Math.round(minutes / plan.weeks),
      finishLabel: finish.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      hoursPerWeek: Math.round((plan.totalHours / plan.weeks) * 10) / 10,
      minutesPerWeek: Math.round(minutes / plan.weeks),
    };
  }, [plan]);

  const statTiles = stats ? [
    { icon: CalendarDays, tile: 'icon-tile-accent', value: stats.finishLabel, label: 'Finish by' },
    { icon: BookOpen, tile: 'icon-tile-info', value: String(stats.lessonsPerWeek), label: 'Lessons / week' },
    { icon: Zap, tile: 'icon-tile-neutral', value: String(stats.xpPerWeek), label: 'XP / week' },
    { icon: Clock, tile: 'icon-tile-neutral', value: String(stats.hoursPerWeek), label: 'Hours / week' },
  ] : [];

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-stretch">
      {/* constraints form: stretches with the plan column, filled by the plan summary below */}
      <div className="qf-card p-6 flex flex-col min-w-0 anim-slide-up">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-info"><SlidersHorizontal /></span>
          <h2>Your constraints</h2>
        </div>
        <div className="space-y-5 text-[15px]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold text-[15px]">
                <Clock className="h-3.5 w-3.5 text-info" /> Hours per week
              </span>
              <span className="chip chip-accent tnum">{hoursPerWeek}h</span>
            </div>
            <input type="range" min={2} max={50} value={hoursPerWeek} onChange={e => setHours(parseInt(e.target.value))} className="qf-range mt-2.5" aria-label="Hours per week" style={{ '--fill': `${((hoursPerWeek - 2) / 48) * 100}%` } as React.CSSProperties} />
            <div className="mt-1 flex justify-between text-[13px] text-faint font-semibold"><span>2h</span><span>50h</span></div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold text-[15px]">
                <CalendarDays className="h-3.5 w-3.5 text-info" /> Study days per week
              </span>
              <span className="chip chip-accent tnum">{daysPerWeek} {daysPerWeek === 1 ? 'day' : 'days'}</span>
            </div>
            <input type="range" min={1} max={7} value={daysPerWeek} onChange={e => setDays(parseInt(e.target.value))} className="qf-range mt-2.5" aria-label="Days per week" style={{ '--fill': `${((daysPerWeek - 1) / 6) * 100}%` } as React.CSSProperties} />
            <div className="mt-1 flex justify-between text-[13px] text-faint font-semibold"><span>1 day</span><span>7 days</span></div>
          </div>
          <label className="block">
            <span className="flex items-center gap-1.5 font-bold text-[15px]">
              <Route className="h-3.5 w-3.5 text-info" /> Target track
            </span>
            <select value={track} onChange={e => setTrack(e.target.value)} className="qf-select mt-1.5" aria-label="Track">
              <option value="any">Foundation first, decide later</option>
              <option value="A">A. Asset management</option>
              <option value="B">B. Investment banking</option>
              <option value="C">C. HFT / low latency</option>
              <option value="D">D. Research engineering</option>
              <option value="E">E. Infrastructure</option>
            </select>
          </label>
          <label className="block">
            <span className="flex items-center gap-1.5 font-bold text-[15px]">
              <Gauge className="h-3.5 w-3.5 text-info" /> Mode
            </span>
            <select value={mode} onChange={e => setMode(e.target.value)} className="qf-select mt-1.5" aria-label="Mode">
              <option value="intensive">Intensive (long sessions)</option>
              <option value="balanced">Balanced</option>
              <option value="flexible">Flexible (short sessions)</option>
            </select>
          </label>
          <label className="block">
            <span className="flex items-center gap-1.5 font-bold text-[15px]">
              <CalendarClock className="h-3.5 w-3.5 text-info" /> Target date <span className="text-faint font-semibold">(optional)</span>
            </span>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="qf-input mt-1.5" aria-label="Target date" />
          </label>
          <button onClick={generate} disabled={busy} className="btn3d w-full">
            <Sparkles className="h-4 w-4" /> {busy ? 'Planning…' : plan ? 'Regenerate plan' : 'Generate plan'}
          </button>
          {plan && (() => {
            // honest summary computed from the plan data already in scope
            const lessons = plan.tasks.filter(t => t.kind === 'lesson').length;
            const hours = Math.round(plan.tasks.reduce((n, t) => n + t.minutes, 0) / 60);
            return (
              <div className="mt-5 rounded-2xl border-2 border-border bg-surface-2/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="icon-tile icon-tile-sm icon-tile-info"><Route className="h-4 w-4" /></span>
                  <p className="text-[12px] font-black uppercase tracking-[0.1em] text-muted">This plan covers</p>
                </div>
                <p className="text-[15px] font-bold leading-relaxed text-muted">
                  <span className="font-black text-foreground tnum">{plan.weeks}</span> weeks ·{' '}
                  <span className="font-black text-foreground tnum">{lessons}</span> lessons ·{' '}
                  <span className="font-black text-foreground tnum">≈{hours}h</span> of study
                  across <span className="font-black text-foreground tnum">{plan.tasks.length}</span> sessions.
                </p>
              </div>
            );
          })()}
        </div>
        <p className="mt-auto pt-5 text-[13px] text-muted leading-relaxed">
          The planner walks lessons in prerequisite order, it never schedules a lesson before its prerequisites,
          and it will not compress a 1,000-hour programme into a 90-day promise.
        </p>
      </div>

      {/* plan output */}
      <div>
        {plan ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="section-head mb-0 flex-1 min-w-0">
                <span className="icon-tile icon-tile-sm icon-tile-accent"><CalendarDays /></span>
                <h2>Your plan</h2>
                <span className="chip chip-accent ml-auto tnum">{plan.weeks} weeks</span>
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {statTiles.map((s, i) => (
                  <div key={s.label} className="stat-tile anim-pop-in min-w-0" style={{ animationDelay: POP_DELAYS[i] }}>
                    <span className={`icon-tile icon-tile-sm ${s.tile}`}><s.icon /></span>
                    <div className="stat-body min-w-0">
                      <div className="stat-value tnum whitespace-nowrap">{s.value}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="qf-card-flat p-4 flex items-start gap-3 anim-slide-up">
              <span className="icon-tile icon-tile-sm icon-tile-info"><Info /></span>
              <div className="min-w-0">
                <p className="font-bold text-[15px]">{plan.feasibility}</p>
                <p className="mt-1 text-[13px] text-muted leading-relaxed">
                  {plan.note} XP estimates assume +1 XP per focused minute.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-h-[640px] overflow-y-auto thin-scroll pr-1">
              {[...byWeek.entries()].map(([week, tasks]) => {
                const weekMinutes = tasks.reduce((n, t) => n + t.minutes, 0);
                return (
                  <div key={week} className="qf-card p-4 anim-slide-up">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <h3 className="font-extrabold tracking-tight">Week {week}</h3>
                      <span className="chip chip-accent tnum"><Clock className="h-3 w-3" /> {Math.round(weekMinutes / 60)}h planned</span>
                      <span className="chip tnum">{tasks.length} sessions</span>
                    </div>
                    <div className="space-y-2.5">
                      {groupByDay(tasks).map(([day, dayTasks]) => {
                        const dayMinutes = dayTasks.reduce((n, t) => n + t.minutes, 0);
                        const isBufferDay = dayTasks.every(t => t.kind === 'buffer');
                        const DayIcon = isBufferDay ? Coffee : (day % 7 === 6 || day % 7 === 0) ? Sun : BookOpen;
                        return (
                          <div key={day} className="qf-card-flat p-3 flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                            <span className="icon-tile icon-tile-sm icon-tile-neutral shrink-0 self-start sm:self-center"><DayIcon /></span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[15px]">Study day {day}</p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {dayTasks.map((t, ti) => {
                                  const kindCls = (KIND_STYLE[t.kind] ? 'chip ' + KIND_STYLE[t.kind] : 'chip') + ' min-w-0 max-w-full overflow-hidden';
                                  const label = t.title.length > 42 ? t.title.slice(0, 41) + '…' : t.title;
                                  const inner = (
                                    <>
                                      <span className="text-[12px] uppercase tracking-wide font-bold text-muted shrink-0">{t.kind}</span>
                                      <span className="min-w-0 truncate">{label}</span>
                                    </>
                                  );
                                  return t.ref ? (
                                    <Link key={ti} href={`/learn/${t.ref}`} className={kindCls} title={t.title}>{inner}</Link>
                                  ) : (
                                    <span key={ti} className={kindCls} title={t.title}>{inner}</span>
                                  );
                                })}
                              </div>
                            </div>
                            {/* fixed-width slot so every day's XP/minutes stack aligns */}
                            <div className="flex sm:flex-col sm:w-24 shrink-0 items-end justify-end gap-1">
                              <span className="chip chip-warning tnum"><Zap className="h-3 w-3" /> {dayMinutes} XP</span>
                              <span className="chip tnum"><Clock className="h-3 w-3" /> {dayMinutes} min</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="qf-empty anim-pop-in">
            <span className="empty-emoji" aria-hidden>🗓️</span>
            <h2 className="font-extrabold text-lg">No plan yet</h2>
            <p className="mt-1 text-[15px] text-muted max-w-md mx-auto leading-relaxed">
              Set your hours, days and pace on the left, we’ll sequence every lesson by prerequisites and fit it around your week.
            </p>
            <button onClick={generate} disabled={busy} className="btn3d mt-5">
              <Sparkles className="h-4 w-4" /> {busy ? 'Planning…' : 'Generate my first plan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
