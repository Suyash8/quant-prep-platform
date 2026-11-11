// Multi-line scan for native-looking controls without the system classes.
// A tag counts as styled only if it carries one of: qf-input, qf-textarea,
// qf-select, qf-range, qf-check, qf-answer-tile, qf-dropzone, qf-editor-input,
// or it is a deliberately hidden sr-only input (real label/input pairs for
// quiz option tiles, dropzone pickers).
// usage: node scripts/scan-native-controls.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.QF_ROOT || process.cwd();
const SRCS = path.join(ROOT, 'src');
const OK = /qf-input|qf-textarea|qf-select|qf-range|qf-check|qf-answer-tile|qf-dropzone|qf-editor-input/;
const SKIP_FILE = /components\/ui\//; // shadcn primitives are not rendered raw

const hits = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(p); continue; }
    if (!/\.(tsx|jsx)$/.test(entry.name)) continue;
    if (SKIP_FILE.test(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    // tokenizer: find <input|select|textarea, then scan attributes tracking
    // brace depth and strings so `=>` and `>` inside JSX exprs do not end the tag
    const names = ['input', 'select', 'textarea'];
    let i = 0;
    while (i < text.length) {
      const lt = text.indexOf('<', i);
      if (lt < 0) break;
      const word = text.slice(lt + 1, lt + 10).match(/^(input|select|textarea)\b/);
      if (!word) { i = lt + 1; continue; }
      // scan to the real end of the opening tag
      let j = lt + 1 + word[1].length, depth = 0, str = null;
      while (j < text.length) {
        const ch = text[j];
        if (str) { if (ch === str && text[j - 1] !== '\\') str = null; j++; continue; }
        if (ch === '"' || ch === "'") { str = ch; j++; continue; }
        if (ch === '{') { depth++; j++; continue; }
        if (ch === '}') { depth--; j++; continue; }
        if (ch === '>' && depth === 0) break;
        j++;
      }
      const attrs = text.slice(lt + 1 + word[1].length, j);
      i = j + 1;
      if (OK.test(attrs)) continue;
      if (/class(Name)?\s*=\s*"[^"]*\bsr-only\b/.test(attrs)) continue; // a11y label/input pattern
      if (/type\s*=\s*"hidden"/.test(attrs)) continue;
      const line = text.slice(0, lt).split('\n').length;
      hits.push({ file: path.relative(ROOT, p), line, tag: word[1], snippet: text.slice(lt, Math.min(j + 1, lt + 90)).replace(/\s+/g, ' ') });
    }
  }
}
walk(SRCS);

if (hits.length === 0) {
  console.log('native-control scan: 0 hits');
  process.exit(0);
}
console.log(`native-control scan: ${hits.length} hits`);
for (const h of hits) console.log(`  ${h.file}:${h.line} <${h.tag}> ${h.snippet}`);
process.exit(1);
