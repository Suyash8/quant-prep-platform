// Hidden-test leak guard (shared by the pack builder and its self-test).
// pub = the public problem pack (authored minus tests/solutions/editorial/limits, plus visibleTests).
// Hidden INPUT leaks if: equal to a visible input; or >=12 chars and a substring of the public pack; or <12 chars, non-blank, equal to a whole public string field that is not a visible example output.
// Hidden EXPECTED leaks only if it is NOT identical (whitespace-normalized) to a visible example output AND, searching the public pack with ONLY the designated visible example OUTPUT payloads (visibleTests[].expected, examples[].output) scrubbed: (a) the normalized expected is >=12 chars and is a substring of any public string field or of the scrubbed pack text, or (b) the normalized expected (any length, non-blank) equals a whole scrubbed public string field. Normalization: CRLF->LF, trailing whitespace removed per line and at the end. Inputs: unchanged. No other field is scrubbed, so prose that repeats a hidden answer is still caught.
// A binary/small-range answer repeating a visible example's answer is an inherent coincidence, not an exposure of a hidden input.
const strings = (v, out) => { if (typeof v === 'string') out.add(v); else if (Array.isArray(v)) v.forEach((x) => strings(x, out)); else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out)); return out; };
const esc = (s) => JSON.stringify(s).slice(1, -1);
const norm = (x) => String(x).replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/\s+$/, '');
const scrub = (pub) => { const c = JSON.parse(JSON.stringify(pub)); if (Array.isArray(c.visibleTests)) c.visibleTests.forEach((t) => { if (t && typeof t === 'object') t.expected = ''; }); if (Array.isArray(c.examples)) c.examples.forEach((t) => { if (t && typeof t === 'object' && 'output' in t) t.output = ''; }); return c; };
function leaks(pub, tests) {
  const text = JSON.stringify(pub); const vals = strings(pub, new Set());
  const sp = scrub(pub); const stext = JSON.stringify(sp); const svals = [...strings(sp, new Set())].map(norm).filter((v) => v.trim());
  const vis = tests.filter((t) => !t.hidden); const visOut = new Set(vis.map((t) => t.expected)); const visOutN = new Set(vis.map((t) => norm(t.expected))); const visLines = new Set(vis.flatMap((t) => norm(t.expected).split('\n')).filter((l) => l.trim())); const visIn = new Set(vis.map((t) => t.input)); const out = [];
  tests.forEach((t, i) => {
    if (!t.hidden) return; const v = t.input; const e = t.expected; const en = norm(e);
    if (visIn.has(v) || (v.length >= 12 && text.includes(esc(v))) || (v.length < 12 && v.trim() && vals.has(v) && !visOut.has(v))) out.push(`hidden test ${i} input is exposed in the public pack`);
    if (!visOut.has(e) && !visOutN.has(en) && !(en.trim() && !en.includes('\n') && visLines.has(en)) && en.trim() && ((en.length >= 12 && (stext.includes(esc(en)) || svals.some((x) => x.includes(en)))) || svals.some((x) => x === en))) out.push(`hidden test ${i} expected output is exposed in the public pack`);
  });
  return out;
}
module.exports = { leaks, strings };
