'use client';

import * as React from 'react';
import katex from 'katex';

/**
 * Client-side renderer for lesson blocks inside the card player.
 * Mirrors the server BlockRenderer look, without server-only deps.
 * Supports the markdown-lite dialect: **bold**, *italic*, `code`, $math$.
 */

export function ClientMd({ text, className }: { text: string; className?: string }) {
  const nodes = React.useMemo(() => parseMd(text), [text]);
  return <span className={className}>{nodes}</span>;
}

function parseMd(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let buf = '';
  let key = 0;

  const pushStyled = (s: string) => {
    // **bold**, *italic*, `code`, in that order, left to right.


    const parts: React.ReactNode[] = [];
    let rest = s;
    let pk = 0;
    while (rest.length > 0) {
      const bold = rest.match(/\*\*(.+?)\*\*/);
      const ital = rest.match(/\*(.+?)\*/);
      const code = rest.match(/`([^`]+)`/);
      const candidates = [
        bold ? { i: bold.index!, node: <strong key={`b${pk}`}>{bold[1]}</strong>, len: bold[0].length } : null,
        ital ? { i: ital.index!, node: <em key={`i${pk}`}>{ital[1]}</em>, len: ital[0].length } : null,
        code ? { i: code.index!, node: <code key={`c${pk}`} className="prose-code">{code[1]}</code>, len: code[0].length } : null,
      ].filter(Boolean) as { i: number; node: React.ReactNode; len: number }[];
      if (candidates.length === 0) { parts.push(rest); break; }
      candidates.sort((a, b) => a.i - b.i);
      const m = candidates[0];
      parts.push(rest.slice(0, m.i));
      parts.push(m.node);
      rest = rest.slice(m.i + m.len);
      pk++;
    }
    out.push(...parts.map((p, i) => <React.Fragment key={`s${key++}-${i}`}>{p}</React.Fragment>));
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\' && text[i + 1] === '$') { buf += '$'; i += 2; continue; }
    if (ch === '$') {
      const end = text.indexOf('$', i + 1);
      if (end > i) {
        pushStyled(buf); buf = '';
        out.push(<MathSpan key={`m${key++}`} tex={text.slice(i + 1, end)} />);
        i = end + 1;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  pushStyled(buf);
  return out;
}

function MathSpan({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = React.useMemo(() => {
    try {
      return katex.renderToString(tex, { throwOnError: false, output: 'html', strict: false, displayMode: display });
    } catch {
      return tex;
    }
  }, [tex, display]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function ClientMathFigure({ tex, caption }: { tex: string; caption?: string }) {
  return (
    <figure className="my-4">
      <div className="overflow-x-auto thin-scroll py-1">
        <MathSpan tex={tex} display />
      </div>
      {caption && <figcaption className="mt-1 text-xs text-faint text-center"><ClientMd text={caption} /></figcaption>}
    </figure>
  );
}
