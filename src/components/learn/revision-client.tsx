'use client';

/**
 * v3 revision centre: due cards come from the local SM-2 store, card content
 * resolves from lesson packs, grading runs locally (recordReviews), and the
 * sync engine carries reviews to the server in the background.
 */

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight, BookOpen, ChevronRight, CircleCheck, Clock, Code2, Flame, Layers, Lightbulb, Repeat, Sigma, TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getLessonPack } from '@/lib/client/packs';
import { getState, subscribe, hydrate, recordReviews, deleteCard } from '@/lib/client/local-state';
import { RevisionSession, type DueCard } from '@/components/revision-session';
import { Mascot } from '@/components/brand/mascot';
import { ClosingCta } from '@/components/ui/page-kit';

const TYPE_META: Record<string, { Icon: LucideIcon; tile: string; fill: string }> = {
  concept: { Icon: BookOpen, tile: 'icon-tile-accent', fill: '' },
  code: { Icon: Code2, tile: 'icon-tile-info', fill: 'prog-fill-info' },
  formula: { Icon: Sigma, tile: 'icon-tile-violet', fill: 'prog-fill-violet' },
};
const FALLBACK_TYPE = { Icon: Layers, tile: 'icon-tile-warning', fill: 'prog-fill-gold' };

const popDelay = (i: number) => ({ animationDelay: i * 70 + 'ms' });
const slideDelay = (i: number) => ({ animationDelay: i * 90 + 'ms' });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function formatDue(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400_000);
  if (days <= 1) return 'Tomorrow';
  if (days < 7) return 'In ' + days + 'd';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** cardKey is "<lessonId>:<idx>"; resolve front/back/type from the lesson pack. */
async function resolveCards(keys: string[]): Promise<DueCard[]> {
  const byLesson = new Map<string, string[]>();
  for (const k of keys) {
    const lessonId = k.includes(':') ? k.slice(0, k.lastIndexOf(':')) : '';
    if (!lessonId) continue;
    if (!byLesson.has(lessonId)) byLesson.set(lessonId, []);
    byLesson.get(lessonId)!.push(k);
  }
  const out: DueCard[] = [];
  await Promise.all([...byLesson.entries()].map(async ([lessonId, lessonKeys]) => {
    try {
      const lesson = await getLessonPack(lessonId);
      for (const k of lessonKeys) {
        const idx = Number(k.slice(lessonId.length + 1));
        const fc = lesson.flashcards[idx];
        if (!fc) continue;
        out.push({
          cardKey: k, front: fc.front, back: fc.back, cardType: fc.type, source: 'lesson',
          intervalDays: 0, repetitions: 0, lapses: 0,
        });
      }
    } catch {
      /* lesson pack unavailable: skip */
    }
  }));
  return out;
}

