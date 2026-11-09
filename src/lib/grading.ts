import type { QuizQuestion } from '@/lib/content';

function norm(s: string): string {
  // Line-aware: trim each line, collapse intra-line whitespace, drop trailing blank lines.
  return s.replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.trim().replace(/[ \t]+/g, ' '))
    .join('\n')
    .replace(/\n+$/, '');
}

function keywordsHit(answer: string, keywords: string[]): number {
  const a = answer.toLowerCase();
  const hits = keywords.filter(k => a.includes(k.toLowerCase())).length;
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
      return Number(a) === q.answerIndex;
    case 'ms': {
      if (!Array.isArray(a)) return false;
      const want = [...(q.answerIndices ?? [])].sort().join(',');
      const got = [...a.map(Number)].sort().join(',');
      return want === got;
    }
    case 'numeric': {
      const v = Number(a);
      if (Number.isNaN(v)) return false;
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
