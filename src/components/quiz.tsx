'use client';

import * as React from 'react';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import katex from 'katex';
import type { QuizQuestion } from '@/lib/content';
import { gradeAnswer } from '@/lib/grading';
import { scoreQuiz } from '@/lib/mastery';
import { recordLessonResult, lessonProgressOf } from '@/lib/client/local-state';

export interface SafeQuestion {
  id: string; type: 'mcq' | 'ms' | 'numeric' | 'short' | 'code-output';
  prompt: string;
  options?: string[];
  code?: string;
  language?: string;
  unit?: string;
}

interface QuizProps {
  /** v3: pass full questions for instant local grading (endpoint stays for legacy callers) */
  endpoint?: string;
  payload?: Record<string, unknown>; // lessonId or assessmentId
  questions: SafeQuestion[];
  fullQuestions?: QuizQuestion[];
  onResult?: (pct: number, status?: string) => void;
  onAnswersChange?: (answers: Record<string, string | string[]>) => void;
  compact?: boolean;
  controlledResult?: PlayerResult | null;
}

interface PlayerResult {
  pct: number; correct: number; total: number;
  perQuestion: Record<string, { correct: boolean; explanation: string }>;
  status?: string;
  xpAwarded?: number;
}

export function Quiz({ endpoint, payload, questions, fullQuestions, onResult, onAnswersChange, compact, controlledResult }: QuizProps) {
  const [answers, setAnswers] = React.useState<Record<string, string | string[]>>({});
  const [result, setResult] = React.useState<PlayerResult | null>(controlledResult ?? null);
  const [busy, setBusy] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const shown = controlledResult ?? result;

  function setAnswer(id: string, v: string | string[]) {
    setAnswers(a => {
      const next = { ...a, [id]: v };
      onAnswersChange?.(next);
      return next;
    });
  }

  const localMode = !!fullQuestions;
  const allAnswered = (endpoint || localMode) ? questions.every(q => {
    const a = answers[q.id];
    return a !== undefined && (Array.isArray(a) ? a.length > 0 : String(a).length > 0);
  }) : false;

  async function submit() {
    if (localMode && fullQuestions) {
      // v3: graded locally, instantly, offline-capable. Progress syncs in the background.
      setBusy(true);
      try {
        const r = scoreQuiz(fullQuestions, answers, (q, a) => {
          const full = fullQuestions.find(x => x.id === q.id)!;
          return gradeAnswer(full, a);
        });
        const perQuestion: Record<string, { correct: boolean; explanation: string }> = {};
        for (const q of fullQuestions) {
          const a = answers[q.id];
          perQuestion[q.id] = { correct: a !== undefined ? gradeAnswer(q, a) : false, explanation: q.explanation };
        }
        const lessonId = typeof payload?.lessonId === 'string' ? payload.lessonId : '';
        let status = 'attempted';
        let xpAwarded = 0;
        if (lessonId) {
          const rec = recordLessonResult(lessonId, r.pct, lessonProgressOf(lessonId));
          status = rec.status;
          xpAwarded = rec.xp;
        }
        const data: PlayerResult = { pct: r.pct, correct: r.correct, total: r.total, status, perQuestion, xpAwarded };
        setResult(data);
        setAttempt(a => a + 1);
        onResult?.(data.pct, data.status);
        if (data.pct >= 80) toast.success(`Scored ${data.pct}%, ${status === 'mastered' ? 'mastery retained' : status === 'passed' ? 'lesson passed' : 'well done'}.`);
        else toast.warning(`Scored ${data.pct}%, review the explanations below, then retry.`);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!endpoint) return;
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(payload ?? {}), answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Submission failed.');
        return;
      }
      setResult(data);
      setAttempt(a => a + 1);
      onResult?.(data.pct, data.status);
      if (data.pct >= 80) toast.success(`Scored ${data.pct}% - ${data.status === 'mastered' ? 'mastery retained' : data.status === 'passed' ? 'lesson passed' : 'well done'}.`);
      else toast.warning(`Scored ${data.pct}% - review the explanations below, then retry.`);
    } catch {
      toast.error('Network error during submission.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setAnswers({});
    setResult(null);
  }

  return (
    <div className={compact ? 'space-y-5' : 'space-y-6'}>
      {questions.map((q, idx) => (
        <div key={q.id} className="border rounded-xl p-4 bg-surface" data-testid={`question-${q.id}`}>
          <p className="font-medium text-[15px] leading-relaxed">
            <QMath text={q.prompt} />
          </p>
          {q.code && (
            <div className="code-block mt-2"><code>{q.code}</code></div>
          )}
          <div className="mt-3 space-y-1.5">
            {q.type === 'mcq' && q.options?.map((opt, i) => {
              const picked = answers[q.id] === String(i);
              const state = shown
                ? (shown.perQuestion[q.id]?.correct && picked ? ' qf-correct' : picked ? ' qf-wrong' : picked ? ' qf-selected' : '')
                : picked ? ' qf-selected' : '';
              return (
                <label key={i} className={`qf-answer-tile${state}`}>
                  <input type="radio" name={q.id} checked={picked} onChange={() => setAnswer(q.id, String(i))} className="sr-only" />
                  <span className="qf-answer-badge tnum">{String.fromCharCode(65 + i)}</span>
                  <span className="min-w-0 flex-1"><QMath text={opt} /></span>
                  {shown && picked && (shown.perQuestion[q.id]?.correct
                    ? <CheckCircle2 className="h-4 w-4 flex-none text-success" />
                    : <XCircle className="h-4 w-4 flex-none text-danger" />)}
                </label>
              );
            })}
            {q.type === 'ms' && q.options?.map((opt, i) => {
              const sel = (answers[q.id] as string[]) ?? [];
              const picked = sel.includes(String(i));
              return (
                <label key={i} className={`qf-answer-tile${picked ? ' qf-selected' : ''}`}>
                  <input type="checkbox" checked={picked}
                    onChange={() => setAnswer(q.id, picked ? sel.filter(x => x !== String(i)) : [...sel, String(i)])}
                    className="sr-only" />
                  <span className="qf-answer-badge tnum">{String.fromCharCode(65 + i)}</span>
                  <span className="min-w-0 flex-1"><QMath text={opt} /></span>
                </label>
              );
            })}
            {(q.type === 'numeric' || q.type === 'code-output' || q.type === 'short') && (
              <div>
                {q.type === 'numeric' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text" inputMode="decimal"
                      value={(answers[q.id] as string) ?? ''}
                      onChange={e => setAnswer(q.id, e.target.value)}
                      className="qf-input tnum w-48"
                      placeholder="Numeric answer"
                      aria-label={`Answer for question ${idx + 1}`}
                    />
                    {shown && (shown.perQuestion[q.id]?.correct
                      ? <CheckCircle2 className="h-4 w-4 text-success" />
                      : <XCircle className="h-4 w-4 text-danger" />)}
                  </div>
                )}
                {q.type === 'code-output' && (
                  <div className="flex items-start gap-2">
                    <textarea
                      rows={2}
                      value={(answers[q.id] as string) ?? ''}
                      onChange={e => setAnswer(q.id, e.target.value)}
                      className="qf-textarea !min-h-0 flex-1 font-mono"
                      placeholder="Exact output (one line per output line)"
                      aria-label={`Answer for question ${idx + 1}`}
                    />
                    {shown && (shown.perQuestion[q.id]?.correct
                      ? <CheckCircle2 className="h-4 w-4 text-success mt-2" />
                      : <XCircle className="h-4 w-4 text-danger mt-2" />)}
                  </div>
                )}
                {q.type === 'short' && (
                  <textarea
                    rows={3}
                    value={(answers[q.id] as string) ?? ''}
                    onChange={e => setAnswer(q.id, e.target.value)}
                    className="qf-textarea w-full"
                    placeholder="Answer in your own words…"
                    aria-label={`Answer for question ${idx + 1}`}
                  />
                )}
              </div>
            )}
          </div>
          {shown && (
            <div className={`mt-3 rounded-lg px-3 py-2.5 text-[15px] ${shown.perQuestion[q.id]?.correct ? 'bg-success-soft' : 'bg-warning-soft'}`}>
              <span className="font-semibold">{shown.perQuestion[q.id]?.correct ? 'Correct. ' : 'Not quite. '}</span>
              <QMath text={shown.perQuestion[q.id]?.explanation ?? ''} />
            </div>
          )}
        </div>
      ))}

      {(endpoint || localMode) && (
        <div className="flex items-center gap-3">
          <button
            onClick={submit} disabled={busy || !allAnswered}
            className="px-5 py-2.5 rounded-lg bg-accent text-accent-foreground font-medium text-[15px] hover:bg-accent-strong disabled:opacity-50"
          >
            {busy ? 'Scoring…' : shown ? 'Check again' : 'Check answers'}
          </button>
          {shown && (
            <button onClick={reset} className="px-4 py-2.5 rounded-lg border text-[15px] hover:bg-surface-2 inline-flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </button>
          )}
          {shown && (
            <span className={`text-[15px] font-semibold ${shown.pct >= 80 ? 'text-success' : 'text-warning'}`}>
              {shown.pct}% ({shown.correct}/{shown.total}){shown.status ? ` · ${shown.status.replace('_', ' ')}` : ''}
            </span>
          )}
        </div>
      )}
      {(endpoint || localMode) && !allAnswered && !shown && <p className="text-[13px] text-faint">Answer every question to submit, no guessing through, wrong answers cost a retry.</p>}
      
    </div>
  );
}

/** Renders quiz text with inline math via KaTeX (client-side), \$ escapes currency. */
export function QMath({ text }: { text: string }) {
  const html = React.useMemo(() => {
    try {
      const src = text.replace(/\\\$/g, '\u0000'); // escaped currency -> sentinel


      let out = '';
      let i = 0;
      let buf = '';
      while (i < src.length) {
        if (src[i] === '$') {
          const end = findClose(src, i + 1);
          if (end > i) {
            out += escapeHtml(buf);
            out += katex.renderToString(src.slice(i + 1, end), { throwOnError: false, output: 'html', strict: false });
            buf = '';
            i = end + 1;
            continue;
          }
        }
        buf += src[i];
        i++;
      }
      out += escapeHtml(buf);
      return out.replace(/\u0000/g, '$');
    } catch {
      return escapeHtml(text);
    }
  }, [text]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function findClose(s: string, from: number): number {
  let i = from;
  while (i < s.length) {
    if (s[i] === '$') return i;
    i++;
  }
  return -1;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u0000/g, '$');
}