export function RevisionClient() {
  const [ready, setReady] = React.useState(false);
  const [dueCards, setDueCards] = React.useState<DueCard[]>([]);
  const [upcomingTitles, setUpcomingTitles] = React.useState<Record<string, string>>({});
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    void hydrate();
    const refresh = () => {
      const s = getState();
      const now = Date.now();
      const keys = Object.entries(s.cards)
        .filter(([, c]) => new Date(c.dueAt).getTime() <= now)
        .sort((a, b) => new Date(a[1].dueAt).getTime() - new Date(b[1].dueAt).getTime())
        .slice(0, 40)
        .map(([k]) => k);
      void resolveCards(keys).then(cards => { if (alive) { setDueCards(cards); setReady(true); } });
    };
    refresh();
    const unsub = subscribe(() => { setTick(t => t + 1); refresh(); });
    return () => { alive = false; unsub(); };
  }, []);

  // resolve human titles for the next-up list (falls back to a prettified slug)
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const s = getState();
      const now = Date.now();
      const keys = Object.entries(s.cards)
        .filter(([, c]) => new Date(c.dueAt).getTime() > now)
        .sort((a, b) => new Date(a[1].dueAt).getTime() - new Date(b[1].dueAt).getTime())
        .slice(0, 8)
        .map(([k]) => k);
      const titles: Record<string, string> = {};
      await Promise.all([...new Set(keys.map(k => k.slice(0, k.lastIndexOf(':'))))].map(async lessonId => {
        try {
          const lesson = await getLessonPack(lessonId);
          titles[lessonId] = lesson.title;
        } catch { /* keep slug fallback */ }
      }));
      if (alive && Object.keys(titles).length) setUpcomingTitles(titles);
    })();
    return () => { alive = false; };
  }, []);

  const prettyKey = (key: string): string => {
    const lessonId = key.slice(0, key.lastIndexOf(':'));
    if (upcomingTitles[lessonId]) return upcomingTitles[lessonId];
    return cap(lessonId.replace(/-/g, ' '));
  };

  const s = getState();
  const allCards = Object.entries(s.cards);
  const now = Date.now();
  const upcoming = allCards
    .filter(([, c]) => new Date(c.dueAt).getTime() > now)
    .sort((a, b) => new Date(a[1].dueAt).getTime() - new Date(b[1].dueAt).getTime())
    .slice(0, 8);
  const dueCount = allCards.filter(([, c]) => new Date(c.dueAt).getTime() <= now).length;

  const byType: Record<string, number> = {};
  for (const [, c] of allCards) byType['concept'] = (byType['concept'] ?? 0) + 1;
  // richer types when the front can be sniffed from packs later; concept is the safe default
  const avgInterval = Math.round(allCards.reduce((n, [, c]) => n + c.intervalDays, 0) / Math.max(allCards.length, 1)) + 'd';

  // review streak from updatedAt days
  const reviewDays = new Set<string>();
  for (const [, c] of allCards) {
    if (c.repetitions > 0) reviewDays.add(c.updatedAt.slice(0, 10));
  }
  const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);
  let streakCursor = Date.now();
  if (!reviewDays.has(dayKey(streakCursor))) streakCursor -= 86400_000;
  let reviewStreak = 0;
  while (reviewDays.has(dayKey(streakCursor))) {
    reviewStreak++;
    streakCursor -= 86400_000;
  }

  const reviewedCards = allCards.filter(([, c]) => c.repetitions > 0);
  const retentionPct = reviewedCards.length
    ? Math.max(0, Math.round(((reviewedCards.length - allCards.filter(([, c]) => c.lapses > 0).length) / reviewedCards.length) * 100))
    : null;

  const pageSub = dueCards.length
    ? dueCards.length + ' cards due right now, small sessions, big memory gains.'
    : 'Nothing due right now, new cards appear as you complete lessons.';

  const typeRows = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => {
      const meta = TYPE_META[t] ?? FALLBACK_TYPE;
      return { type: t, n, Icon: meta.Icon, tile: meta.tile, fill: meta.fill };
    });

  return (
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
      {dueCards.length > 0 ? (
        <div className="qf-card p-6 text-center relative overflow-hidden anim-pop-in">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-violet-soft anim-float-slow" aria-hidden />
          <div className="relative">
            <div className="text-6xl font-black leading-none">{dueCards.length}</div>
            <p className="mt-1.5 text-sm font-bold text-muted">cards due</p>
            <Link href="#review" className="btn3d btn3d-lg mt-5">
              Start review
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-xs text-faint font-semibold">Reveal, recall, grade honestly, the SM-2 scheduler handles the spacing.</p>
          </div>
        </div>
      ) : (
        <div className="qf-empty anim-pop-in">
          <Mascot pose="sleep" size={88} />
          <p className="mt-2 text-lg font-black">Nothing due, you&apos;re all caught up!</p>
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
          <span className="icon-tile-sm icon-tile-danger"><TriangleAlert /></span>
          <div className="stat-value font-black mt-3">{dueCount}</div>
          <div className="stat-label mt-1">Due now</div>
        </div>
        <div className="stat-tile anim-pop-in flex flex-col" style={popDelay(1)}>
          <span className="icon-tile-sm icon-tile-violet"><Layers /></span>
          <div className="stat-value font-black mt-3">{allCards.length}</div>
          <div className="stat-label mt-1">Total cards</div>
        </div>
        <div className="stat-tile anim-pop-in flex flex-col" style={popDelay(2)}>
          <span className="icon-tile-sm icon-tile-gold"><Flame /></span>
          <div className="stat-value font-black mt-3">{reviewStreak}d</div>
          <div className="stat-label mt-1">Review streak</div>
        </div>
        <div className="stat-tile anim-pop-in flex flex-col" style={popDelay(3)}>
          <span className="icon-tile-sm icon-tile-accent"><CircleCheck /></span>
          <div className="stat-value font-black mt-3">{retentionPct === null ? <span className="chip">Not enough reviews</span> : retentionPct + '%'}</div>
          <div className="stat-label mt-1">Retention</div>
        </div>
      </div>

      {/* live session */}
      {dueCards.length > 0 && (
        <div id="review" className="mt-8 scroll-mt-6">
          <RevisionSession cards={dueCards} />
        </div>
      )}

      {/* deck + queue */}
      <div className="mt-8 grid md:grid-cols-2 gap-4 items-start">
        <section className="qf-card p-5 anim-slide-up" style={slideDelay(0)}>
          <div className="section-head">
            <span className="icon-tile-sm icon-tile-violet"><Layers /></span>
            <h2>Deck composition</h2>
            <span className="chip tnum ml-auto">avg interval {avgInterval}</span>
          </div>
          {allCards.length === 0 ? (
            <div className="qf-empty">
              <span className="empty-emoji">🗂️</span>
              <p className="text-sm font-black">Empty, no cards yet</p>
            </div>
          ) : (
            <ul className="space-y-3.5">
              {typeRows.map(t => {
                const pct = Math.round((t.n / allCards.length) * 100);
                const Icon = t.Icon;
                return (
                  <li key={t.type}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className={'icon-tile-sm ' + t.tile}><Icon /></span>
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
            <span className="icon-tile-sm icon-tile-info"><Clock /></span>
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
              {upcoming.map(([key, c], i) => (
                <li key={key} className="row-card anim-slide-up" style={slideDelay(i + 2)}>
                  <p className="flex-1 min-w-0 text-sm font-semibold leading-snug line-clamp-2">{prettyKey(key)}</p>
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

      {/* how spaced repetition works */}
      <section className="mt-8 qf-card-flat p-5 anim-slide-up">
        <div className="section-head">
          <span className="icon-tile-sm icon-tile-info"><Repeat /></span>
          <h2>How spaced repetition works</h2>
        </div>
        <p className="text-sm font-semibold text-muted max-w-2xl">
          Every card you grade honestly moves on the SM-2 schedule: easy cards come back later, shaky ones come back tomorrow.
        </p>
        <div className="mt-4 flex items-center gap-3 overflow-x-auto thin-scroll pb-1" aria-hidden="true">
          {[
            { label: 'Today', tone: 'bg-danger' },
            { label: 'Tomorrow', tone: 'bg-warning' },
            { label: 'In 6 days', tone: 'bg-info' },
            { label: 'In 16 days', tone: 'bg-accent' },
            { label: 'In 43 days', tone: 'bg-violet' },
            { label: 'Later, x ease', tone: 'bg-accent-deep' },
          ].map((step, i) => (
            <React.Fragment key={step.label}>
              <div className="qf-card-flat bg-surface px-4 py-3 text-center shrink-0">
                <span className={`mx-auto block h-3.5 w-3.5 rounded-full ${step.tone}`} />
                <span className="mt-1.5 block text-xs font-black whitespace-nowrap">{step.label}</span>
              </div>
              {i < 5 && <span className="h-1 w-6 rounded-full bg-surface-3 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <ClosingCta
          icon={Repeat}
          tone="violet"
          title={dueCount > 0 ? `${dueCount} cards want 5 minutes.` : 'Your memory is fully booked for today.'}
          line={dueCount > 0 ? 'A short honest pass now saves a long painful relearn next month.' : 'The scheduler will tell you when the next batch is ready. Go earn some new cards instead.'}
          cta={dueCount > 0 ? <Link href="#review" className="btn3d">Start review now</Link> : <Link href="/learn" className="btn3d">Learn something new</Link>}
          ghost={<Link href="/analytics" className="btn3d btn3d-ghost">See review analytics</Link>}
          pose={dueCount > 0 ? 'wave' : 'sleep'}
        />
      </section>

      <p className="mt-6 text-xs text-faint flex items-center gap-1.5 font-semibold">
        <Lightbulb className="h-3.5 w-3.5" />
        Reviews run entirely on this device and sync when you&apos;re online, so you can revise on a plane.
      </p>
    </div>
  );
}
