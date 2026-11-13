import type { QuizQuestion } from '@/lib/content';

function norm(s: string): string {
  // Line-aware: trim each line, collapse intra-line whitespace, drop trailing blank lines.


  return s.replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.trim().replace(/[ \t]+/g, ' '))
    .join('\n')
    .replace(/\n+$/, '');
}

/** Match alternative groups at token boundaries. Technical tokens such as int& remain literal. */
export function keywordsHit(answer: string, keywords: string[]): number {
  function stem(word: string): string {
    if (word.length <= 3) return word;
    if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
    if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3).replace(/(.)\1$/, '$1');
    if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2).replace(/(.)\1$/, '$1');
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
  }
  const canonical = (value: string) => value.toLowerCase().normalize('NFKC')
    .replace(/[\u2010-\u2015]/g, '-').split(/\s+/).filter(Boolean)
    .map(token => stem(token.replace(/^[.,;:!?()[\]{}]+|[.,;:!?()[\]{}]+$/g, ''))).join(' ');
  const normal = canonical(answer);
  const matches = (value: string) => {
    const term = canonical(value);
    if (!term) return false;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?:^|[^a-z0-9_])' + escaped + '(?=$|[^a-z0-9_])', 'i').test(normal);
  };
  const hits = keywords.filter(group => group.split('|').some(matches)).length;
  return keywords.length ? hits / keywords.length : 0;
}

/**
 * Server-side question grader. Returns correct true/false.
 * Never trust client-side correctness: the client sends raw answers only.
 */
export function gradeAnswer(q: QuizQuestion, a: unknown): boolean {
  if (a === undefined || a === null) return false;
  switch (q.type) {
    case 'mcq':
      return String(a).trim() !== '' && Number(a) === q.answerIndex;
    case 'ms': {
      if (!Array.isArray(a)) return false;
      const want = [...(q.answerIndices ?? [])].sort().join(',');
      const got = [...a.map(Number)].sort().join(',');
      return want === got;
    }
    case 'numeric': {
      if (String(a).trim() === '') return false;
      const v = Number(a);
      if (!Number.isFinite(v)) return false;
      const tol = q.tolerance ?? 1e-6;
      return Math.abs(v - (q.answer as number)) <= Math.max(tol, Math.abs(q.answer as number) * 1e-9);
    }
    case 'short': {
      const s = String(a);
      return keywordsHit(s, q.keywords ?? []) >= 0.6;
    }
    case 'code-output':
      return norm(String(a)) === norm(String(q.answer));
    default:
      return false;
  }
}

export function sanitizedForClient(q: QuizQuestion) {
  // strip all answer material before sending to the browser


  const { answerIndex, answerIndices, answer, tolerance, modelAnswer, keywords, ...safe } = q as QuizQuestion & Record<string, unknown>;
  return safe;
}
