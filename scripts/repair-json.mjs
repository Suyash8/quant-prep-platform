#!/usr/bin/env node
/** Repair invalid JSON escape sequences in lesson files: \X -> \\X for invalid escapes. */
import fs from 'node:fs';
import path from 'node:path';

const VALID = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);
const files = process.argv.slice(2);
let repaired = 0;

for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  let out = '';
  let inStr = false, changed = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (!inStr) {
      if (c === '"') inStr = true;
      out += c;
      continue;
    }
    if (c === '\\') {
      const next = s[i + 1];
      if (VALID.has(next)) { out += c + next; i++; }
      else { out += '\\\\'; changed = true; } // double the backslash, keep next char as-is
    } else if (c === '"') {
      inStr = false;
      out += c;
    } else out += c;
  }
  try {
    JSON.parse(out);
    if (changed) { fs.writeFileSync(file, out); repaired++; console.log('repaired', file); }
    else console.log('no-change-ok', file);
  } catch (e) {
    console.error('STILL-BROKEN', file, e.message);
    // fallback: report for manual fix
  }
}
console.log(`repaired ${repaired}/${files.length}`);
