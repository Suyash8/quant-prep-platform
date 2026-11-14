'use client';

import * as React from 'react';
import type { Block } from '@/lib/content';
import { ClientMd, ClientMathFigure } from '@/components/gamified/client-md';

/**
 * Client-side renderer for concept-card blocks (the subset that appears
 * inside concept cards: p / h2 / h3 / math / code / callout / list / table /
 * steps). Interactive labs and reference lists are handled by their own cards.
 */
export function ClientBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <div className="prose-qf my-3"><ClientMd text={block.md} /></div>;
    case 'h2':
      return <h2 className="text-xl font-extrabold tracking-tight mt-5 mb-2">{<ClientMd text={block.text} />}</h2>;
    case 'h3':
      return <h3 className="mt-5 mb-1.5 text-base font-extrabold">{<ClientMd text={block.text} />}</h3>;
    case 'math':
      return <ClientMathFigure tex={block.tex} caption={block.caption} />;
    case 'code':
      return (
        <figure className="my-4">
          <div className="code-block" role="figure" aria-label={block.caption ?? 'code example'}>
            <code>{block.code}</code>
          </div>
          {block.caption && <figcaption className="mt-1.5 text-[13px] text-faint">{<ClientMd text={block.caption} />}</figcaption>}
        </figure>
      );
    case 'callout': {
      const styles: Record<string, { fg: string; bg: string; label: string; icon: 'info' | 'warn' | 'pitfall' | 'quant' }> = {
        info: { fg: 'var(--info-ink)', bg: 'var(--info-soft)', label: 'Note', icon: 'info' },
        warn: { fg: 'var(--warning-ink)', bg: 'var(--warning-soft)', label: 'Careful', icon: 'warn' },
        pitfall: { fg: 'var(--danger-ink)', bg: 'var(--danger-soft)', label: 'Pitfall', icon: 'pitfall' },
        quant: { fg: 'var(--accent-ink)', bg: 'var(--accent-soft)', label: 'Finance link', icon: 'quant' },
      };
      const s = styles[block.variant] ?? styles.info;
      return (
        <aside className="my-4 rounded-2xl px-4 py-3.5 border-2 border-transparent" style={{ background: s.bg }}>
          <p className="text-[13px] font-extrabold uppercase tracking-wide mb-1 flex items-center gap-1.5" style={{ color: s.fg }}>
            {s.label}
          </p>
          <div className="prose-qf text-[15px]"><ClientMd text={block.md} /></div>
        </aside>
      );
    }
    case 'list':
      return block.ordered ? (
        <ol className="prose-qf my-3 list-decimal pl-6 space-y-1.5">
          {block.items.map((item, i) => <li key={i}><ClientMd text={item} /></li>)}
        </ol>
      ) : (
        <ul className="prose-qf my-3 space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5 items-start">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span><ClientMd text={item} /></span>
            </li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <div className="my-4 overflow-x-auto thin-scroll rounded-2xl border-2 border-border">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="bg-surface-2">
                {block.headers.map((h, i) => <th key={i} className="px-3 py-2.5 text-left font-extrabold border-b-2">{<ClientMd text={h} />}</th>)}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className={r % 2 ? 'bg-surface-2/40' : ''}>
                  {row.map((c, i) => <td key={i} className="px-3 py-2 border-b last:border-b-0 align-top">{<ClientMd text={c} />}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'steps':
      return (
        <figure className="my-4 rounded-2xl border-2 border-border bg-surface overflow-hidden">
          {block.title && <figcaption className="px-4 py-2.5 border-b-2 bg-surface-2/60 text-[15px] font-extrabold">{<ClientMd text={block.title} />}</figcaption>}
          <ol className="px-4 py-3.5 space-y-3">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-3 text-[15px]">
                <span className="h-7 w-7 rounded-xl bg-accent-soft text-accent-deep dark:text-accent text-[13px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div className="prose-qf flex-1"><ClientMd text={item} /></div>
              </li>
            ))}
          </ol>
        </figure>
      );
    case 'interactive':
    case 'ref':
    default:
      return null;
  }
}
