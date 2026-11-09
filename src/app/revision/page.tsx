import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight, BookOpen, ChevronRight, CircleCheck, Clock, Code2, Flame, Layers, Lightbulb, Repeat, Sigma, TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getCurriculumGraph } from '@/lib/content';
import { AppShell } from '@/components/app-shell';
import { RevisionSession, type DueCard } from '@/components/revision-session';

export const metadata = { title: 'Revision — QuantFoundry' };

const TYPE_META: Record<string, { Icon: LucideIcon; tile: string; fill: string }> = {
  concept: { Icon: BookOpen, tile: 'icon-tile-accent', fill: '' },
  code: { Icon: Code2, tile: 'icon-tile-info', fill: 'prog-fill-info' },
  formula: { Icon: Sigma, tile: 'icon-tile-violet', fill: 'prog-fill-violet' },
};
const FALLBACK_TYPE = { Icon: Layers, tile: 'icon-tile-warning', fill: 'prog-fill-gold' };

const popDelay = (i: number) => ({ animationDelay: i * 70 + 'ms' });
const slideDelay = (i: number) => ({ animationDelay: i * 90 + 'ms' });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function formatDue(d: Date): string {
  const days = Math.ceil((d.getTime() - Date.now()) / 86400_000);
  if (days <= 1) return 'Tomorrow';
  if (days < 7) return 'In ' + days + 'd';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default async function RevisionPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/revision');

  const graph = getCurriculumGraph();
  const now = new Date();
  const [dueCards, allCards] = await Promise.all([
    db.cardState.findMany({ where: { userId: user.id, dueAt: { lte: now } }, orderBy: { dueAt: 'asc' }, take: 40 }),
    db.cardState.findMany({ where: { userId: user.id } }),
  ]);

  const cards: DueCard[] = dueCards.map(c => ({
    cardKey: c.cardKey, front: c.front, back: c.back, cardType: c.cardType, source: c.source,
    intervalDays: c.intervalDays, repetitions: c.repetitions, lapses: c.lapses,
  }));

  const upcoming = allCards
    .filter(c => c.dueAt > now)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 8);

  const byType = allCards.reduce<Record<string, number>>((m, c) => {
    m[c.cardType] = (m[c.cardType] ?? 0) + 1;
    return m;
  }, {});

  const avgInterval = Math.round(allCards.reduce((n, c) => n + c.intervalDays, 0) / Math.max(allCards.length, 1)) + 'd';

  // review streak: consecutive days (today, with yesterday grace) containing at least one review
  const reviewDays = new Set<string>();
  for (const c of allCards) {
    if (c.lastReviewedAt) reviewDays.add(c.lastReviewedAt.toISOString().slice(0, 10));
  }
  const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);
  let streakCursor = Date.now();
  if (!reviewDays.has(dayKey(streakCursor))) streakCursor -= 86400_000;
  let reviewStreak = 0;
  while (reviewDays.has(dayKey(streakCursor))) {
    reviewStreak++;
    streakCursor -= 86400_000;
  }

  // retention: share of reviewed cards that never lapsed
  const reviewedCards = allCards.filter(c => c.lastReviewedAt);
  const retentionPct = reviewedCards.length
    ? Math.max(0, Math.round(((reviewedCards.length - allCards.filter(c => c.lapses > 0).length) / reviewedCards.length) * 100))
    : null;

  const pageSub = cards.length
    ? cards.length + ' cards due right now — small sessions, big memory gains.'
    : 'Nothing due right now — new cards appear as you complete lessons.';

  const typeRows = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => {
      const meta = TYPE_META[t] ?? FALLBACK_TYPE;
      return { type: t, n, Icon: meta.Icon, tile: meta.tile, fill: meta.fill };
    });

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
        <header className="page-hero">
          <span className="icon-tile icon-tile-violet">
            <Repeat />
          </span>
          <div>
            <h1>Revision</h1>
            <p className="page-sub">{pageSub}</p>
          </div>
        </header>

        {/* due hero */}
        {cards.length > 0 ? (
          <div className="qf-card p-6 text-center relative overflow-hidden anim-pop-in">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-violet-soft anim-float-slow" aria-hidden />
            <div className="relative">
              <div className="text-6xl font-black leading-none">{cards.length}</div>
              <p className="mt-1.5 text-sm font-bold text-muted">cards due</p>
              <Link href="#review" className="btn3d btn3d-lg mt-5">
                Start review
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-3 text-xs text-faint font-semibold">Reveal, recall, grade honestly — the SM-2 scheduler handles the spacing.</p>
            </div>
          </div>
        ) : (
          <div className="qf-empty anim-pop-in">
            <span className="empty-emoji text-6xl">🎉</span>
            <p className="mt-2 text-lg font-black">Nothing due — you're all caught up!</p>
            {allCards.length === 0 && (
              <>
                <p className="mt-1 text-xs text-faint font-semibold">Complete your first lesson to start building the deck.</p>
                <Link href="/curriculum" className="btn3d btn3d-sm mt-4">
                  Open the curriculum
                </Link>
              </>
            )}
          </div>
        )}

        {/* stat row */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          <div className="stat-tile anim-pop-in flex flex-col" style={popDelay(0)}>
            <span className="icon-tile-sm icon-tile-danger">
              <TriangleAlert />
            </span>
            <div className="stat-value font-black mt-3">{cards.length}</div>
            <div className="stat-label mt-1">Due now</div>
          </div>
          <div className="stat-tile anim-pop-in flex flex-col" style={popDelay(1)}>
            <span className="icon-tile-sm icon-tile-violet">
              <Layers />
            </span>
            <div className="stat-value font-black mt-3">{allCards.length}</div>
            <div className="stat-label mt-1">Total cards</div>
          </div>
          <div className="stat-tile anim-pop-in flex flex-col" style={popDelay(2)}>
            <span className="icon-tile-sm icon-tile-gold">
              <Flame />
            </span>
            <div className="stat-value font-black mt-3">{reviewStreak}d</div>
            <div className="stat-label mt-1">Review streak</div>
          </div>
          <div className="stat-tile anim-pop-in flex flex-col" style={popDelay(3)}>
            <span className="icon-tile-sm icon-tile-accent">
              <CircleCheck />
            </span>
            <div className="stat-value font-black mt-3">{retentionPct === null ? '—' : retentionPct + '%'}</div>
            <div className="stat-label mt-1">Retention</div>
          </div>
        </div>

        {/* live session */}
        {cards.length > 0 && (
          <div id="review" className="mt-8 scroll-mt-6">
            <RevisionSession cards={cards} />
          </div>
        )}

        {/* deck + queue */}
        <div className="mt-8 grid md:grid-cols-2 gap-4 items-start">
          <section className="qf-card p-5 anim-slide-up" style={slideDelay(0)}>
            <div className="section-head">
              <span className="icon-tile-sm icon-tile-violet">
                <Layers />
              </span>
              <h2>Deck composition</h2>
              <span className="chip tnum ml-auto">avg interval {avgInterval}</span>
            </div>
            {allCards.length === 0 ? (
              <div className="qf-empty">
                <span className="empty-emoji">🗂️</span>
                <p className="text-sm font-black">Empty — no cards yet</p>
              </div>
            ) : (
              <ul className="space-y-3.5">
                {typeRows.map(t => {
                  const pct = Math.round((t.n / allCards.length) * 100);
                  const Icon = t.Icon;
                  return (
                    <li key={t.type}>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className={'icon-tile-sm ' + t.tile}>
                          <Icon />
                        </span>
                        <span className="flex-1 min-w-0 text-sm font-semibold capitalize truncate">{cap(t.type.replace(/-/g, ' '))}</span>
                        <span className="chip tnum">{t.n}</span>
                        <span className="chip chip-accent tnum">{pct}%</span>
                      </div>
                      <div className="prog-track h-2.5">
                        <div className={'prog-fill ' + t.fill} style={{ width: Math.max(pct, 2) + '%' }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="qf-card p-5 anim-slide-up" style={slideDelay(1)}>
            <div className="section-head">
              <span className="icon-tile-sm icon-tile-info">
                <Clock />
              </span>
              <h2>Next up</h2>
              <span className="chip ml-auto">scheduled</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="qf-empty">
                <span className="empty-emoji">🌙</span>
                <p className="text-sm font-black">Nothing scheduled ahead</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((c, i) => (
                  <li key={c.id} className="row-card anim-slide-up" style={slideDelay(i + 2)}>
                    <p className="flex-1 min-w-0 text-sm font-semibold leading-snug line-clamp-2">{c.front.replace(/\$/g, '')}</p>
                    <span className="chip shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDue(c.dueAt)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-faint shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* how revision works / weak lessons pointer */}
        <div className="mt-6 qf-card p-4 flex items-start gap-3.5 flex-wrap anim-slide-up">
          <span className="icon-tile-sm icon-tile-warning shrink-0">
            <Lightbulb />
          </span>
          <div className="flex-1 min-w-[240px] text-sm font-semibold text-muted leading-relaxed">
            <p>Lessons marked “needs revision” also benefit from a direct re-read plus their exercises.</p>
            <p className="mt-1 text-xs text-faint">Reviewing a lesson card successfully after it was due is what upgrades a passed lesson to mastered.</p>
          </div>
          <Link href="/curriculum" className="btn3d btn3d-ghost btn3d-sm shrink-0">
            Find them in the curriculum
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
