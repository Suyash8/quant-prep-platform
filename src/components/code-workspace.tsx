'use client';

import * as React from 'react';
import { recordProblemAttempt } from '@/lib/client/local-state';
import { CheckCircle2, FileCode2, Loader2, Play, RotateCcw, Send, Terminal, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface WorkspaceProps {
  slug: string;
  stubs: Record<string, string>;
  examples: { input: string; output: string }[];
  timeLimitMs: number;
}

type TestRow = { index: number; passed?: boolean; timedOut?: boolean; killedByLimit?: boolean; exitCode?: number | null; timeMs?: number; stderr?: string; actual?: string; expected?: string; skipped?: boolean };
type SubmitResult = { compile?: { ok: boolean; stderr: string; timeMs: number }; results?: TestRow[]; passed?: number; total?: number; totalMs?: number; verdict?: string; run?: { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean; timeMs: number; killedByLimit?: boolean }; error?: string; xpAwarded?: number };

const LANGS = [
  { id: 'cpp17', label: 'C++17' },
  { id: 'cpp20', label: 'C++20' },
  { id: 'python', label: 'Python 3' },
] as const;

export function CodeWorkspace({ slug, stubs, examples, timeLimitMs }: WorkspaceProps) {
  const [language, setLanguage] = React.useState<keyof typeof stubs & string>(Object.keys(stubs)[0] ?? 'python');
  const [codeByLang, setCodeByLang] = React.useState<Record<string, string>>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`qf-code-${slug}`) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, string>;
        return { ...stubs, ...parsed };
      } catch { /* fall through */ }
    }
    return { ...stubs };
  });
  const code = codeByLang[language] ?? stubs[language] ?? '';
  const [stdin, setStdin] = React.useState(examples[0]?.input ?? '');
  const [stdinOpen, setStdinOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<'run' | 'submit' | null>(null);
  const [result, setResult] = React.useState<SubmitResult | null>(null);
  const gutterRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(`qf-code-${slug}`, JSON.stringify(codeByLang)); } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [codeByLang, slug]);

  function setCode(v: string) {
    setCodeByLang(m => ({ ...m, [language]: v }));
  }

  function switchLang(l: string) {
    setLanguage(l);
    setResult(null);
  }

  async function doRun() {
    setBusy('run');
    setResult(null);
    try {
      const res = await fetch('/api/judge/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, language, code, stdin }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Run failed.'); return; }
      setResult(data as SubmitResult);
    } catch { toast.error('Network error.'); } finally { setBusy(null); }
  }

  async function doSubmit() {
    setBusy('submit');
    setResult(null);
    try {
      const res = await fetch('/api/judge/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, language, code }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Submission failed.'); return; }
      setResult(data as SubmitResult);
      const xp = (data as SubmitResult).xpAwarded ?? 0;
      if (xp > 0) {
        toast.success(`Solved! +${xp} XP`);
        window.dispatchEvent(new CustomEvent('qf:hud-refresh'));
      }
      const v = (data as SubmitResult).verdict;
      if (v === 'passed') {
        // v3: mirror the solve locally so the dashboard and problem list update instantly
        recordProblemAttempt(slug, 'passed');
        toast.success(`All tests passed (${(data as SubmitResult).passed}/${(data as SubmitResult).total}).`);
      }
      else if (v === 'compile_error') toast.error('Compilation failed, check the compiler output.');
      else toast.warning(`${(data as SubmitResult).passed}/${(data as SubmitResult).total} tests passed.`);
    } catch { toast.error('Network error.'); } finally { setBusy(null); }
  }

  function resetCode() {
    setCodeByLang(m => ({ ...m, [language]: stubs[language] ?? '' }));
    toast.info('Code reset to the template.');
  }

  const compile = result?.compile;
  const compileFailed = compile !== undefined && !compile.ok;
  const fileLabel = language === 'python' ? 'main.py' : 'main.cpp';
  const hasTestRows = (result?.results?.length ?? 0) > 0;
  const showEmptyState = !busy && !result;
  const lineCount = Math.max(code.split('\n').length, 1);

  let statusChip: React.ReactNode = null;
  if (busy) {
    statusChip = (
      <span className="chip qf-editor-input qf-editor-text">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> running
      </span>
    );
  } else if (result?.verdict === 'passed') {
    statusChip = <span className="chip chip-success tnum">{result.passed}/{result.total} passed</span>;
  } else if (result?.verdict) {
    statusChip = <span className="chip chip-warning tnum">{result.passed}/{result.total} passed</span>;
  } else if (compileFailed) {
    statusChip = <span className="chip chip-danger">compile error</span>;
  }

  return (
    <div className="flex min-h-[640px] lg:h-[700px] min-w-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-surface-2/40 lg:flex-row">
        {/* Editor panel */}
        <div className="flex min-h-0 flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
          <div className="qf-editor flex min-h-[420px] flex-1 flex-col overflow-hidden lg:min-h-0">
            <div className="qf-editor-header flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="qf-editor-input inline-flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 font-mono text-[11px] font-semibold qf-editor-text">
                <FileCode2 className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                {fileLabel}
              </span>
              <select
                value={language}
                onChange={e => switchLang(e.target.value)}
                aria-label="Language"
                className="qf-select-sm qf-editor-input w-auto font-mono"
              >
                {LANGS.filter(l => l.id in stubs).map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              <div className="flex-1" />
              <span className="hidden qf-editor-muted text-[10px] font-semibold sm:inline">autosaves locally</span>
              <button onClick={resetCode} className="btn3d btn3d-ghost btn3d-sm shrink-0" title="Reset to template">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
              </button>
              <button onClick={doRun} disabled={busy !== null} className="btn3d btn3d-sm shrink-0">
                {busy === 'run' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />} Run
              </button>
              <button onClick={doSubmit} disabled={busy !== null} className="btn3d btn3d-gold btn3d-sm shrink-0">
                {busy === 'submit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />} Submit
              </button>
            </div>
            {/* editor surface with line-number gutter */}
            <div className="flex min-h-0 flex-1">
              <div
                ref={gutterRef}
                className="qf-editor-gutter shrink-0"
                aria-hidden="true"
              >
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                onScroll={e => { if (gutterRef.current) gutterRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop; }}
                spellCheck={false}
                wrap="off"
                placeholder="// Write your solution here"
                className="qf-editor-input thin-scroll w-full flex-1 resize-none overflow-x-auto bg-transparent p-4 font-mono text-sm leading-relaxed qf-editor-text caret-[var(--editor-accent)] outline-none"
                style={{ background: 'var(--editor-bg)' }}
                aria-label="Code editor"
              />
            </div>
          </div>
        </div>

        {/* Console panel */}
        <div className="flex min-h-0 w-full flex-col p-2.5 sm:p-3 lg:w-[460px] lg:py-4 lg:pr-4 xl:w-[500px]">
          <div className="qf-editor flex min-h-[340px] flex-1 flex-col overflow-hidden lg:min-h-0">
            <div className="qf-editor-header flex items-center gap-2 px-3 py-2">
              <Terminal className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} aria-hidden="true" />
              <span className="font-mono text-xs font-bold qf-editor-text">Console</span>
              <div className="flex-1" />
              {statusChip}
              <button
                type="button"
                onClick={() => setStdinOpen(o => !o)}
                className={cn(
                  'qf-editor-input rounded-lg border-2 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide transition-colors',
                  stdinOpen ? 'text-accent' : 'qf-editor-muted hover:text-accent',
                )}
                aria-expanded={stdinOpen}
              >stdin</button>
            </div>

            {stdinOpen && (
              <div className="qf-editor-header border-b-2 p-3" style={{ background: 'var(--editor-well)' }}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="qf-editor-muted text-[10px] font-black uppercase tracking-[0.14em]">Custom stdin</span>
                  <div className="flex gap-1.5">
                    {examples.map((ex, i) => (
                      <button key={i} type="button" onClick={() => setStdin(ex.input)}
                        className="qf-editor-input rounded-md border px-2 py-0.5 text-[10px] font-bold qf-editor-muted transition-colors hover:text-accent"
                      >
                        ex {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={stdin} onChange={e => setStdin(e.target.value)} rows={5}
                  className="qf-editor-input w-full resize-none rounded-lg border p-2 font-mono text-[11.5px] outline-none focus:border-accent"
                  aria-label="Custom stdin" />
              </div>
            )}

            <div className="thin-scroll qf-editor-text flex-1 overflow-y-auto p-3 font-mono text-xs">
              {showEmptyState && (
                <div className="flex h-full flex-col justify-center gap-4 px-5 py-8">
                  <div className="text-center">
                    <span className="qf-editor-well mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2">
                      <Terminal className="h-7 w-7 text-accent" strokeWidth={2} aria-hidden="true" />
                    </span>
                    <p className="qf-editor-text mt-3 font-sans text-sm font-extrabold">Console</p>
                    <p className="qf-editor-muted mt-1 font-sans text-xs font-semibold">Run your code to see output, or submit to run the full test suite.</p>
                  </div>
                  {examples.length > 0 && (
                    <div>
                      <p className="qf-editor-muted mb-2 font-sans text-[10px] font-black uppercase tracking-[0.14em]">Example inputs, click to load into stdin</p>
                      <div className="space-y-2">
                        {examples.map((ex, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { setStdin(ex.input); setStdinOpen(true); }}
                            className="qf-editor-well w-full rounded-xl border px-3 py-2 text-left transition-colors hover:border-accent"
                          >
                            <span className="qf-editor-text font-sans text-[11px] font-extrabold">Example {i + 1}</span>
                            <pre className="qf-editor-muted thin-scroll mt-1 max-h-16 overflow-auto whitespace-pre-wrap font-mono text-[11px]">{ex.input || '(empty)'}</pre>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="qf-editor-well rounded-xl border border-dashed px-3 py-2.5">
                    <p className="qf-editor-muted font-sans text-[11px] font-bold leading-relaxed">
                      <kbd className="kbd">Run</kbd> executes against your stdin ·
                      <kbd className="kbd ml-1">Submit</kbd> grades all hidden tests · time limit {timeLimitMs} ms
                    </p>
                  </div>
                </div>
              )}

              {busy === 'run' && <p className="qf-editor-muted font-sans">Running example…</p>}
              {busy === 'submit' && <p className="qf-editor-muted font-sans">Running the full test suite…</p>}

              {compileFailed && (
                <div className="anim-shake mt-3 rounded-xl border-2 border-danger bg-danger-soft p-3">
                  <p className="font-sans text-[11px] font-extrabold uppercase tracking-wide text-danger">
                    Compilation failed ({(compile!.timeMs / 1000).toFixed(1)}s)
                  </p>
                  <pre className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-danger">{compile!.stderr}</pre>
                </div>
              )}

              {result?.run && (
                <div className="mt-3 space-y-2">
                  <div className="qf-editor-muted flex flex-wrap items-center gap-2 font-sans text-[11px] font-semibold">
                    <span className="tnum">exit {result.run.exitCode}</span>
                    <span>·</span>
                    <span className="tnum">{result.run.timeMs} ms</span>
                    {result.run.timedOut && (
                      <span className="chip chip-danger">TIMEOUT</span>
                    )}
                  </div>
                  <div>
                    <p className="qf-editor-muted mb-1 font-sans text-[10px] font-black uppercase tracking-[0.14em]">stdout</p>
                    <pre className="qf-editor-input whitespace-pre-wrap rounded-lg border p-2.5 text-[11.5px] qf-editor-text" style={{ background: 'var(--editor-well)' }}>{result.run.stdout || '(no stdout)'}</pre>
                  </div>
                  {result.run.stderr && (
                    <div>
                      <p className="qf-editor-muted mb-1 font-sans text-[10px] font-black uppercase tracking-[0.14em]">stderr</p>
                      <pre className="whitespace-pre-wrap rounded-lg border-2 border-danger bg-danger-soft p-2.5 text-[11px] text-danger">{result.run.stderr}</pre>
                    </div>
                  )}
                </div>
              )}

              {result?.verdict && !result.run && (
                <p className="qf-editor-muted mt-3 font-sans text-[11px] font-bold">
                  Verdict: <span className="uppercase">{result.verdict.replace('_', ' ')}</span>
                </p>
              )}

              {hasTestRows && (
                <div className="mt-3 space-y-1.5">
                  <p className="qf-editor-muted font-sans text-[10px] font-black uppercase tracking-[0.14em]">Test results</p>
                  {result!.results!.map(r => {
                    const failed = !r.passed && !r.skipped;
                    const statusLabel = r.skipped
                      ? 'skipped'
                      : r.passed
                        ? 'passed'
                        : r.timedOut
                          ? 'timeout'
                          : r.killedByLimit
                            ? 'output limit'
                            : (r.exitCode !== 0 && r.exitCode !== null && r.exitCode !== undefined)
                              ? 'exit ' + r.exitCode
                              : 'wrong answer';
                    return (
                      <div key={r.index} className="qf-editor-well rounded-xl border px-3 py-2">
                        <div className="flex items-center gap-2">
                          {r.skipped ? (
                            <span className="qf-editor-muted h-4 w-4 rounded-full border-2" />
                          ) : r.passed ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} aria-hidden="true" />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0 text-danger" strokeWidth={2.5} aria-hidden="true" />
                          )}
                          <span className="qf-editor-text font-semibold">Test {r.index + 1}</span>
                          {!r.skipped && (
                            <span className={'text-[10px] font-extrabold uppercase ' + (r.passed ? 'text-accent' : 'text-danger')}>{statusLabel}</span>
                          )}
                          <span className="qf-editor-input tnum ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold qf-editor-muted">
                            {r.timeMs !== undefined ? r.timeMs + ' ms' : ', '}
                          </span>
                        </div>
                        {failed && (
                          <details className="mt-1.5">
                            <summary className="qf-editor-muted cursor-pointer font-sans text-[11px] font-bold transition-colors hover:text-accent">show diff</summary>
                            <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div>
                                <p className="qf-editor-muted mb-0.5 font-sans text-[10px] font-black uppercase tracking-wide">Expected</p>
                                <pre className="qf-editor-input thin-scroll max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border p-1.5 text-[11px] qf-editor-text">{r.expected}</pre>
                              </div>
                              <div>
                                <p className="qf-editor-muted mb-0.5 font-sans text-[10px] font-black uppercase tracking-wide">Yours</p>
                                <pre className="qf-editor-input thin-scroll max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border p-1.5 text-[11px] qf-editor-text">{r.actual}</pre>
                              </div>
                            </div>
                            {r.stderr && (
                              <pre className="thin-scroll mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border-2 border-danger bg-danger-soft p-1.5 text-[11px] text-danger">{r.stderr}</pre>
                            )}
                          </details>
                        )}
                      </div>
                    );
                  })}
                  {result?.verdict && (
                    <p className="qf-editor-muted pt-1 font-sans text-[11px] font-bold tnum">
                      {result.passed}/{result.total} tests passed · total {result.totalMs} ms
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
