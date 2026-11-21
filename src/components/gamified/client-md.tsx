'use client';

import * as React from 'react';
import katex from 'katex';

/**
 * Client-side renderer for lesson blocks inside the card player.
 * Supports: **bold**, *italic*, `code`, [label](url), $math$, and \$ currency escapes.
 * Tokenizes `code` spans alongside $math$ so shell/C++ variables like `n=$(grep ...)` never
 * collide with KaTeX math parsing.
 */

export function ClientMd({ text, className }: { text: string; className?: string }) {
  const nodes = React.useMemo(() => parseMd(text), [text]);
  return <span className={className}>{nodes}</span>;
}

/** Paragraph-splitting variant for multi-paragraph `md` blocks (`\n\n`). */
export function ClientMdBlocks({ text, className }: { text: string; className?: string }) {
  const paras = React.useMemo(
    () => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    [text],
  );
  if (paras.length <= 1) {
    return <ClientMd text={paras[0] ?? text} className={className} />;
  }
  return (
    <div className={className}>
      {paras.map((p, idx) => (
        <p key={idx} className={idx > 0 ? 'mt-3' : undefined}>
          <ClientMd text={p} />
        </p>
      ))}
    </div>
  );
}

function isSafeHref(url: string): boolean {
  const trimmed = url.trim();
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/')
  );
}

/** Find closing `$` starting at `from`, skipping `\$` escapes and rejecting newlines. */
function findMathClose(s: string, from: number): number {
  let i = from;
  while (i < s.length) {
    if (s[i] === '\n') return -1;
    if (s[i] === '\\' && s[i + 1] === '$') {
      i += 2;
      continue;
    }
    if (s[i] === '$') return i;
    i += 1;
  }
  return -1;
}

function parseMd(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let buf = '';
  let key = 0;

  const pushStyled = (s: string) => {
    if (!s) return;
    // **bold**, *italic*, [label](url) — left to right
    const parts: React.ReactNode[] = [];
    let rest = s;
    let pk = 0;
    while (rest.length > 0) {
      const link = rest.match(/\[([^\]]+)\]\(([^)\s]+)\)/);
      const bold = rest.match(/\*\*(.+?)\*\*/);
      const ital = rest.match(/\*(.+?)\*/);
      const candidates: { i: number; node: React.ReactNode; len: number }[] = [];
      if (link && isSafeHref(link[2])) {
        const external = link[2].startsWith('http://') || link[2].startsWith('https://');
        candidates.push({
          i: link.index!,
          len: link[0].length,
          node: (
            <a
              key={`l${pk}`}
              href={link[2]}
              className="text-accent-deep dark:text-accent underline decoration-accent/50 underline-offset-2 hover:decoration-accent font-bold"
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {link[1]}
            </a>
          ),
        });
      }
      if (bold) {
        candidates.push({
          i: bold.index!,
          len: bold[0].length,
          node: <strong key={`b${pk}`}>{bold[1]}</strong>,
        });
      }
      if (ital) {
        candidates.push({
          i: ital.index!,
          len: ital[0].length,
          node: <em key={`i${pk}`}>{ital[1]}</em>,
        });
      }
      if (candidates.length === 0) {
        parts.push(rest);
        break;
      }
      candidates.sort((a, b) => a.i - b.i);
      const m = candidates[0];
      if (m.i > 0) parts.push(rest.slice(0, m.i));
      parts.push(m.node);
      rest = rest.slice(m.i + m.len);
      pk++;
    }
    out.push(...parts.map((p, idx) => <React.Fragment key={`s${key++}-${idx}`}>{p}</React.Fragment>));
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    // Backtick code spans take precedence over `$` so shell/C++ snippets like `n=$(grep ...)` never break
    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i + 1 && !text.slice(i + 1, end).includes('\n')) {
        pushStyled(buf);
        buf = '';
        out.push(
          <code key={`c${key++}`} className="prose-code">
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }
    if (ch === '\\' && text[i + 1] === '$') {
      buf += '$';
      i += 2;
      continue;
    }
    if (ch === '$') {
      const end = findMathClose(text, i + 1);
      if (end > i + 1) {
        pushStyled(buf);
        buf = '';
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
  const html = React.useMemo<string | null>(() => {
    try {
      return katex.renderToString(tex, {
        throwOnError: false,
        output: 'html',
        strict: false,
        displayMode: display,
      });
    } catch {
      return null;
    }
  }, [tex, display]);
  // Never pass unescaped raw `tex` into dangerouslySetInnerHTML on KaTeX failure (XSS guard)
  if (html === null) return <span className="font-mono text-[0.9em]">{tex}</span>;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function ClientMathFigure({ tex, caption }: { tex: string; caption?: string }) {
  return (
    <figure className="my-4">
      <div className="overflow-x-auto thin-scroll py-1">
        <MathSpan tex={tex} display />
      </div>
      {caption && (
        <figcaption className="mt-1 text-[13px] text-faint text-center">
          <ClientMd text={caption} />
        </figcaption>
      )}
    </figure>
  );
}
