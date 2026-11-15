'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ArrowLeft, ChevronRight, ClipboardCheck, ClipboardList, Clock, ListChecks, RotateCcw, Trophy } from 'lucide-react';
import { getAssessmentPack, getAssessmentsIndex, type AssessmentFull, type AssessmentLite } from '@/lib/client/packs';
import { getState, subscribe } from '@/lib/client/local-state';
import { AssessmentPlayer, type PlayerAssessment } from '@/components/assessment-player';

function resolveId(paramId?: string | string[], pathname?: string | null): string {
  if (pathname && pathname.startsWith('/assessments/')) {
    const seg = pathname.slice('/assessments/'.length).split('/')[0];
    if (seg) return decodeURIComponent(seg);
  }
  return Array.isArray(paramId) ? paramId[0] ?? '' : paramId ?? '';
}

export function AssessmentDetailClient() {
  const params = useParams();
  const pathname = usePathname();
  const id = resolveId(params?.id, pathname);

  const [assessment, setAssessment] = React.useState<AssessmentFull | null>(null);
  const [all, setAll] = React.useState<AssessmentLite[]>([]);
  const [bestPct, setBestPct] = React.useState<number | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    setAssessment(null);
    setFailed(false);
    getAssessmentPack(id).then(setAssessment).catch(() => setFailed(true));
    getAssessmentsIndex().then(setAll).catch(() => {});
  }, [id]);

  React.useEffect(() => {
    if (!id) return;
    const sync = () => {
      const a = getState().assessments[id];
      setBestPct(a ? a.bestPct : null);
    };
    sync();
    return subscribe(sync);
  }, [id]);

  if (failed) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="qf-card p-6">
          <h1 className="text-xl font-black">Assessment unavailable</h1>
          <p className="mt-2 text-muted font-semibold">We could not load “{id}”.</p>
          <Link href="/assessments" className="btn3d btn3d-sm mt-4">
            <ArrowLeft className="h-4 w-4" /> All assessments
          </Link>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        <div className="h-20 rounded-2xl bg-surface-2 animate-pulse" />
        <div className="h-24 rounded-2xl bg-surface-2 animate-pulse" />
        <div className="h-64 rounded-2xl bg-surface-2 animate-pulse" />
      </div>
    );
  }

  const questionCount = assessment.sections.reduce((n, s) => n + s.questions.length, 0);
  const others = all.filter((x) => x.id !== assessment.id);
  const siblings = [
    ...others.filter((x) => x.kind === assessment.kind),
    ...others.filter((x) => x.kind !== assessment.kind),
  ].slice(0, 4);

  const metaTiles = [
    { icon: ListChecks, tile: 'icon-tile-info', value: String(questionCount), label: 'questions' },
    {
      icon: Clock,
      tile: 'icon-tile-info',
      value: assessment.timeLimitMinutes > 0 ? String(assessment.timeLimitMinutes) : 'Untimed',
      label: assessment.timeLimitMinutes > 0 ? 'minute limit' : 'untimed',
    },
    {
      icon: Trophy,
      tile: bestPct !== null ? 'icon-tile-gold' : 'icon-tile-neutral',
      value: bestPct !== null ? `${Math.round(bestPct)}%` : 'None yet',
      label: bestPct !== null ? 'your best score' : 'no attempts yet',
    },
    {
      icon: RotateCcw,
      tile: 'icon-tile-neutral',
      value: bestPct !== null ? 'Recorded' : '0',
      label: 'retake any time',
    },
  ];

  const player: PlayerAssessment = {
    id: assessment.id,
    title: assessment.title,
    kind: assessment.kind,
    timeLimitMinutes: assessment.timeLimitMinutes,
    description: assessment.description,
    areaLabels: assessment.areas,
    passMarkPercent: assessment.passMarkPercent,
    scoreBands: assessment.scoreBands as PlayerAssessment['scoreBands'],
    sections: assessment.sections.map((s) => ({
      title: s.title,
      questions: s.questions.map((q) => {
        const rest = { ...q } as Record<string, unknown>;
        delete rest.correctIndex;
        delete rest.correctIndices;
        delete rest.expectedAnswer;
        delete rest.answer;
        delete rest.explanation;
        return rest as unknown as PlayerAssessment['sections'][number]['questions'][number];
      }),
    })),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
      <Link href="/assessments" className="text-[15px] font-extrabold text-muted hover:text-accent transition-colors inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft className="h-4 w-4" /> All assessments
      </Link>

      <header className="page-hero">
        <span className="icon-tile icon-tile-accent"><ClipboardCheck className="h-7 w-7" /></span>
        <div>
          <h1>{assessment.title}</h1>
          <p className="page-sub line-clamp-2">{assessment.description.replace(/\$\$?[^$]*\$\$?/g, '').slice(0, 140)}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metaTiles.map((t) => (
          <div key={t.label} className="stat-tile min-w-0">
            <span className={`icon-tile icon-tile-sm ${t.tile}`}><t.icon className="h-5 w-5" /></span>
            <div className="stat-body">
              <div className="stat-value tnum">{t.value}</div>
              <div className="stat-label">{t.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <AssessmentPlayer assessment={player} compactIntro subduedIntro />
      </div>

      {siblings.length > 0 && (
        <section className="mt-8" aria-label="Also available">
          <div className="section-head">
            <span className="icon-tile icon-tile-sm icon-tile-neutral"><ClipboardList className="h-5 w-5" /></span>
            <h2>Also available</h2>
            <span className="chip tnum ml-auto">{siblings.length} more</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {siblings.map((s) => (
              <Link key={s.id} href={`/assessments/${s.id}`} className="row-card">
                <span className="icon-tile icon-tile-sm icon-tile-neutral"><ClipboardList /></span>
                <span className="flex-1 min-w-0 font-semibold text-[15px] leading-tight truncate">{s.title}</span>
                <span className="chip tnum shrink-0">{s.questionCount}q · {s.timeLimitMinutes}m</span>
                <ChevronRight className="h-4 w-4 text-faint shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
