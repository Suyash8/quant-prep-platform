/** bun scripts/run-grade-fixtures.ts <contentDir> <fixtures.json>: runs authored expected verdicts through grade5. */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { grade } from '../src/lib/grade5';
const [dir, fx] = process.argv.slice(2);
const qs = new Map<string, any>();
for (const f of readdirSync(path.join(dir, 'items')).filter((x) => x.endsWith('.json'))) { const b = JSON.parse(readFileSync(path.join(dir, 'items', f), 'utf8')); for (const q of Array.isArray(b) ? b : b.items ?? [b]) qs.set(q.id, q); }
const cases = JSON.parse(readFileSync(fx, 'utf8')); let ok = 0; const bad: string[] = [];
for (const c of cases) { const q = qs.get(c.questionId); const got = q ? grade(q, c.response).verdict : 'missing-question'; if (got === c.expected) ok++; else bad.push(`${c.questionId} ${JSON.stringify(c.response)} expected ${c.expected} got ${got}`); }
console.log(JSON.stringify({ cases: cases.length, ok, mismatches: bad.length })); bad.forEach((b) => console.log('MISMATCH', b)); process.exit(bad.length ? 1 : 0);
