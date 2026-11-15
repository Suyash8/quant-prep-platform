'use client';

/**
 * v3 revision centre: due cards come from the local SM-2 store, card content
 * resolves from lesson packs, grading runs locally (recordReviews), and the
 * sync engine carries reviews to the server in the background.
 */

import * as React from 'react';
import Link from 'next/link';
import {
  PartyPopper, FolderOpen, Moon, ArrowRight, BookOpen, ChevronRight, CircleCheck, Clock, Code2, Flame, Layers, Lightbulb, Repeat, Sigma,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getLessonPack } from '@/lib/client/packs';
import { getState, subscribe, hydrate, cardStateOf, unretireCard } from '@/lib/client/local-state';
import { RevisionSession, type DueCard } from '@/components/revision-session';

const TYPE_META: Record<string, { Icon: LucideIcon; tile: string; fill: string }> = {
  // deck rows are data, not celebration: info tiles + info fills only
  concept: { Icon: BookOpen, tile: 'icon-tile-info', fill: 'prog-fill-info' },
  code: { Icon: Code2, tile: 'icon-tile-info', fill: 'prog-fill-info' },
  formula: { Icon: Sigma, tile: 'icon-tile-info', fill: 'prog-fill-info' },
};
const FALLBACK_TYPE = { Icon: Layers, tile: 'icon-tile-neutral', fill: 'prog-fill-info' };

const popDelay = (i: number) => ({ animationDelay: i * 70 + 'ms' });
const slideDelay = (i: number) => ({ animationDelay: i * 90 + 'ms' });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function formatDue(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400_000);
  if (days <= 1) return 'Tomorrow';
  if (days < 7) return 'In ' + days + 'd';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** cardKey is "<lessonId>:<idx>" or "quiz:<lessonId>:<qid>"; resolve front/back/type from the lesson pack. */
async function resolveCards(keys: string[]): Promise<DueCard[]> {
  const byLesson = new Map<string, { key: string; idxStr: string; source: 'quiz_miss' | 'flashcard' }[]>();
  for (const k of keys) {
    const isQuiz = k.startsWith('quiz:');
    const raw = isQuiz ? k.slice(5) : k;
    const colon = raw.lastIndexOf(':');
    if (colon <= 0) continue;
    const lessonId = raw.slice(0, colon);
    const idxStr = raw.slice(colon + 1);
    if (!byLesson.has(lessonId)) byLesson.set(lessonId, []);
    byLesson.get(lessonId)!.push({ key: k, idxStr, source: isQuiz ? 'quiz_miss' : 'flashcard' });
  }
  const out: DueCard[] = [];
  await Promise.all([...byLesson.entries()].map(async ([lessonId, entries]) => {
    try {
      const lesson = await getLessonPack(lessonId);
      for (const entry of entries) {
        const st = cardStateOf(entry.key);
        if (entry.source === 'quiz_miss') {
          const q = lesson.quiz.find((x) => x.id === entry.idxStr);
          if (!q) continue;
          out.push({
            cardKey: entry.key, front: q.prompt, back: q.explanation, cardType: 'quiz_miss', source: 'quiz_miss',
            intervalDays: st?.intervalDays ?? 0, repetitions: st?.repetitions ?? 0, lapses: st?.lapses ?? 0,
          });
        } else {
          const idx = Number(entry.idxStr);
          const fc = lesson.flashcards[idx];
          if (!fc) continue;
          out.push({
            cardKey: entry.key, front: fc.front, back: fc.back, cardType: fc.type || 'concept', source: 'lesson',
            intervalDays: st?.intervalDays ?? 0, repetitions: st?.repetitions ?? 0, lapses: st?.lapses ?? 0,
          });
        }
      }
    } catch {
      /* lesson pack unavailable: skip */
    }
  }));
  return out;
}

