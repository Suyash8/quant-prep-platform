import 'server-only';
import katex from 'katex';
import type { ReactNode } from 'react';

/** Render a KaTeX string to HTML (server-side, throwOnError false for robustness). */
export function renderMath(tex: string, display = false): string {
  return katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    output: 'html',
    strict: false,
  });
}

function isSafeHref(url: string): boolean {
  const t = url.trim();
  return t.startsWith('https://') || t.startsWith('http://') || t.startsWith('/');
}

/**
 * Parse a markdown-lite string into React nodes with KaTeX math.
 * Supports: **bold**, *italic*, `code`, [label](url), $inline math$, and plain text.
 * `\$` is an escaped literal dollar (currency) both outside and inside math.
 * Tokenizes `code` spans alongside `$math$` so `$` inside code never collides with KaTeX.
 */
export function mathText(md: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buffer = '';
  let i = 0;
  const flush = () => {
    if (!buffer) return;
    nodes.push(...styled(buffer, `t${nodes.length}`));
    buffer = '';
  };
  while (i < md.length) {
    if (md[i] === '`') {
      const end = md.indexOf('`', i + 1);
      if (end > i + 1 && !md.slice(i + 1, end).includes('\n')) {
        flush();
        nodes.push(<code key={`c${nodes.length}`}>{md.slice(i + 1, end)}</code>);
        i = end + 1;
        continue;
      }
    }
    if (md[i] === '\\' && md[i + 1] === '$') {
      buffer += '$';
      i += 2;
      continue;
    }
    if (md[i] === '$') {
      const end = findMathClose(md, i + 1);
      if (end > i + 1 && !md.slice(i + 1, end).includes('\n')) {
        flush();
        const tex = md.slice(i + 1, end);
        nodes.push(
          <span
            key={`m${nodes.length}`}
            className="katex-inline"
            dangerouslySetInnerHTML={{ __html: renderMath(tex) }}
          />
        );
        i = end + 1;
        continue;
      }
    }
    buffer += md[i];
    i += 1;
  }
  flush();
  return nodes;
}

/** Find the closing math delimiter starting at `from`, skipping \$ escapes. Returns index of the closing '$'. */
function findMathClose(s: string, from: number): number {
  let i = from;
  while (i < s.length) {
    if (s[i] === '\n') return -1;
    if (s[i] === '\\' && s[i + 1] === '$') { i += 2; continue; }
    if (s[i] === '$') return i;
    i += 1;
  }
  return -1;
}

function styled(text: string, key: string): ReactNode[] {
  // [label](url), **bold**, *italic*
  const out: ReactNode[] = [];
  const re = /(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('[')) {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (lm && isSafeHref(lm[2])) {
        const external = lm[2].startsWith('http://') || lm[2].startsWith('https://');
        out.push(
          <a
            key={`${key}l${idx++}`}
            href={lm[2]}
            className="text-accent-deep dark:text-accent underline decoration-accent/50 underline-offset-2 hover:decoration-accent font-bold"
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {lm[1]}
          </a>,
        );
      } else {
        out.push(tok);
      }
    } else if (tok.startsWith('**')) {
      out.push(<strong key={`${key}b${idx++}`}>{tok.slice(2, -2)}</strong>);
    } else {
      out.push(<em key={`${key}i${idx++}`}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Block-level markdown for md fields: paragraphs split on \n\n. */
export function markdownBlocks(md: string): ReactNode[] {
  return md.split(/\n{2,}/).map((para, idx) =>
    para.trim() ? (
      <p key={idx} className="mb-3">
        {mathText(para.trim())}
      </p>
    ) : null
  );
}
