'use client';

import * as React from 'react';
import { recordProblemAttempt } from '@/lib/client/local-state';
import { CheckCircle2, FileCode2, Loader2, Play, RotateCcw, Send, Terminal, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MonacoCodeEditor } from '@/components/monaco-code-editor';

export interface WorkspaceProps {
  slug: string;
  stubs: Record<string, string>;
  examples: { input: string; output: string }[];
  timeLimitMs: number;
}

type TestRow = { index: number; passed?: boolean; timedOut?: boolean; killedByLimit?: boolean; exitCode?: number | null; timeMs?: number; stderr?: string; actual?: string; expected?: string; skipped?: boolean; hidden?: boolean };
type SubmitResult = { compile?: { ok: boolean; stderr: string; timeMs: number }; results?: TestRow[]; passed?: number; total?: number; totalMs?: number; verdict?: string; run?: { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean; timeMs: number; killedByLimit?: boolean }; error?: string; xpAwarded?: number };

const LANGS = [
  { id: 'cpp17', label: 'C++17' },
  { id: 'cpp20', label: 'C++20' },
  { id: 'python', label: 'Python 3' },
] as const;

/* Dark panel palette (GitHub-dark style, always dark, both themes) */
const PANEL_BG = '#0d1117';
const PANEL_HEADER_BG = '#161b22';
const PANEL_BORDER = '#26303d';
const PANEL_DIVIDER = '#1f2630';

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
  const monacoLang = language === 'python' ? 'python' : 'cpp';
  const editorHeight = Math.min(Math.max(code.split('\n').length * 22 + 40, 340), 540);

  let statusChip: React.ReactNode = null;
  if (busy) {
    statusChip = (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#26303d] px-2 py-0.5 text-[12px] font-extrabold text-slate-400">
        <Loader2 className="h-3 w-3 animate-spin" /> running
      </span>
    );
  } else if (result?.verdict === 'passed') {
    statusChip = <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[12px] font-extrabold text-emerald-400 tnum">{result.passed}/{result.total} passed</span>;
  } else if (result?.verdict) {
    statusChip = <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[12px] font-extrabold text-amber-400 tnum">{result.passed}/{result.total} passed</span>;
  } else if (compileFailed) {
    statusChip = <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[12px] font-extrabold text-rose-400">compile error</span>;
  }

  const stdinToggleCls = stdinOpen
    ? 'rounded-lg border border-accent px-2 py-1 text-[12px] font-extrabold uppercase tracking-wide text-accent transition-colors'
    : 'rounded-lg border border-[#26303d] px-2 py-1 text-[12px] font-extrabold uppercase tracking-wide text-slate-400 transition-colors hover:border-accent hover:text-accent';

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex min-h-0 flex-col items-stretch bg-surface-2/40">
        {/* Editor panel */}
        <div className="flex min-h-0 flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
          <div className="flex flex-auto min-h-[300px] flex-col overflow-hidden rounded-2xl border-2 shadow-lg" style={{ background: PANEL_BG, borderColor: PANEL_BORDER }}>
            <div className="flex flex-wrap items-center gap-2 border-b-2 px-3 py-2" style={{ background: PANEL_HEADER_BG, borderColor: PANEL_DIVIDER }}>
              <span className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[12px] font-semibold text-slate-300" style={{ background: PANEL_BG, borderColor: PANEL_BORDER }}>
                <FileCode2 className="h-3.5 w-3.5 text-accent" />
                {fileLabel}
              </span>
              <select
                value={language}
                onChange={e => switchLang(e.target.value)}
                aria-label="Language"
                style={{ background: PANEL_BG, borderColor: PANEL_BORDER, appearance: 'none', WebkitAppearance: 'none', backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
                className="qf-select !h-auto !rounded-lg !border-2 !text-[12px] !font-mono cursor-pointer !py-1 !pl-2.5 !pr-7 !text-slate-200"
              >
                {LANGS.filter(l => l.id in stubs).map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              {/* one row: Reset / Run ghost, Submit is the only solid action */}
              <div className="ml-auto flex items-center gap-2 pl-1">
                <span className="hidden text-[12px] font-semibold text-slate-400 sm:inline">autosaves locally</span>
                <button onClick={resetCode} className="btn3d btn3d-ghost btn3d-sm shrink-0" title="Reset to template">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
                <button onClick={doRun} disabled={busy !== null} className="btn3d btn3d-ghost btn3d-sm shrink-0" title="Run against your stdin">
                  {busy === 'run' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run
                </button>
                <button onClick={doSubmit} disabled={busy !== null} className="btn3d btn3d-sm shrink-0" title="Grade against the full test suite">
                  {busy === 'submit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Grade
                </button>
              </div>
            </div>
            <MonacoCodeEditor
              value={code}
              language={monacoLang}
              onChange={setCode}
              onRunShortcut={doRun}
              onSubmitShortcut={doSubmit}
              height={editorHeight}
            />
          </div>
        </div>

        {/* Console panel */}
        <div className="flex min-h-0 w-full flex-col p-2.5 sm:p-3 lg:p-4 lg:pt-0">
          <div className="flex flex-auto min-h-[340px] flex-col overflow-hidden rounded-2xl border-2 shadow-lg" style={{ background: PANEL_BG, borderColor: PANEL_BORDER }}>
            <div className="flex items-center gap-2 border-b-2 px-3 py-2" style={{ background: PANEL_HEADER_BG, borderColor: PANEL_DIVIDER }}>
              <Terminal className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
              <span className="font-mono text-[13px] font-bold text-slate-300">Console</span>
              <div className="flex-1" />
              {statusChip}
              <button type="button" onClick={() => setStdinOpen(o => !o)} className={stdinToggleCls} aria-expanded={stdinOpen}>stdin</button>
            </div>

            {stdinOpen && (
              <div className="border-b-2 p-3" style={{ background: '#10161d', borderColor: PANEL_DIVIDER }}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[12px] font-black uppercase tracking-[0.14em] text-slate-500">Custom stdin</span>
                  <div className="flex gap-1.5">
                    {examples.map((ex, i) => (
                      <button key={i} type="button" onClick={() => setStdin(ex.input)}
                        className="rounded-md border px-2 py-0.5 text-[12px] font-bold text-slate-400 transition-colors hover:border-accent hover:text-accent"
                        style={{ borderColor: PANEL_BORDER }}>
                        ex {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={stdin} onChange={e => setStdin(e.target.value)} rows={5}
                  className="qf-editor-input w-full !min-h-0 resize-none !rounded-lg !border !text-[12px] !text-slate-300 !p-2"
                  style={{ background: PANEL_BG, borderColor: PANEL_BORDER }}
                  aria-label="Custom stdin" />
              </div>
            )}

            <div className="thin-scroll flex-auto min-h-0 overflow-y-auto p-3 font-mono text-[13px] text-slate-300">
              {showEmptyState && (
                <div className="flex h-full flex-col justify-center gap-4 px-5 py-8">
                  <div className="text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2" style={{ borderColor: PANEL_BORDER, background: '#10161d' }}>
                      <Terminal className="h-7 w-7 text-accent" strokeWidth={2} />
                    </span>
                    <p className="mt-3 font-sans text-[15px] font-extrabold text-slate-300">Console</p>
                    <p className="mt-1 font-sans text-[13px] font-semibold text-slate-500">Run your code to see output, or submit to run the full test suite.</p>
                  </div>
                  {examples.length > 0 && (
                    <div>
                      <p className="font-sans text-[12px] font-black uppercase tracking-[0.14em] text-slate-500 mb-2">Example inputs, click to load into stdin</p>
                      <div className="space-y-2">
                        {examples.map((ex, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { setStdin(ex.input); setStdinOpen(true); }}
                            className="w-full rounded-xl border px-3 py-2 text-left transition-colors hover:border-accent"
                            style={{ borderColor: PANEL_BORDER, background: '#10161d' }}
                          >
                            <span className="font-sans text-[12px] font-extrabold text-slate-300">Example {i + 1}</span>
                            <pre className="thin-scroll mt-1 max-h-16 overflow-auto whitespace-pre-wrap font-mono text-[12px] text-slate-400">{ex.input || '(empty)'}</pre>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl border border-dashed px-3 py-2.5" style={{ borderColor: PANEL_BORDER }}>
                    <p className="font-sans text-[12px] font-bold text-slate-400 leading-relaxed">
                      <kbd className="rounded bg-slate-700 px-1.5 py-0.5 text-[12px] text-slate-200">Run</kbd> executes against your stdin ·
                      <kbd className="ml-1 rounded bg-slate-700 px-1.5 py-0.5 text-[12px] text-slate-200">Grade</kbd> grades all hidden tests · time limit {timeLimitMs} ms
                    </p>
                  </div>
                </div>
              )}

              {busy === 'run' && <p className="font-sans text-slate-500">Running example…</p>}
              {busy === 'submit' && <p className="font-sans text-slate-500">Running the full test suite…</p>}

              {compileFailed && (
                <div className="anim-shake mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
                  <p className="font-sans text-[12px] font-extrabold uppercase tracking-wide text-rose-400">
                    Compilation failed ({(compile!.timeMs / 1000).toFixed(1)}s)
                  </p>
                  <pre className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-rose-300">{compile!.stderr}</pre>
                </div>
              )}

              {result?.run && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 font-sans text-[12px] font-semibold text-slate-500">
                    <span className="tnum">exit {result.run.exitCode}</span>
                    <span>·</span>
                    <span className="tnum">{result.run.timeMs} ms</span>
                    {result.run.timedOut && (
                      <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-1.5 text-[12px] font-extrabold text-rose-400">TIMEOUT</span>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 font-sans text-[12px] font-black uppercase tracking-[0.14em] text-slate-500">stdout</p>
                    <pre className="whitespace-pre-wrap rounded-lg border p-2.5 text-[12px] text-slate-200" style={{ borderColor: PANEL_BORDER, background: PANEL_BG }}>{result.run.stdout || '(no stdout)'}</pre>
                  </div>
                  {result.run.stderr && (
                    <div>
                      <p className="mb-1 font-sans text-[12px] font-black uppercase tracking-[0.14em] text-slate-500">stderr</p>
                      <pre className="whitespace-pre-wrap rounded-lg border border-rose-500/40 bg-rose-500/10 p-2.5 text-[12px] text-rose-300">{result.run.stderr}</pre>
                    </div>
                  )}
                </div>
              )}

              {result?.verdict && !result.run && (
                <p className="mt-3 font-sans text-[12px] font-bold text-slate-400">
                  Verdict: <span className="uppercase">{result.verdict.replace('_', ' ')}</span>
                </p>
              )}

              {hasTestRows && (
                <div className="mt-3 space-y-1.5">
                  <p className="font-sans text-[12px] font-black uppercase tracking-[0.14em] text-slate-500">Test results</p>
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
                      <div key={r.index} className="rounded-xl border px-3 py-2" style={{ borderColor: PANEL_BORDER, background: '#10161d' }}>
                        <div className="flex items-center gap-2">
                          {r.skipped ? (
                            <span className="h-4 w-4 rounded-full border-2 border-slate-600" />
                          ) : r.passed ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0 text-danger" strokeWidth={2.5} />
                          )}
                          <span className="font-semibold text-slate-200">Test {r.index + 1}</span>
                          {!r.skipped && (
                            <span className={'text-[12px] font-extrabold uppercase ' + (r.passed ? 'text-accent' : 'text-danger')}>{statusLabel}</span>
                          )}
                          <span className="tnum ml-auto rounded-full px-2 py-0.5 text-[12px] font-bold text-slate-400" style={{ background: PANEL_HEADER_BG }}>
                            {r.timeMs !== undefined ? r.timeMs + ' ms' : 'not run'}
                          </span>
                        </div>
                        {failed && r.hidden && (
                          <p className="mt-1.5 font-sans text-[12px] font-bold text-slate-400">Hidden edge case did not pass. Check boundary conditions, 64-bit overflows, and off-by-one indices.</p>
                        )}
                        {failed && !r.hidden && (
                          <details className="mt-1.5">
                            <summary className="cursor-pointer font-sans text-[12px] font-bold text-slate-500 transition-colors hover:text-slate-300">show diff</summary>
                            <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div>
                                <p className="mb-0.5 font-sans text-[12px] font-black uppercase tracking-wide text-slate-500">Expected</p>
                                <pre className="thin-scroll max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border p-1.5 text-[12px] text-slate-300" style={{ borderColor: PANEL_BORDER, background: PANEL_BG }}>{r.expected}</pre>
                              </div>
                              <div>
                                <p className="mb-0.5 font-sans text-[12px] font-black uppercase tracking-wide text-slate-500">Yours</p>
                                <pre className="thin-scroll max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border p-1.5 text-[12px] text-slate-300" style={{ borderColor: PANEL_BORDER, background: PANEL_BG }}>{r.actual}</pre>
                              </div>
                            </div>
                            {r.stderr && (
                              <pre className="thin-scroll mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-[12px] text-rose-300">{r.stderr}</pre>
                            )}
                          </details>
                        )}
                      </div>
                    );
                  })}
                  {result?.verdict && (
                    <p className="pt-1 font-sans text-[12px] font-bold text-slate-400 tnum">
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
