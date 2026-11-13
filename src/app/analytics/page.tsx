import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BarChart3, BookOpenCheck, CircleCheck, CircleDashed, Code2, Divide, Equal, Flame, History, Infinity as InfinityIcon,
  Pi, Percent, Repeat, Sigma, Target, Timer, TriangleAlert, Trophy, Variable, Zap, Braces,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getCurriculumGraph, getRegistry } from '@/lib/content';
import { AppShell } from '@/components/app-shell';

export const metadata = { title: 'Analytics. QuantFoundry' };

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SKILL_ICONS: LucideIcon[] = [Sigma, Percent, Divide, Pi, Variable, InfinityIcon, Braces, Equal];

const popDelay = (i: number) => ({ animationDelay: i * 60 + 'ms' });
const slideDelay = (i: number) => ({ animationDelay: i * 90 + 'ms' });

function weekdayLetter(day: string): string {
  const d = new Date(day + 'T00:00:00Z');
  return WEEKDAY_LETTERS[d.getUTCDay()] ?? '';
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/analytics');

  const graph = getCurriculumGraph();
  const reg = getRegistry();
  const publishedIds = new Set(reg.lessons.map(l => l.id));

  const [progressRows, attempts, drills, reviews, sessions, cards] = await Promise.all([
    db.lessonProgress.findMany({ where: { userId: user.id } }),
    db.problemAttempt.findMany({ where: { userId: user.id } }),
    db.drillSession.findMany({ where: { userId: user.id } }),
    db.cardState.findMany({ where: { userId: user.id } }),
    db.learningSession.findMany({ where: { userId: user.id } }),
    db.cardState.findMany({ where: { userId: user.id } }),
  ]);

  // ---- study hours per day (last 14 days) ----


  const days: { day: string; minutes: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    const mins = Math.round(sessions.filter(s => s.day === d).reduce((n, s) => n + s.seconds, 0) / 60);
    days.push({ day: d, minutes: mins });
  }
  const maxMinutes = Math.max(...days.map(d => d.minutes), 30);
  const hasStudyData = days.some(d => d.minutes > 0);
  const bestMinutes = days.reduce((m, d) => Math.max(m, d.minutes), 0);

  // day streak from the 14-day window (today, with yesterday grace)


  const minsByDay = new Map(days.map(d => [d.day, d.minutes]));
  const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);
  let streakCursor = Date.now();
  if ((minsByDay.get(dayKey(streakCursor)) ?? 0) === 0) streakCursor -= 86400_000;
  let streakDays = 0;
  while ((minsByDay.get(dayKey(streakCursor)) ?? 0) > 0) {
    streakDays++;
    streakCursor -= 86400_000;
  }

  // ---- mastery by skill ----


  const skillData: Record<string, { passed: number; total: number }> = {};
  for (const id of publishedIds) {
    const node = graph.byId.get(id);
    if (!node) continue;
    for (const s of node.skills) {
      skillData[s] = skillData[s] ?? { passed: 0, total: 0 };
      skillData[s].total++;
    }
  }
  for (const p of progressRows) {
    if (!['passed', 'mastered'].includes(p.status)) continue;
    const node = graph.byId.get(p.lessonId);
    if (!node) continue;
    for (const s of node.skills) skillData[s] = skillData[s] ?? { passed: 0, total: 0 };
    for (const s of node.skills ?? []) skillData[s].passed++;
  }
  const topSkills = Object.entries(skillData)
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => b[1].passed / b[1].total - a[1].passed / a[1].total);
  const weakest = [...topSkills].filter(([, v]) => v.passed < v.total).slice(-8).reverse();
  const skillTotals = {
    tracked: Object.keys(skillData).length,
    mastered: Object.values(skillData).filter(v => v.total > 0 && v.passed === v.total).length,
  };

  // ---- problem accuracy ----


  const submissions = attempts.length;
  const accepted = attempts.filter(a => a.status === 'passed').length;
  const uniqueSolved = new Set(attempts.filter(a => a.status === 'passed').map(a => a.problemSlug)).size;

  // ---- drills ----


  const drillStats = drills.reduce(
    (acc, d) => ({ correct: acc.correct + d.correct, total: acc.total + d.total, ms: acc.ms + d.avgMs, n: acc.n + 1 }),
    { correct: 0, total: 0, ms: 0, n: 0 }
  );

  // ---- revision consistency (reviews by week) ----


  const now = Date.now();
  const reviewWeeks = [0, 1, 2, 3].map(w => {
    const start = new Date(now - (w + 1) * 7 * 86400_000);
    const end = new Date(now - w * 7 * 86400_000);
    const n = reviews.filter(c => c.lastReviewedAt && c.lastReviewedAt >= start && c.lastReviewedAt < end).length;
    return { week: w === 0 ? 'this week' : w + 'w ago', n };
  });
  const maxWeekReviews = Math.max(...reviewWeeks.map(w => w.n), 1);

  const bottlenecks: string[] = [];
  const needsRev = progressRows.filter(p => p.status === 'needs_revision');
  if (needsRev.length > 0) bottlenecks.push(`${needsRev.length} lesson(s) marked needs-revision, retake their knowledge checks after re-reading.`);
  const lapsed = cards.filter(c => c.lapses >= 2).length;
  if (lapsed > 0) bottlenecks.push(`${lapsed} card(s) lapsed twice or more, these concepts need a deeper re-read, not another repetition.`);
  if (drillStats.n >= 3 && drillStats.correct / Math.max(drillStats.total, 1) < 0.75) bottlenecks.push('Mental-math accuracy below 75%, drill percentages and multiplication before assessments.');
  const stalePassed = progressRows.filter(p => ['passed', 'mastered'].includes(p.status) && p.retrievalDone === false);
  if (stalePassed.length > 0) bottlenecks.push(`${stalePassed.length} passed lesson(s) not yet retrieval-verified, a cumulative assessment or their revision cards will confirm mastery.`);
  if (bottlenecks.length === 0) bottlenecks.push('No bottlenecks detected from your data so far, keep the streak going.');

  const totalMinutes = Math.round(sessions.reduce((n, s) => n + s.seconds, 0) / 60);
  const studyTimeValue = Math.floor(totalMinutes / 60) + 'h ' + (totalMinutes % 60) + 'm';
  const lessonsValue =
    progressRows.filter(p => p.status === 'passed').length + ' / ' + progressRows.filter(p => p.status === 'mastered').length;
  const drillPctValue = drillStats.total ? Math.round((drillStats.correct / drillStats.total) * 100) + '%' : 'None yet';
  const drillMsChip = drillStats.n ? Math.round(drillStats.ms / drillStats.n) + 'ms avg' : null;

  // canonical horizontal tiles: one hero hue (accent), one secondary (info), neutrals for the rest;
  // every tile gets the identical value/label/sub pattern, semantic color stays out of the labels
  const tiles: { icon: LucideIcon; tile: string; value: string; label: string; sub: string }[] = [
    { icon: Timer, tile: totalMinutes > 0 ? 'icon-tile-accent' : 'icon-tile-neutral', value: studyTimeValue, label: 'Study time (all)', sub: totalMinutes + ' minutes' },
    { icon: Flame, tile: streakDays > 0 ? 'icon-tile-info' : 'icon-tile-neutral', value: String(streakDays), label: 'Day streak (14d)', sub: 'keep it alive' },
    { icon: BookOpenCheck, tile: 'icon-tile-neutral', value: lessonsValue, label: 'Lessons passed / mastered', sub: 'across all phases' },
    { icon: Code2, tile: 'icon-tile-neutral', value: String(uniqueSolved), label: 'Problems solved', sub: accepted + '/' + submissions + ' accepted' },
    { icon: Zap, tile: 'icon-tile-neutral', value: drillPctValue, label: 'Drill accuracy', sub: drillMsChip ?? 'no drills yet' },
    { icon: Trophy, tile: 'icon-tile-neutral', value: bestMinutes + 'm', label: 'Best day (14d)', sub: 'beat it today' },
  ];

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
        <header className="page-hero">
          <span className="icon-tile icon-tile-info">
            <BarChart3 />
          </span>
          <div>
            <h1>Analytics</h1>
            <p className="page-sub">Your learning data at a glance</p>
          </div>
          <span className="chip chip-info ml-auto hidden sm:inline-flex">no vanity metrics</span>
        </header>

        {/* stat row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {tiles.map((t, i) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="stat-tile anim-pop-in min-w-0" style={popDelay(i)}>
                <span className={'icon-tile icon-tile-sm ' + t.tile}>
                  <Icon />
                </span>
                <div className="stat-body min-w-0">
                  <div className="stat-value !text-xl tnum whitespace-nowrap">{t.value}</div>
                  <div className="stat-label">{t.label}</div>
                  <div className="stat-sub truncate">{t.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* study time bar chart */}
        <section className="mt-8 qf-card p-5 anim-slide-up" style={slideDelay(0)}>
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-info">
              <History />
            </span>
            <h2>Study time, last 14 days</h2>
            <span className="chip chip-accent tnum ml-auto">total {totalMinutes}m</span>
          </div>
          {hasStudyData ? (
            <div>
              {/* every column gets the same fixed label slot, bars sit on a shared baseline,
                  zero days render as a short stub instead of a floating dot */}
              <div
                className="h-44 flex items-stretch gap-1.5"
                role="img"
                aria-label="Study minutes per day over the last 14 days"
              >
                {days.map(d => {
                  const pct = (d.minutes / maxMinutes) * 100;
                  return (
                    <div key={d.day} className="flex-1 min-w-0 flex flex-col" title={d.day + ': ' + d.minutes + ' min'}>
                      <span className="h-4 flex items-end justify-center text-[12px] font-black tnum leading-none text-muted">
                        {d.minutes > 0 ? d.minutes + 'm' : ''}
                      </span>
                      <div className="flex-1 w-full flex items-end justify-center">
                        {d.minutes > 0
                          ? <div className="w-full rounded-t-lg bg-accent hover:brightness-110 hover:scale-x-110 transition-all" style={{ height: Math.max(6, pct) + '%' }} />
                          : <div className="w-full h-1.5 rounded-full bg-surface-3" aria-label="rest day" />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t-2 border-border" aria-hidden />
              <div className="mt-1.5 flex gap-1.5">
                {days.map(d => (
                  <span key={d.day} className="flex-1 min-w-0 text-center text-[12px] font-bold text-muted leading-none">{weekdayLetter(d.day)}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="qf-empty">
              <span className="empty-emoji">📊</span>
              <p className="text-[15px] font-black">Complete lessons to see your study time</p>
              <p className="mt-1 text-[13px] text-faint font-semibold">Every session you run will chart here, day by day.</p>
              <Link href="/curriculum" className="btn3d btn3d-sm mt-4">
                Go to lessons
              </Link>
            </div>
          )}
        </section>

        {/* skills */}
        <div className="mt-6 grid md:grid-cols-2 gap-6 items-start">
          <section className="qf-card p-5 anim-slide-up" style={slideDelay(1)}>
            <div className="section-head">
              <span className="icon-tile icon-tile-sm icon-tile-accent">
                <Sigma />
              </span>
              <h2>Strongest skills</h2>
              <span className="chip ml-auto">by passed lessons</span>
            </div>
            <ul className="space-y-3.5">
              {topSkills.slice(0, 8).map(([s, v], i) => (
                <SkillBar key={s} skill={s} passed={v.passed} total={v.total} idx={i} />
              ))}
              {topSkills.length === 0 && (
                <li className="qf-empty">
                  <span className="empty-emoji">🧠</span>
                  <p className="text-[15px] font-black">Complete lessons to populate skill mastery</p>
                </li>
              )}
            </ul>
            {topSkills.length > 0 && (
              <p className="mt-4 pt-3.5 border-t-2 border-border text-[13px] font-bold text-muted flex items-center justify-between">
                <span>{skillTotals.tracked} skills tracked · {skillTotals.mastered} fully mastered</span>
                <Link href="/curriculum" className="text-info hover:underline">grow them →</Link>
              </p>
            )}
          </section>

          <section className="qf-card p-5 anim-slide-up" style={slideDelay(2)}>
            <div className="section-head">
              <span className="icon-tile icon-tile-sm icon-tile-warning">
                <TriangleAlert />
              </span>
              <h2>Weakest skills</h2>
              <span className="chip ml-auto">bottlenecks</span>
            </div>
            {weakest.length === 0 ? (
              <div className="qf-empty">
                <span className="icon-tile icon-tile-accent mb-1"><CircleCheck className="h-7 w-7" /></span>
                <p className="text-[15px] font-black">No weak spots detected</p>
                <p className="mt-1 text-[13px] text-faint font-semibold">Master every lesson you start and this panel stays quiet.</p>
              </div>
            ) : (() => {
              // group by status: rows with real progress stay individual, dormant ones collapse into one summary
              const started = weakest.filter(([, v]) => v.passed > 0);
              const dormant = weakest.filter(([, v]) => v.passed === 0);
              return (
                <div>
                  {started.length > 0 && (
                    <ul className="space-y-3">
                      {started.map(([s, v], i) => {
                        const name = s.replace(/-/g, ' ');
                        const pct = v.total ? Math.round((v.passed / v.total) * 100) : 0;
                        return (
                          <li key={s} className="flex items-center gap-3 anim-slide-up" style={slideDelay(i)}>
                            <span className="icon-tile icon-tile-sm icon-tile-warning shrink-0">
                              <TriangleAlert className="h-4 w-4" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[15px] font-bold capitalize truncate">{name}</span>
                                <span className="chip tnum shrink-0">{v.passed}/{v.total}</span>
                              </div>
                              <div className="prog-track h-2.5">
                                <div className={pct >= 70 ? 'prog-fill' : 'prog-fill-info'} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {dormant.length > 0 && (
                    <div className={(started.length > 0 ? 'mt-3 ' : '') + 'rounded-xl bg-surface-2/50 border border-border/60 px-3.5 py-3'}>
                      <div className="flex items-center gap-3">
                        <span className="icon-tile icon-tile-sm icon-tile-neutral shrink-0">
                          <CircleDashed className="h-4 w-4" />
                        </span>
                        <p className="flex-1 min-w-0 text-[15px] font-semibold text-muted leading-relaxed">
                          <span className="font-black text-foreground tnum">{dormant.length}</span> skill{dormant.length === 1 ? '' : 's'} not started yet, begin any lesson to seed them.
                        </p>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {dormant.map(([s]) => (
                          <span key={s} className="chip capitalize">{s.replace(/-/g, ' ')}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </section>
        </div>

        {/* revision + bottlenecks */}
        <div className="mt-6 grid md:grid-cols-2 gap-6 items-stretch">
          <section className="qf-card p-5 anim-slide-up" style={slideDelay(3)}>
            <div className="section-head">
              <span className="icon-tile icon-tile-sm icon-tile-violet">
                <Repeat />
              </span>
              <h2>Revision consistency</h2>
              <span className="chip ml-auto">last 4 weeks</span>
            </div>
            <ul className="space-y-3.5">
              {reviewWeeks.map(w => {
                const pct = Math.round((w.n / maxWeekReviews) * 100);
                return (
                  <li key={w.week}>
                    <div className="flex items-center justify-between text-[15px] mb-1.5">
                      <span className="font-semibold text-muted">{w.week}</span>
                      <span className="tnum text-[13px] font-black">{w.n} card{w.n === 1 ? '' : 's'} reviewed</span>
                    </div>
                    <div className="prog-track h-2.5">
                      <div className="prog-fill" style={{ width: Math.max(pct, 2) + '%' }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="qf-card p-5 anim-slide-up flex flex-col" style={slideDelay(4)}>
            <div className="section-head">
              <span className="icon-tile icon-tile-sm icon-tile-info">
                <Target />
              </span>
              <h2>Bottleneck analysis</h2>
            </div>
            {/* the signals that feed the analysis, from data already computed above */}
            <dl className="grid grid-cols-2 gap-2">
              {[
                { k: 'Needs revision', v: String(needsRev.length) },
                { k: 'Lapsed cards', v: String(lapsed) },
                { k: 'Unverified passes', v: String(stalePassed.length) },
                { k: 'Drill accuracy', v: drillStats.total ? Math.round((drillStats.correct / drillStats.total) * 100) + '%' : 'None yet' },
              ].map(r => (
                <div key={r.k} className="rounded-xl bg-surface-2/50 border border-border/60 px-3 py-2 flex items-baseline justify-between gap-2">
                  <dt className="text-[13px] font-bold text-muted">{r.k}</dt>
                  <dd className="text-[15px] font-black tnum">{r.v}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-3 space-y-2.5 flex-1">
              {bottlenecks.map((b, i) => {
                const isClean = b.startsWith('No bottlenecks');
                return (
                  <li key={i} className="flex items-start gap-2.5 text-[15px] rounded-xl bg-surface-2/50 border border-border/60 px-3 py-2.5">
                    {isClean ? (
                      <CircleCheck className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                    ) : (
                      <TriangleAlert className="h-4 w-4 mt-0.5 text-warning shrink-0" />
                    )}
                    <span className="text-muted font-semibold leading-relaxed">{b}</span>
                  </li>
                );
              })}
            </ul>
            <Link href="/revision" className="btn3d btn3d-sm btn3d-ghost mt-4 self-start">
              <Repeat className="h-3.5 w-3.5" /> Clear them in revision
            </Link>
          </section>
        </div>

        {/* closing CTA, keep the momentum */}
        <div className="mt-8 qf-card p-4 flex items-center gap-3.5 flex-wrap anim-slide-up">
          <span className="icon-tile icon-tile-sm icon-tile-accent shrink-0">
            <Flame />
          </span>
          <p className="flex-1 min-w-[220px] text-[15px] font-semibold text-muted">
            {streakDays > 0
              ? `You are on a ${streakDays}-day streak, one lesson today keeps it alive.`
              : 'Start a new streak today, one focused lesson is enough.'}
          </p>
          <Link href="/dashboard" className="btn3d btn3d-sm shrink-0">
            Continue learning
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function SkillBar({ skill, passed, total, idx }: { skill: string; passed: number; total: number; idx: number }) {
  const pct = Math.round((passed / total) * 100);
  // one rule for every bar: strong = accent fill, partial = info fill; labels stay neutral ghost chips
  const fillCls = pct >= 70 ? 'prog-fill' : 'prog-fill-info';
  const Icon = SKILL_ICONS[idx % SKILL_ICONS.length];
  const label = skill.replace(/-/g, ' ');
  if (passed === 0) {
    // zero progress: neutral tile, honest text, no dead 0% bar
    return (
      <li className="flex items-center gap-3">
        <span className="icon-tile icon-tile-sm icon-tile-neutral">
          <Icon />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="capitalize font-semibold text-[15px] truncate">{label}</span>
            <span className="chip tnum">not started</span>
          </div>
        </div>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-3">
      <span className="icon-tile icon-tile-sm icon-tile-accent">
        <Icon />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="capitalize font-semibold text-[15px] truncate">{label}</span>
          <span className="chip tnum">{pct}%</span>
        </div>
        <div className="prog-track h-2.5">
          <div className={fillCls} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </li>
  );
}
