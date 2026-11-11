#!/usr/bin/env node
// Multi-line scan (Part 1.4 A / Phase 6): find native-looking form controls
// rendered without a system class inside the tag.
// Usage: node scripts/scan-native-controls.mjs
import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'node:fs';

const ROOT = path.resolve(process.cwd(), 'src');
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|jsx)$/.test(p) && !p.includes('components/ui/')) files.push(p);
  }
})(ROOT);

const SYS = /qf-input|qf-textarea|qf-select|qf-range|qf-check|qf-answer-tile|AnswerTile|QfSlider|QfSelect|QfCheck|QfDropzone|qf-dropzone|qf-editor-input/;
let hits = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');
  // find tag openings and match to closing bracket across lines
  const tagRe = /<(input|textarea|select)\b/g;
  let m;
  while ((m = tagRe.exec(src))) {
    // capture until the real closing '>', skipping '=>' arrows inside JSX attrs
    const start = m.index;
    let end = -1;
    let p = start;
    while (p < src.length) {
      const g = src.indexOf('>', p);
      if (g === -1) { end = -1; break; }
      // look backwards over whitespace to the previous meaningful char
      let b = g - 1;
      while (b >= start && /\s/.test(src[b])) b--;
      if (src[b] === '=') { p = g + 1; continue; } // '=>' arrow, keep looking
      end = g;
      break;
    }
    if (end === -1) continue;
    let tag = src.slice(start, end + 1);
    // handle self-closing or quote-embedded '>' (rare in these tags); skip attrs containing strings with '>'
    const typeM = /type\s*=\s*["']([a-z-]+)["']/i.exec(tag);
    const type = typeM ? typeM[1].toLowerCase() : '';
    const isRange = type === 'range';
    const isCheckbox = type === 'checkbox';
    const isRadio = type === 'radio';
    const isFile = type === 'file';
    const relevant =
      m[1] === 'textarea' || m[1] === 'select' || isRange || (m[1] === 'input' && (isCheckbox || isFile));
    if (!relevant) continue;
    if (SYS.test(tag)) continue;
    // sr-only radio/checkbox inside a styled label (answer-tile pattern) is the
    // documented a11y approach: the tile carries the visuals, the input stays invisible.
    if ((isCheckbox || isRadio) && /className="[^"]*sr-only/.test(tag)) continue;
    // hidden file input used by dropzone component is fine (display:none)
    if (isFile && /className="[^"]*hidden/.test(tag)) continue;
    const line = src.slice(0, start).split('\n').length;
    const fileShort = path.relative(process.cwd(), f);
    console.log(`${fileShort}:${line}  <${m[1]}${type ? ' type=' + type : ''}>`);
    hits++;
  }
}
console.log(`\nTOTAL HITS: ${hits}`);
process.exit(hits ? 1 : 0);
