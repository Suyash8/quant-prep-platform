import 'server-only';
import { mathText, markdownBlocks, renderMath } from '@/lib/math-text';
import { InteractiveBlock } from '@/components/interactive/registry';
import type { Block } from '@/lib/content';

/** Server renderer for the lesson block language. Client interactivity nests inside. */
export function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <div className="prose-qf my-4">{markdownBlocks(block.md)}</div>;
    case 'h2':
      return <h2 className="h-lesson">{mathText(block.text)}</h2>;
    case 'h3':
      return <h3 className="mt-6 mb-2 text-lg font-semibold">{mathText(block.text)}</h3>;
    case 'math':
      return (
        <figure className="my-5">
          <div className="overflow-x-auto thin-scroll py-1" dangerouslySetInnerHTML={{ __html: renderMath(block.tex, true) }} />
          {block.caption && <figcaption className="mt-1 text-[13px] text-faint text-center">{mathText(block.caption)}</figcaption>}
        </figure>
      );
    case 'code':
      return (
        <figure className="my-5">
          <div className="code-block" role="figure" aria-label={block.caption ?? 'code example'}>
            <code>{block.code}</code>
          </div>
          {block.caption && <figcaption className="mt-1.5 text-[13px] text-faint">{mathText(block.caption)}</figcaption>}
        </figure>
      );
    case 'callout': {
      const styles: Record<string, { border: string; bg: string; label: string }> = {
        info: { border: 'var(--accent)', bg: 'var(--accent-soft)', label: 'Note' },
        warn: { border: 'var(--warning)', bg: 'var(--warning-soft)', label: 'Careful' },
        pitfall: { border: 'var(--danger)', bg: 'var(--danger-soft)', label: 'Pitfall' },
        quant: { border: 'var(--success)', bg: 'var(--success-soft)', label: 'Finance link' },
      };
      const s = styles[block.variant] ?? styles.info;
      return (
        <aside className="my-5 border-l-4 rounded-r-lg px-4 py-3" style={{ borderColor: s.border, background: s.bg }}>
          <p className="text-[13px] font-semibold uppercase tracking-wide mb-1" style={{ color: s.border }}>{block.title || s.label}</p>
          <div className="prose-qf text-[15px]">{markdownBlocks(block.md)}</div>
        </aside>
      );
    }
    case 'list': {
      const items = block.items.map((item, i) => (
        <li key={i} className="ml-1">{mathText(item)}</li>
      ));
      return block.ordered ? (
        <ol className="prose-qf my-4 list-decimal pl-6 space-y-1.5">{items}</ol>
      ) : (
        <ul className="prose-qf my-4 list-disc pl-6 space-y-1.5">{items}</ul>
      );
    }
    case 'table':
      return (
        <div className="my-5 overflow-x-auto thin-scroll">
          <table className="w-full text-[15px] border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-surface-2">
                {block.headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold border-b">{mathText(h)}</th>)}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className={r % 2 ? 'bg-surface-2/40' : ''}>
                  {row.map((c, i) => <td key={i} className="px-3 py-2 border-b last:border-b-0 align-top">{mathText(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'steps':
      return (
        <figure className="my-5 border rounded-xl bg-surface overflow-hidden">
          {block.title && <figcaption className="px-4 py-2.5 border-b bg-surface-2/50 text-[15px] font-medium">{mathText(block.title)}</figcaption>}
          <ol className="px-4 py-3 space-y-2">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-3 text-[15px]">
                <span className="h-6 w-6 rounded-full bg-accent-soft text-accent text-[13px] font-semibold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div className="prose-qf flex-1 text-[0.95rem]">{mathText(item)}</div>
              </li>
            ))}
          </ol>
        </figure>
      );
    case 'interactive':
      return <InteractiveBlock component={block.component} params={block.params} caption={block.caption} />;
    case 'ref':
      return (
        <div className="my-5 border rounded-xl p-4 bg-surface-2/40">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-faint mb-2">References</p>
          <ul className="space-y-1 text-[15px]">
            {block.items.map((r, i) => (
              <li key={i}>· <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{r.label}</a></li>
            ))}
          </ul>
        </div>
      );
    default:
      return null;
  }
}
