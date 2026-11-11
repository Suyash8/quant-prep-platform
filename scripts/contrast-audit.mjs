// Contrast audit for token pairs the UI actually renders.
// Recomputes WCAG ratios from the live token values parsed out of globals.css.
// usage: node scripts/contrast-audit.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.QF_ROOT || process.cwd();
const css = fs.readFileSync(path.join(ROOT, 'src/app/globals.css'), 'utf8');

function tokens(block) {
  const out = {};
  const re = /--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let m;
  while ((m = re.exec(block))) out[m[1]] = m[2];
  return out;
}
const root = tokens(css.slice(css.indexOf(':root'), css.indexOf('.dark')));
const dark = tokens(css.slice(css.indexOf('.dark'), css.indexOf('@theme')));

function srgb(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum(hex) {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
  const r = parseInt(f.slice(0, 2), 16), g = parseInt(f.slice(2, 4), 16), b = parseInt(f.slice(4, 6), 16);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function ratio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// [fgToken, bgToken, minRatio, note]
const PAIRS = [
  ['foreground', 'background', 4.5, 'body text'],
  ['foreground', 'surface', 4.5, 'card text'],
  ['foreground-muted', 'background', 4.5, 'secondary text'],
  ['foreground-muted', 'surface', 4.5, 'secondary text in cards'],
  ['foreground-muted', 'surface-2', 4.5, 'secondary text on nested blocks'],
  ['foreground-faint', 'background', 4.5, 'tertiary text'],
  ['foreground-faint', 'surface', 4.5, 'tertiary text in cards'],
  ['accent-ink', 'accent-soft', 4.5, 'chip-accent text'],
  ['info-ink', 'info-soft', 4.5, 'chip-info text'],
  ['warning-ink', 'warning-soft', 4.5, 'chip-warning text'],
  ['danger-ink', 'danger-soft', 4.5, 'chip-danger text'],
  ['gold-ink', 'gold-soft', 4.5, 'chip-gold text'],
  ['violet-ink', 'violet-soft', 4.5, 'icon-tile-violet'],
  ['on-accent', 'accent-strong', 3.0, 'filled .btn3d label (16px w800)'],
  ['on-info', 'info-strong', 3.0, 'filled .btn3d-blue label'],
  ['on-danger', 'danger', 3.0, 'filled .btn3d-danger label'],
  ['on-violet', 'violet', 3.0, 'filled .btn3d-violet label'],
];

let fail = 0;
for (const [theme, set] of [['light', root], ['dark', dark]]) {
  for (const [fg, bg, min, note] of PAIRS) {
    const f = set[fg], b = set[bg];
    if (!f || !b) { console.log(`MISS  ${theme}: token ${fg} or ${bg} not found`); fail++; continue; }
    const r = ratio(f, b);
    const ok = r >= min;
    if (!ok) fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${theme.padEnd(5)} ${fg} on ${bg}  ${r.toFixed(2)}:1 (min ${min})  ${note}`);
  }
}
console.log(fail === 0 ? 'contrast audit: all pairs pass' : `contrast audit: ${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
