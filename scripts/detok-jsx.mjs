// Dash + AI-word cleanup for TSX/TS using the TypeScript parser.
// Rewrites ONLY: JSX text nodes, string literals, and no-substitution template
// literals. Code, identifiers and expressions are never touched.
//
// Usage: node scripts/detok-jsx.mjs [--apply] <files...>
import ts from 'typescript';
import fs from 'fs';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const files = args.filter(a => !a.startsWith('--'));

const SWAPS = [
  [/\brobust\b/gi, 'solid'], [/\brobustly\b/gi, 'solidly'], [/\brobustness\b/gi, 'reliability'],
  [/\bleverage\b/gi, 'use'], [/\bleveraging\b/gi, 'using'],
  [/\bjourney\b/gi, 'path'], [/\bjourneys\b/gi, 'paths'],
  [/\bcrucial\b/gi, 'critical'], [/\bpivotal\b/gi, 'key'],
  [/\bseamless\b/gi, 'smooth'], [/\bseamlessly\b/gi, 'smoothly'],
  [/\bcomprehensive\b/gi, 'thorough'], [/\bdelve into\b/gi, 'dig into'], [/\bdelve\b/gi, 'dig'],
  [/\bmyriad\b/gi, 'countless'], [/\bplethora\b/gi, 'loads'],
  [/\barsenal\b/gi, 'toolkit'], [/\bunderscore\b/gi, 'show'],
  [/\bnotably\b/gi, 'in particular'], [/\barguably\b/gi, 'possibly'],
  [/\bempower\b/gi, 'enable'], [/\belevate\b/gi, 'raise'],
];

function fixCase(m0, rep) {
  return m0[0] === m0[0].toUpperCase() ? rep[0].toUpperCase() + rep.slice(1) : rep;
}

function clean(t) {
  let out = t;
  out = out.replace(/\s+—\s+(?=[A-Z"(])/, '. ');
  out = out.replace(/\s+—\s+/g, ', ');
  out = out.replace(/(\w)—(\w)/g, '$1, $2');
  out = out.replace(/(\w)–(\w)/g, '$1-$2');
  out = out.replace(/(\d)\s*–\s*(\d)/g, '$1 to $2');
  out = out.replace(/—/g, ', ').replace(/–/g, '-');
  for (const [re, rep] of SWAPS) out = out.replace(re, (m0) => fixCase(m0, rep));
  return out;
}

let nChanged = 0;
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const text = node.getText(sf);
      const cleaned = clean(text);
      if (cleaned !== text) edits.push({ start: node.getStart(sf), end: node.getEnd(), text: cleaned });
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.getText(sf);
      const inner = text.slice(1, -1);
      const cleaned = clean(inner);
      if (cleaned !== inner) {
        const q = text[0];
        edits.push({ start: node.getStart(sf), end: node.getEnd(), text: q + cleaned + q });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (edits.length) {
    nChanged++;
    if (APPLY) {
      edits.sort((a, b) => b.start - a.start);
      let out = src;
      for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
      fs.writeFileSync(file, out);
    }
  }
}
console.log(`${files.length} files, ${nChanged} would change${APPLY ? ' (applied)' : ''}`);
