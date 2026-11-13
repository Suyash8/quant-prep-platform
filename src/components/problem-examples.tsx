'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { QMath } from '@/components/quiz';

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

/**
 * Example blocks for the problem statement panel: qf-card-flat with an
 * "Example N" chip, INPUT/OUTPUT panes and copy buttons (Copy -> Check, 1.5s).
 */
export function ProblemExamples({ examples }: { examples: ProblemExample[] }) {
  if (examples.length === 0) return null;
  return (
    <div className="space-y-3">
      {examples.map((ex, i) => <ExampleCard key={i} example={ex} index={i} />)}
    </div>
  );
}

function ExampleCard({ example, index }: { example: ProblemExample; index: number }) {
  const [copied, setCopied] = React.useState<'input' | 'output' | null>(null);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  function copy(text: string, which: 'input' | 'output') {
    function flash() {
      setCopied(which);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(null), 1500);
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(flash).catch(() => {});
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        flash();
      } catch { /* clipboard unavailable, no-op */ }
    }
  }

  const delay = index * 60 + 'ms';

  return (
    <div className="anim-slide-up rounded-2xl border-2 border-border bg-surface-2 p-4" style={{ animationDelay: delay }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="chip">Example {index + 1}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[12px] font-black uppercase tracking-[0.14em] text-faint">Input</span>
            <CopyButton label="input" copied={copied === 'input'} onCopy={() => copy(example.input, 'input')} />
          </div>
          <pre className="thin-scroll break-words whitespace-pre-wrap rounded-xl border-2 border-border bg-surface p-3 font-mono text-[15px]">{example.input}</pre>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[12px] font-black uppercase tracking-[0.14em] text-faint">Output</span>
            <CopyButton label="output" copied={copied === 'output'} onCopy={() => copy(example.output, 'output')} />
          </div>
          <pre className="thin-scroll break-words whitespace-pre-wrap rounded-xl border-2 border-border bg-surface p-3 font-mono text-[15px]">{example.output}</pre>
        </div>
      </div>
      {example.explanation && (
        <p className="mt-3 border-t-2 border-border pt-2.5 text-[13px] font-semibold leading-relaxed text-muted">
          <QMath text={example.explanation} />
        </p>
      )}
    </div>
  );
}

function CopyButton({ label, copied, onCopy }: { label: string; copied: boolean; onCopy: () => void }) {
  const cls = copied
    ? 'inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[12px] font-extrabold uppercase tracking-wide text-accent-deep dark:text-accent'
    : 'inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[12px] font-extrabold uppercase tracking-wide text-faint transition-colors hover:text-accent-deep dark:hover:text-accent';
  return (
    <button type="button" onClick={onCopy} aria-label={'Copy ' + label} className={cls}>
      {copied ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2.5} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
