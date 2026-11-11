#!/usr/bin/env node
// Contrast audit for text/background token pairs (Part 5.10).
// Parses :root and .dark token values straight from src/app/globals.css.
// Usage: node scripts/contrast-audit.mjs
import fs from 'node:fs';

const css = fs.readFileSync('src/app/globals.css', 'utf8');
function block(sel) {
  const m = css.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'));
  return m ? m[1] : '';
}
const root = block(':root');
const dark = block('.dark');
function tok(srcText, name) {
  const m = srcText.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  return m ? m[1] : '#000000';
}
const L = (n) => tok(root, n);
const D = (n) => tok(dark, n) || tok(root, n);

const pairs = [
  // [name, lightFg token, lightBg token, darkFg token, darkBg token, bold]
  ['foreground on background', L('foreground'), L('background'), D('foreground'), D('background'), false],
  ['foreground on surface', L('foreground'), L('surface'), D('foreground'), D('surface'), false],
  ['muted on background', L('foreground-muted'), L('background'), D('foreground-muted'), D('background'), false],
  ['faint on background', L('foreground-faint'), L('background'), D('foreground-faint'), D('background'), false],
  ['faint on surface', L('foreground-faint'), L('surface'), D('foreground-faint'), D('surface'), false],
  ['muted on surface-2', L('foreground-muted'), L('surface-2'), D('foreground-muted'), D('surface-2'), false],
  ['accent-deep on accent-soft (chip-accent)', L('accent-deep'), L('accent-soft'), D('accent'), D('accent-soft'), false],
  ['info-strong on info-soft (chip-info)', L('info-strong'), L('info-soft'), D('info'), D('info-soft'), false],
  ['warning-strong on warning-soft (chip-warning)', L('warning-strong'), L('warning-soft'), D('warning'), D('warning-soft'), false],
  ['danger-strong on danger-soft (chip-danger)', L('danger-strong'), L('danger-soft'), D('danger'), D('danger-soft'), false],
  ['gold text on gold-soft (chip-gold)', '#8f6b00', L('gold-soft'), D('gold'), D('gold-soft'), false],
  ['white on accent-strong (btn3d light)', '#ffffff', L('accent-strong'), '#06251a', D('accent-strong'), true],
  ['ink on info-strong (btn3d-blue)', '#ffffff', L('info-strong'), '#06202e', D('info-strong'), true],
  ['ink on danger-strong (btn3d-danger)', '#ffffff', L('danger-strong'), '#2a0a0c', D('danger-strong'), true],
  ['#4a3800 on gold (btn3d-gold)', '#4a3800', L('gold'), '#4a3800', D('gold'), true],
  ['white on violet (btn3d-violet)', '#ffffff', L('violet'), '#ffffff', '#8447e0', true],
  ['chip neutral text on surface', L('foreground-muted'), L('surface'), D('foreground-muted'), D('surface'), false],
];

function lum(hex) {
  const c = hex.replace('#', '');
  const n = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(fg, bg) {
  const [a, b] = [lum(fg), lum(bg)];
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
let fails = 0;
for (const [name, fl, bl, fd, bd, large] of pairs) {
  const req = large ? 3 : 4.5;
  const rl = ratio(fl, bl), rd = ratio(fd, bd);
  const okL = rl >= req, okD = rd >= req;
  if (!okL || !okD) fails++;
  console.log(`${okL && okD ? 'PASS' : 'FAIL'}  ${name}: light ${rl.toFixed(2)}:1 ${okL ? '' : '(need ' + req + ')'}  dark ${rd.toFixed(2)}:1 ${okD ? '' : '(need ' + req + ')'}`);
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} failing pair(s)`);
process.exit(fails ? 1 : 0);
