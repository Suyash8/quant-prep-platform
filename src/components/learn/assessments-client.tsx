'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BookOpenCheck, CheckCircle2, ClipboardList, Clock, Cpu, Dices, Landmark,
  ListChecks, MessagesSquare, RotateCcw, Server, Sigma, Sparkles, Trophy, Coins,
} from 'lucide-react';
import { getAssessmentPack, getAssessmentsIndex, type AssessmentLite } from '@/lib/client/packs';
import { getState, subscribe } from '@/lib/client/local-state';

const TOPIC_ICON: { match: RegExp; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; tile: string }[] = [
  { match: /quantitative|aptitude/, icon: Sigma, tile: 'icon-tile-info' },
  { match: /probability|stat/, icon: Dices, tile: 'icon-tile-violet' },
  { match: /cpp|c-\+\+|systems-design/, icon: Cpu, tile: 'icon-tile-blue' },
  { match: /financial-math/, icon: Coins, tile: 'icon-tile-gold' },
  { match: /microstructure|market/, icon: Landmark, tile: 'icon-tile-warning' },
  { match: /systems|infrastructure/, icon: Server, tile: 'icon-tile-danger' },
  { match: /interview|screening/, icon: MessagesSquare, tile: 'icon-tile-accent' },
];

function topicIcon(id: string, fallback: React.ComponentType<{ className?: string; strokeWidth?: number }>, fallbackTile: string) {
  const hit = TOPIC_ICON.find((t) => t.match.test(id));
  return hit ? { icon: hit.icon, tile: hit.tile } : { icon: fallback, tile: fallbackTile };
}

const KIND_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; desc: string; tile: string }> = {
  diagnostic: {
    label: 'Diagnostic',
    icon: BookOpenCheck,
    desc: 'Baseline mapping across all seven areas, start here.',
    tile: 'icon-tile-info',
  },
  assessment: {
    label: 'Subject assessment',
    icon: ClipboardList,
    desc: 'Timed knowledge tests per domain; passing marks your lessons retrieval-verified.',
    tile: 'icon-tile-violet',
  },
  screening: {
    label: 'Screening simulation',
    icon: MessagesSquare,
    desc: 'Timed first-round interview simulation under realistic pressure.',
    tile: 'icon-tile-warning',
  },
};

const KIND_CHIP: Record<string, string> = {
  diagnostic: 'chip chip-info',
  assessment: 'chip',
  screening: 'chip chip-warning',
};

export function AssessmentsClient() {
  const [assessments, setAssessments] = React.useState<AssessmentLite[]>([]);
  const [descriptions, setDescriptions] = React.useState<Record<string, string>>({});
  const [bestById, setBestById] = React.useState<Record<string, { bestPct: number }>>({});

  React.useEffect(() => {
    getAssessmentsIndex()
      .then((list) => {
        setAssessments(list);
        Promise.all(
          list.map((a) =>
            getAssessmentPack(a.id)
              .then((full) => [a.id, full.description?.replace(/\$\$?[^$]*\$\$?/g, ' ').replace(/\s+/g, ' ').trim() ?? ''] as const)
              .catch(() => [a.id, ''] as const),
          ),
        ).then((pairs) => {
          const map: Record<string, string> = {};
          for (const [id, d] of pairs) if (d) map[id] = d;
          setDescriptions(map);
        });
      })
      .catch(() => {});

    const sync = () => setBestById({ ...getState().assessments });
    sync();
    return subscribe(sync);
  }, []);

  const scores = Object.values(bestById).map((a) => a.bestPct);
  const completedCount = scores.length;
  const bestOverall = scores.length ? Math.max(...scores) : null;
  const bestDisplay = bestOverall === null ? 'None yet' : `${Math.round(bestOverall)}%`;

  if (!assessments.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        <div className="h-20 rounded-2xl bg-surface-2 animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 rounded-2xl bg-surface-2 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero anim-slide-up">
        <span className="icon-tile icon-tile-violet"><ClipboardList /></span>
        <div>
          <h1>Assessment Centre</h1>
          <p className="page-sub">
            Timed diagnostics, subject assessments, and first-round interview simulations. All quizzes work offline too.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        {[
          { icon: ClipboardList, tile: 'icon-tile-info', val: String(assessments.length), label: 'Assessments ready' },
          { icon: CheckCircle2, tile: 'icon-tile-accent', val: `${completedCount}/${assessments.length}`, label: 'Attempted' },
          { icon: Trophy, tile: 'icon-tile-gold', val: bestDisplay, label: 'Best overall' },
        ].map((s, i) => (
          <div key={s.label} className="stat-tile anim-pop-in min-w-0" style={{ animationDelay: `${i * 70}ms` }}>
            <span className={`icon-tile icon-tile-sm ${s.tile}`}><s.icon /></span>
            <div className="stat-body min-w-0">
              <p className="stat-value tnum">{s.val}</p>
              <p className="stat-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <div className="section-head">
          <span className="icon-tile icon-tile-sm icon-tile-accent"><Sparkles strokeWidth={2.5} /></span>
          <h2>All assessments</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {assessments.map((a, i) => {
            const meta = KIND_META[a.kind] ?? KIND_META.assessment;
            const best = bestById[a.id]?.bestPct;
            const attempted = best !== undefined;
            const bestPct = attempted ? Math.round(best) : 0;
            const passed = bestPct >= 70;
            const minutesLabel = a.timeLimitMinutes > 0 ? `${a.timeLimitMinutes} min` : 'untimed';
            const topic = topicIcon(a.id, meta.icon, meta.tile);
            const TileIcon = topic.icon;
            return (
              <div
                key={a.id}
                className="qf-card anim-slide-up flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{ animationDelay: `${(i % 6) * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`icon-tile ${topic.tile}`}><TileIcon strokeWidth={2.5} /></span>
                  {attempted && (
                    <span className={`chip tnum shrink-0 ${passed ? 'chip-success' : 'chip-warning'}`}>Best {bestPct}%</span>
                  )}
                </div>
                <h3 className="mt-3.5 text-lg font-extrabold tracking-tight">{a.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className={KIND_CHIP[a.kind] ?? 'chip'}>{meta.label}</span>
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-faint tnum">
                    <ListChecks className="h-3.5 w-3.5" aria-hidden /> {a.questionCount} questions
                  </span>
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-faint tnum">
                    <Clock className="h-3.5 w-3.5" aria-hidden /> {minutesLabel}
                  </span>
                </div>
                <p className="mt-2.5 text-[15px] font-medium text-muted line-clamp-2">{descriptions[a.id] ?? meta.desc}</p>
                <div className="flex-1" />
                {attempted && bestPct > 0 && (
                  <div className="prog-track h-2.5 mt-3.5">
                    <div className={passed ? 'prog-fill' : 'prog-fill prog-fill-gold'} style={{ width: `${bestPct}%` }} />
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  {!attempted ? (
                    <span className="text-[13px] font-bold text-faint">Not started</span>
                  ) : passed ? (
                    <span className="chip chip-success">Passed</span>
                  ) : (
                    <span className="chip">In progress</span>
                  )}
                  <Link href={`/assessments/${a.id}`} className="btn3d btn3d-sm ml-auto">
                    {attempted ? <RotateCcw className="h-3.5 w-3.5" /> : <ListChecks className="h-3.5 w-3.5" />}
                    {attempted ? 'Retake' : 'Start'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
