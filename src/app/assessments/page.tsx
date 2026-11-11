import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getAssessment, listAssessments } from '@/lib/content';
import { AppShell } from '@/components/app-shell';
import {
  BookOpenCheck, CheckCircle2, ClipboardList, Clock, Cpu, Dices, History, Landmark,
  ListChecks, MessagesSquare, RotateCcw, Server, Sigma, Sparkles, Trophy, Coins,
} from 'lucide-react';

export const metadata = { title: 'Assessment Centre. QuantFoundry' };

/** per-topic icons so the wall of cards gets real variety */
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
  const hit = TOPIC_ICON.find(t => t.match.test(id));
  return hit ? { icon: hit.icon, tile: hit.tile } : { icon: fallback, tile: fallbackTile };
}

const KIND_META: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  desc: string;
  tile: string;
}> = {
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

// kind chip hierarchy: diagnostic info, screening warning, common subject kind ghost
const KIND_CHIP: Record<string, string> = {
  diagnostic: 'chip chip-info',
  assessment: 'chip',
  screening: 'chip chip-warning',
};

export default async function AssessmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/assessments');

  const assessments = listAssessments();
  const attempts = await db.assessmentAttempt.findMany({
    where: { userId: user.id },
    orderBy: { submittedAt: 'desc' },
    take: 20,
  });

  const bestById = new Map<string, number>();
  for (const a of attempts) bestById.set(a.assessmentId, Math.max(bestById.get(a.assessmentId) ?? 0, a.scorePct));

  const completedCount = bestById.size;
  const bestOverall = attempts.length ? Math.max(...attempts.map(a => a.scorePct)) : null;
  const bestDisplay = bestOverall === null ? '—' : Math.round(bestOverall) + '%';

  // per-card copy: each assessment's own description (registry read, no queries)
  const descriptions = new Map<string, string>();
  for (const a of assessments) {
    const full = getAssessment(a.id);
    const d = full?.description?.replace(/\$\$?[^$]*\$\$?/g, ' ').replace(/\s+/g, ' ').trim();
    if (d) descriptions.set(a.id, d);
  }

  const statDelays = ['0ms', '80ms', '160ms'];

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
        <header className="page-hero">
          <span className="icon-tile icon-tile-info"><ClipboardList strokeWidth={2.5} /></span>
          <div>
            <h1>Assessment centre</h1>
            <p className="page-sub">
              {assessments.length} timed assessments · {completedCount} attempted · scores feed your mastery engine
            </p>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Assessment stats">
          <div className="stat-tile min-w-0 anim-pop-in" style={{ animationDelay: statDelays[0] }}>
            <span className="icon-tile icon-tile-sm icon-tile-neutral"><Sparkles strokeWidth={2.5} /></span>
            <div className="stat-body">
              <p className="stat-value tnum">{assessments.length}</p>
              <p className="stat-label">Available</p>
              <p className="stat-sub">ready when you are</p>
            </div>
          </div>
          <div className="stat-tile min-w-0 anim-pop-in" style={{ animationDelay: statDelays[1] }}>
            <span className={`icon-tile icon-tile-sm ${completedCount > 0 ? 'icon-tile-accent' : 'icon-tile-neutral'}`}><CheckCircle2 strokeWidth={2.5} /></span>
            <div className="stat-body">
              <p className="stat-value tnum">{completedCount}<span className="text-base font-extrabold text-muted">/{assessments.length}</span></p>
              <p className="stat-label">Completed</p>
            </div>
          </div>
          <div className="stat-tile min-w-0 anim-pop-in" style={{ animationDelay: statDelays[2] }}>
            <span className={`icon-tile icon-tile-sm ${bestOverall !== null ? 'icon-tile-gold' : 'icon-tile-neutral'}`}><Trophy strokeWidth={2.5} /></span>
            <div className="stat-body">
              <p className="stat-value tnum">{bestDisplay}</p>
              <p className="stat-label">Best score</p>
              <p className="stat-sub">across all attempts</p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="section-head">
            <span className="icon-tile-sm icon-tile-info"><ListChecks strokeWidth={2.5} /></span>
            <h2>Assessments</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assessments.map((a, i) => {
              const meta = KIND_META[a.kind] ?? KIND_META.assessment;
              const best = bestById.get(a.id);
              const attempted = best !== undefined;
              const bestPct = attempted ? Math.round(best) : 0;
              const passed = attempted && bestPct >= 70;
              const delay = i * 60 + 'ms';
              const minutesLabel = a.timeLimitMinutes > 0 ? a.timeLimitMinutes + ' min' : 'untimed';
              const topic = topicIcon(a.id, meta.icon, meta.tile);
              const TileIcon = topic.icon;
              return (
                <div key={a.id} className="qf-card anim-slide-up flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg" style={{ animationDelay: delay }}>
                  <div className="flex items-start justify-between gap-2">
                    <span className={'icon-tile ' + topic.tile}><TileIcon strokeWidth={2.5} /></span>
                    {attempted && (
                      <span className={'chip tnum shrink-0 ' + (passed ? 'chip-success' : 'chip-warning')}>Best {bestPct}%</span>
                    )}
                  </div>
                  <h3 className="mt-3.5 text-lg font-extrabold tracking-tight">{a.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className={KIND_CHIP[a.kind] ?? 'chip'}>{meta.label}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-faint tnum">
                      <ListChecks className="h-3.5 w-3.5" aria-hidden /> {a.questionCount} questions
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-faint tnum">
                      <Clock className="h-3.5 w-3.5" aria-hidden /> {minutesLabel}
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm font-medium text-muted line-clamp-2">{descriptions.get(a.id) ?? meta.desc}</p>
                  <div className="flex-1" />
                  {attempted && bestPct > 0 && (
                    <div className="prog-track h-2.5 mt-3.5">
                      <div className={passed ? 'prog-fill' : 'prog-fill prog-fill-gold'} style={{ width: bestPct + '%' }} />
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    {!attempted ? (
                      <span className="text-xs font-bold text-faint">Not started</span>
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

        <section className="mt-8">
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-gold"><History strokeWidth={2.5} /></span>
            <h2>Recent attempts</h2>
          </div>
          <div className="qf-card p-3 sm:p-4">
            {attempts.length === 0 ? (
              <div className="qf-empty">
                <span className="empty-emoji" role="img" aria-label="open mailbox">📭</span>
                <p className="text-lg font-extrabold">No attempts yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm font-semibold text-muted">
                  Start with the diagnostic, it maps your strongest and weakest areas in one sitting.
                </p>
              </div>
            ) : (
              <ul className="divide-y-2 divide-border">
                {attempts.map(a => {
                  const passed = a.scorePct >= 70;
                  const title = assessments.find(x => x.id === a.assessmentId)?.title
                    ?? a.assessmentId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-1 py-2.5 sm:px-2">
                      <span className={'icon-tile-sm ' + (passed ? 'icon-tile-accent' : 'icon-tile-warning')}>
                        <ClipboardList strokeWidth={2.5} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{title}</span>
                        <span className="block text-xs font-semibold text-faint tnum">
                          {a.submittedAt
                            ? new Date(a.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                              + ' · ' + new Date(a.submittedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                            : ''}
                        </span>
                      </span>
                      <span className={'chip tnum ' + (passed ? 'chip-success' : 'chip-warning')}>{Math.round(a.scorePct)}%</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
