// Parser regressions + sweep of every lab expression in lesson content with the real parser (core.tsx compileExpression).
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const ts = createRequire(import.meta.url)('typescript');
const src = fs.readFileSync('src/components/interactive/core.tsx', 'utf8');
const start = src.indexOf('export function compileExpression'); const end = src.indexOf('export function safeFn');
const code = ts.transpileModule(src.slice(start, end).replace('export function', 'function') + '\nexports.compileExpression = compileExpression;', { compilerOptions: { module: 'commonjs', target: 'es2020' } }).outputText;
const ex = {}; vm.runInNewContext(code, { exports: ex, Math, Number, Error });
const c = ex.compileExpression; let fails = 0;
const eq = (name, got, want) => { const ok = Math.abs(got - want) < 1e-9; if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  got ${got} want ${want}`); };
eq('2**x at 3', c('2**x')(3), 8); eq('2^x at 3', c('2^x')(3), 8);
eq('2^3^2 right-assoc', c('2^3^2')(0), 512); eq('2**3**2 right-assoc', c('2**3**2')(0), 512);
eq('-2^2 = -4', c('-2^2')(0), -4); eq('2*x**2 precedence at 3', c('2*x**2')(3), 18);
eq('log2(8)', c('log2(x)')(8), 3);
let threw = false; try { c('2, x'); } catch { threw = true; } if (!threw) fails++; console.log(`${threw ? 'PASS' : 'FAIL'}  "2, x" is rejected (visible failure, not silent)`);
// sweep
const bad = []; let n = 0;
for (const dir of fs.readdirSync('content/lessons')) for (const f of fs.readdirSync(path.join('content/lessons', dir))) {
  const d = JSON.parse(fs.readFileSync(path.join('content/lessons', dir, f), 'utf8'));
  for (const b of d.blocks || []) { const p = b.params; if (!p) continue;
    const list = [...(Array.isArray(p.expressions) ? p.expressions : []), ...(typeof p.expression === 'string' ? [p.expression] : []), ...(typeof p.fn === 'string' ? [p.fn] : [])];
    for (const e of list) { n++; try { c(e); } catch (err) { bad.push(`${f.replace('.json', '')} [${b.component}] "${e}"`); } } } }
console.log(`swept ${n} expressions, ${bad.length} do not parse`); bad.forEach(b => console.log('  UNPARSEABLE ' + b));
process.exit(fails ? 1 : 0);
