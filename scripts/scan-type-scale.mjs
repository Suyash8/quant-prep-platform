// Fails if any source text size is below 12px. usage: node scripts/scan-type-scale.mjs
import fs from 'node:fs'; import path from 'node:path';
const bad = []; const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, f.name); if (f.isDirectory()) walk(p);
  else if (/\.(tsx?|css)$/.test(f.name)) fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
    if (/text-\[(\d+(\.\d+)?)px\]/.test(l)) for (const m of l.matchAll(/text-\[(\d+(\.\d+)?)px\]/g)) if (+m[1] < 12) bad.push(`${p}:${i + 1} ${m[0]}`);
    for (const m of l.matchAll(/font-size:\s*(\d+(\.\d+)?)px/g)) if (+m[1] < 12) bad.push(`${p}:${i + 1} ${m[0]}`);
    for (const m of l.matchAll(/fontSize:\s*(\d+(\.\d+)?)(?!\d)/g)) if (+m[1] < 12 && !/\bem|rem/.test(l)) bad.push(`${p}:${i + 1} ${m[0]}`);
  }); } };
walk('src'); console.log(bad.length ? bad.join('\n') : 'type-scale OK'); process.exit(bad.length ? 1 : 0);