export function RevisionClient() {
  const [, setReady] = React.useState(false);
  const [dueCards, setDueCards] = React.useState<DueCard[]>([]);
  const [sessionCards, setSessionCards] = React.useState<DueCard[] | null>(null);
  const [sessionKey, setSessionKey] = React.useState(0);
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
      void resolveCards(keys).then(cards => {
        if (!alive) return;
        setDueCards(cards);
        setSessionCards(prev => (prev === null && cards.length > 0 ? cards : prev));
        setReady(true);
      });
    };
    refresh();
    const unsub = subscribe(() => { setTick(t => t + 1); refresh(); });
    return () => { alive = false; unsub(); };
  }, []);

  const s = getState();
  const allCards = Object.entries(s.cards);
  const retiredKeys = Object.keys(s.retiredCards ?? {});
  const now = Date.now();
  const upcoming = allCards
    .filter(([, c]) => new Date(c.dueAt).getTime() > now)
    .sort((a, b) => new Date(a[1].dueAt).getTime() - new Date(b[1].dueAt).getTime())
    .slice(0, 8);
  const dueCount = allCards.filter(([, c]) => new Date(c.dueAt).getTime() <= now).length;

  const dueTypeByKey = new Map(dueCards.map((c) => [c.cardKey, c.cardType]));
  const byType: Record<string, number> = {};
  for (const [k] of allCards) {
    const t = k.startsWith('quiz:') ? 'quiz_miss' : (dueTypeByKey.get(k) ?? 'concept');
    byType[t] = (byType[t] ?? 0) + 1;
  }
  // richer types when the front can be sniffed from packs later; concept is the safe default
  const avgInterval = Math.round(allCards.reduce((n, [, c]) => n + c.intervalDays, 0) / Math.max(allCards.length, 1)) + 'd';
  // distinct lessons contributing cards to the deck (key is "<lessonId>:<idx>")
  const lessonCount = new Set(allCards.map(([k]) => k.slice(0, k.lastIndexOf(':')))).size;

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
            <p className="mt-1.5 text-[15px] font-bold text-muted">cards due</p>
            <Link href="#review" className="btn3d btn3d-lg mt-5">
              Start review
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-[13px] text-faint font-semibold">Reveal, recall, grade honestly, the SM-2 scheduler handles the spacing.</p>
          </div>
        </div>
      ) : (
        <div className="qf-empty anim-pop-in">
          <PartyPopper className="mx-auto h-14 w-14 text-accent-ink" aria-hidden="true" />
          <p className="mt-2 text-lg font-black">Nothing due, you&apos;re all caught up!</p>
          {allCards.length === 0 && (
            <>
              <p className="mt-1 text-[13px] text-faint font-semibold">Complete your first lesson to start building the deck.</p>
              <Link href="/curriculum" className="btn3d btn3d-sm mt-4">
                Open the curriculum
              </Link>
            </>
          )}
        </div>
      )}

      {/* stat row */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <div className="stat-tile min-w-0 anim-pop-in" style={popDelay(0)}>
          <span className="icon-tile icon-tile-sm icon-tile-accent"><Clock /></span>
          <div className="stat-body min-w-0">
            <div className="stat-value tnum">{dueCount}</div>
            <div className="stat-label">Due now</div>
            <div className="stat-sub">scheduled by SM-2</div>
          </div>
        </div>
        <div className="stat-tile min-w-0 anim-pop-in" style={popDelay(1)}>
          <span className="icon-tile icon-tile-sm icon-tile-info"><Layers /></span>
          <div className="stat-body min-w-0">
            <div className="stat-value tnum">{allCards.length}</div>
            <div className="stat-label">Total cards</div>
            <div className="stat-sub">{allCards.length > 0 ? `across ${lessonCount} lesson${lessonCount === 1 ? '' : 's'}` : 'built from finished lessons'}</div>
          </div>
        </div>
        <div className="stat-tile min-w-0 anim-pop-in" style={popDelay(2)}>
          <span className="icon-tile icon-tile-sm icon-tile-neutral"><Flame /></span>
          <div className="stat-body min-w-0">
            <div className="stat-value tnum">{reviewStreak}d</div>
            <div className="stat-label">Review streak</div>
            <div className="stat-sub">{reviewDays.size} active day{reviewDays.size === 1 ? '' : 's'} in total</div>
          </div>
        </div>
        <div className="stat-tile min-w-0 anim-pop-in" style={popDelay(3)}>
          <span className="icon-tile icon-tile-sm icon-tile-neutral"><CircleCheck /></span>
          <div className="stat-body min-w-0">
            <div className="stat-value tnum">{retentionPct === null ? 'None yet' : retentionPct + '%'}</div>
            <div className="stat-label">Retention</div>
            <div className="stat-sub">{retentionPct === null ? 'Not enough reviews yet' : 'recalled without lapse'}</div>
          </div>
        </div>
      </div>

      {/* live session */}
      {sessionCards && sessionCards.length > 0 && (
        <div id="review" className="mt-8 scroll-mt-6">
          <RevisionSession
            key={sessionKey}
            cards={sessionCards}
            onComplete={() => {
              setSessionCards(null);
              setSessionKey((k) => k + 1);
            }}
          />
        </div>
      )}

      {/* deck + queue: left column stretches (composition + offline note) so the
          two columns end on the same baseline instead of a half-height void */}
      <div className="mt-8 grid md:grid-cols-2 gap-4 items-stretch">
        <div className="flex flex-col gap-4 min-w-0">
          <section className="qf-card p-5 flex-1 min-w-0 flex flex-col anim-slide-up" style={slideDelay(0)}>
            <div className="section-head">
              <span className="icon-tile icon-tile-sm icon-tile-neutral"><Layers /></span>
              <h2>Deck composition</h2>
              <span className="chip tnum ml-auto">avg interval {avgInterval}</span>
            </div>
            {allCards.length === 0 ? (
              <div className="qf-empty">
                <FolderOpen className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
                <p className="text-[15px] font-black">Empty, no cards yet</p>
              </div>
            ) : (
              <>
                <ul className="space-y-3.5">
                  {typeRows.map(t => {
                    const pct = Math.round((t.n / allCards.length) * 100);
                    const Icon = t.Icon;
                    return (
                      <li key={t.type}>
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className={'icon-tile icon-tile-sm ' + t.tile}><Icon /></span>
                          <span className="flex-1 min-w-0 text-[15px] font-semibold capitalize truncate">{cap(t.type.replace(/[-_]/g, ' '))}</span>
                          <span className="chip tnum">{t.n}</span>
                          <span className="chip tnum">{pct}%</span>
                        </div>
                        <div className="prog-track h-2.5">
                          <div className={'prog-fill ' + t.fill} style={{ width: Math.max(pct, 2) + '%' }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-auto pt-4 border-t-2">
                  <div className="flex items-center justify-between text-[12px] font-black uppercase tracking-wider mb-1.5">
                    <span className="text-faint">Practiced at least once</span>
                    <span className="tnum text-faint">{reviewedCards.length}/{allCards.length}</span>
                  </div>
                  {reviewedCards.length > 0 ? (
                    <div className="prog-track h-2.5">
                      <div className="prog-fill" style={{ width: `${Math.min(100, Math.round((reviewedCards.length / allCards.length) * 100))}%` }} />
                    </div>
                  ) : (
                    <p className="text-[12px] font-bold text-faint">Not started, grade your first review to begin coverage.</p>
                  )}
                </div>
              </>
            )}
          </section>
          <div className="qf-card-flat p-4 min-w-0 anim-slide-up" style={slideDelay(2)}>
            <div className="flex items-center gap-2.5">
              <span className="icon-tile icon-tile-sm icon-tile-neutral"><Lightbulb /></span>
              <div className="font-black text-[15px] tracking-tight">Instant grading &amp; sync</div>
            </div>
            <p className="mt-2 text-[13px] font-semibold text-muted leading-relaxed">
              Reviews are graded immediately as you study and sync automatically to your account across devices.
            </p>
          </div>
        </div>

        <section className="qf-card p-5 min-w-0 anim-slide-up" style={slideDelay(1)}>
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-info"><Clock /></span>
            <h2>Next up</h2>
            <span className="chip ml-auto">scheduled</span>
          </div>
          {upcoming.length === 0 ? (
            <div className="qf-empty">
              <Moon className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
              <p className="text-[15px] font-black">Nothing scheduled ahead</p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto thin-scroll">
              {upcoming.map(([key, c], i) => (
                <li key={key} className="row-card anim-slide-up" style={slideDelay(i + 2)}>
                  <p className="flex-1 min-w-0 text-[15px] font-semibold leading-snug line-clamp-2">{key.split(':').slice(0, -1).join(':').replace(/-/g, ' ')}</p>
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

      {retiredKeys.length > 0 && (
        <details className="mt-6 qf-card-flat p-5">
          <summary className="cursor-pointer font-black text-[15px] select-none flex items-center justify-between gap-2">
            <span>Retired cards ({retiredKeys.length})</span>
            <span className="text-[12px] font-bold text-faint">Click to inspect or restore to queue</span>
          </summary>
          <ul className="mt-4 space-y-2">
            {retiredKeys.map((key) => {
              const label = key.replace(/^quiz:/, 'missed check: ').split(':').slice(0, -1).join(':').replace(/-/g, ' ');
              return (
                <li key={key} className="row-card">
                  <span className="flex-1 min-w-0 text-[14px] font-semibold truncate">{label || key}</span>
                  <button
                    type="button"
                    onClick={() => {
                      unretireCard(key);
                      setSessionCards(null);
                    }}
                    className="btn3d btn3d-ghost btn3d-sm shrink-0"
                  >
                    Restore
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
