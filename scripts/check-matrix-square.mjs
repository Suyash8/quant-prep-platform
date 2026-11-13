// Regression: the MatrixTransform "unit square" must be the real unit square, and its image must have area |det A|.
import fs from 'node:fs';
const src = fs.readFileSync('src/components/interactive/math-labs.tsx', 'utf8');
const m = src.match(/export const UNIT_SQUARE: number\[\]\[\] = (\[\[.*?\]\]);/);
const sq = JSON.parse(m[1]);
const area = (P) => Math.abs(P.reduce((s, [x, y], i) => { const [x2, y2] = P[(i + 1) % P.length]; return s + (x * y2 - x2 * y); }, 0)) / 2;
let bad = 0; const chk = (n, ok, d = '') => { console.log(ok ? 'PASS' : 'FAIL', n, d); if (!ok) bad++; };
chk('has the four corners of [0,1]^2', JSON.stringify([...sq].sort()) === JSON.stringify([[0,0],[0,1],[1,0],[1,1]]), JSON.stringify(sq));
chk('area is 1', Math.abs(area(sq) - 1) < 1e-12);
for (const A of [[[2,0],[0,1.5]], [[1,1],[0,1]], [[0,-1],[1,0]], [[1,2],[2,4]], [[1,0.5],[0.3,2]]]) {
  const det = A[0][0]*A[1][1] - A[0][1]*A[1][0];
  const img = sq.map(([x, y]) => [A[0][0]*x + A[0][1]*y, A[1][0]*x + A[1][1]*y]);
  chk('image area = |det| for ' + JSON.stringify(A), Math.abs(area(img) - Math.abs(det)) < 1e-12, `area ${area(img)} det ${det}`);
}
process.exit(bad ? 1 : 0);
