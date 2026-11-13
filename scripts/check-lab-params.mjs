// Every interactive block's params must be keys the component actually reads. Unknown keys are silently ignored by
// the renderer (the lab then shows a default), so a mismatch is a wrong picture, not a crash. Fails on any mismatch.
import fs from 'node:fs'; import path from 'node:path';
const files = fs.readdirSync('src/components/interactive').filter(f => f.endsWith('.tsx')).map(f => path.join('src/components/interactive', f));
const src = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');
// split into exported component bodies
const comps = {}; const re = /export function (\w+)\(\{ params \}[^)]*\)\s*\{/g; let m; const starts = [];
while ((m = re.exec(src))) starts.push([m[1], m.index]);
starts.forEach(([name, i], k) => { const body = src.slice(i, k + 1 < starts.length ? starts[k + 1][1] : undefined); comps[name] = new Set([...body.matchAll(/params\.(\w+)/g)].map(x => x[1]).concat([...body.matchAll(/params\[['"](\w+)['"]\]/g)].map(x => x[1]))); });
if (process.argv.includes('--write')) { fs.writeFileSync('src/lib/lab-params.generated.json', JSON.stringify(Object.fromEntries(Object.entries(comps).sort().map(([k, v]) => [k, [...v].sort()])), null, 1) + '\n'); console.log('wrote src/lib/lab-params.generated.json'); }
let bad = 0, blocks = 0;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.json') ? [path.join(d, e.name)] : []);
for (const f of walk('content/lessons')) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const visit = (o) => { if (Array.isArray(o)) o.forEach(visit); else if (o && typeof o === 'object') { if (o.type === 'interactive' && o.component) { blocks++; const known = comps[o.component]; if (!known) { console.log('UNKNOWN COMPONENT', f, o.component); bad++; } else for (const k of Object.keys(o.params || {})) if (!known.has(k)) { console.log('UNREAD PARAM', path.basename(f), o.component, k); bad++; } } Object.values(o).forEach(visit); } };
  visit(j);
}
console.log(`${blocks} interactive blocks checked, ${bad} mismatches`);
process.exit(bad ? 1 : 0);
