import { redirect } from 'next/navigation';
import {
  Coins, Divide, Dumbbell, History, Lightbulb, Minus, Percent, Plus, Shuffle, Slash, Square, Target, X, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { AppShell } from '@/components/app-shell';
import { DrillTrainer } from '@/components/drill-trainer';

export const metadata = { title: 'Drills. QuantFoundry' };

const MODE_ICONS: Record<string, LucideIcon> = {
  addition: Plus,
  subtraction: Minus,
  multiplication: X,
  division: Divide,
  percentages: Percent,
  fractions: Slash,
  squares: Square,
  mixed: Shuffle,
};
const MODE_TILES = ['icon-tile-accent', 'icon-tile-info', 'icon-tile-violet', 'icon-tile-warning', 'icon-tile-gold', 'icon-tile-danger'];
const TIPS = [
  'Break numbers apart: 47 × 6 = 40×6 + 7×6.',
  'Percentages via 10% blocks: 35% = 10%×3 + 5%.',
  'Left-to-right addition beats right-to-left for speed under pressure.',
  'Stop calculating when estimation answers the question.',
];

const popDelay = (i: number) => ({ animationDelay: i * 70 + 'ms' });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// one rule for every bar: strong = accent, partial = info, weak = danger;
// near-complete widths snap to full so no hairline remainder reads as an artifact
function barFill(pct: number): { cls: string; width: number } {
  const cls = pct >= 80 ? 'prog-fill' : pct >= 60 ? 'prog-fill-info' : 'prog-fill-danger';
  const width = pct >= 97 ? 100 : Math.max(pct, 4);
  return { cls, width };
}

export default async function DrillsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/drills');

  const history = await db.drillSession.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 });

  // weak areas: aggregate accuracy per mode (same rule as the trainer)


  const byMode = new Map<string, { c: number; t: number }>();
  for (const h of history) {
    const e = byMode.get(h.mode) ?? { c: 0, t: 0 };
    e.c += h.correct;
    e.t += h.total;
    byMode.set(h.mode, e);
  }
  const weak = [...byMode.entries()]
    .filter(([, v]) => v.t >= 10 && v.c / v.t < 0.8)
    .sort((a, b) => a[1].c / a[1].t - b[1].c / b[1].t)
    .slice(0, 4);

  const sessionsLogged = history.length;
  const bestAcc = history.reduce((m, h) => Math.max(m, h.total ? h.correct / h.total : 0), 0);
  const bestAccPct = sessionsLogged ? Math.round(bestAcc * 100) : null;
  const pageSub = sessionsLogged
    ? sessionsLogged + ' sessions logged · best accuracy ' + bestAccPct + '%, accuracy and speed both count.'
    : 'Timed mental arithmetic, accuracy and speed both count. Your sessions land here.';

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
        <header className="page-hero">
          <span className="icon-tile icon-tile-warning">
            <Zap />
          </span>
          <div>
            <h1>Drills</h1>
            <p className="page-sub">{pageSub}</p>
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* left column: the trainer + session history (balanced heights) */}
          <div className="lg:col-span-2 min-w-0 space-y-6">
            <DrillTrainer
              history={history.map(h => ({
                mode: h.mode, level: h.level, correct: h.correct, total: h.total, avgMs: h.avgMs,
                createdAt: h.createdAt.toISOString(),
              }))}
            />

            {/* recent sessions, full history, comfortably wide */}
            <section className="qf-card p-5 anim-slide-up">
              <div className="section-head">
                <span className="icon-tile icon-tile-sm icon-tile-info">
                  <History />
                </span>
                <h2>Recent sessions</h2>
                <span className="chip tnum ml-auto">{sessionsLogged} logged</span>
              </div>
              {sessionsLogged === 0 ? (
                <div className="qf-empty">
                  <span className="empty-emoji">⚡</span>
                  <p className="text-sm font-black">No sessions yet</p>
                  <p className="mt-1 text-xs text-faint font-semibold">Finish a timed drill and it lands here.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                  {history.slice(0, 10).map((h, i) => {
                    const Icon = MODE_ICONS[h.mode] ?? Shuffle;
                    const tile = MODE_TILES[i % MODE_TILES.length];
                    const pct = h.total ? Math.round((h.correct / h.total) * 100) : 0;
                    const chipCls = pct >= 80 ? 'chip chip-success tnum' : pct >= 60 ? 'chip chip-warning tnum' : 'chip chip-danger tnum';
                    const bar = barFill(pct);
                    const dateLabel = h.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    return (
                      <div key={h.id} className="flex items-center gap-3 rounded-xl bg-surface-2/50 border border-border/60 px-3 py-2.5 anim-slide-up min-w-0" style={popDelay(i + 2)}>
                        <span className={'icon-tile icon-tile-sm ' + tile + ' shrink-0'}>
                          <Icon />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold truncate">{cap(h.mode)} · L{h.level}</p>
                            <span className={chipCls + ' shrink-0 ml-auto'}>{h.correct}/{h.total}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="text-xs text-muted font-semibold tnum shrink-0">{dateLabel} · {Math.round(h.avgMs)}ms</p>
                            <div className="prog-track h-1.5 flex-1 min-w-0">
                              <div className={'prog-fill ' + bar.cls} style={{ width: bar.width + '%' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* side rail, spacing aligned with the left column's section breaks */}
          <aside className="space-y-6 min-w-0">
            {/* weak areas */}
            <section className="qf-card p-5 anim-slide-up" style={popDelay(0)}>
              <div className="section-head">
                <span className="icon-tile icon-tile-sm icon-tile-warning">
                  <Target />
                </span>
                <h2>Weak areas</h2>
              </div>
              {weak.length === 0 ? (
                <div className="qf-empty !py-8">
                  <span className="icon-tile icon-tile-sm icon-tile-warning mb-2 mx-auto flex"><Dumbbell className="h-4 w-4" /></span>
                  <p className="text-sm font-black">Drill more to reveal your weak spots</p>
                  <p className="mt-1 text-xs text-faint font-semibold">After 10+ answers in a mode, accuracy tracking kicks in.</p>
                </div>
              ) : (
                <ul className="space-y-3.5">
                  {weak.map(([mode, v]) => {
                    const pct = Math.round((v.c / v.t) * 100);
                    const chipCls = pct >= 80 ? 'chip chip-success tnum' : pct >= 60 ? 'chip chip-warning tnum' : 'chip chip-danger tnum';
                    const bar = barFill(pct);
                    return (
                      <li key={mode}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-semibold text-sm">{cap(mode)}</span>
                          <span className={chipCls}>{pct}%</span>
                        </div>
                        <div className="prog-track h-2.5">
                          <div className={'prog-fill ' + bar.cls} style={{ width: bar.width + '%' }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* XP rules */}
            <section className="qf-card p-5 anim-slide-up" style={popDelay(2)}>
              <div className="section-head">
                <span className="icon-tile icon-tile-sm icon-tile-gold">
                  <Coins />
                </span>
                <h2>How drill XP works</h2>
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border-2 border-warning/30 bg-warning-soft/60 p-3.5">
                <span className="chip chip-warning shrink-0">
                  <Zap className="h-3.5 w-3.5" />
                  XP
                </span>
                <p className="text-sm font-black leading-snug">+5 XP per session · +2 per correct · daily cap 15</p>
              </div>
              <p className="mt-3 text-xs text-muted font-semibold leading-relaxed">
                Every saved session counts toward your daily goal and level, short consistent reps beat marathon cramming.
              </p>
            </section>

            {/* training tips (kept from the trainer) */}
            <section className="qf-card p-5 anim-slide-up" style={popDelay(3)}>
              <div className="section-head">
                <span className="icon-tile icon-tile-sm icon-tile-accent">
                  <Lightbulb />
                </span>
                <h2>Training tips</h2>
              </div>
              <ul className="space-y-2">
                {TIPS.map((t, i) => (
                  <li key={t} className="flex items-start gap-2.5 rounded-xl bg-surface-2/50 border border-border/60 px-3 py-2">
                    <span className={'icon-tile icon-tile-sm !h-6 !w-6 !rounded-lg shrink-0 ' + MODE_TILES[i % MODE_TILES.length]}>
                      <Lightbulb className="!h-3.5 !w-3.5" />
                    </span>
                    <span className="text-xs text-muted font-semibold leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
