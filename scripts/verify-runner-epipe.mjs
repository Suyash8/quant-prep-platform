// Regression: a submission that exits without reading stdin must not kill the runner.
const B = process.argv[2] ?? 'http://127.0.0.1:3002';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let r = await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: (process.env.QF_DEMO_EMAIL || ''), password: (process.env.QF_DEMO_PASSWORD || '') }) });
const ck = r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
const submit = async (slug, code) => { const x = await fetch(B + '/api/judge/submit', { method: 'POST', headers: { 'content-type': 'application/json', cookie: ck }, body: JSON.stringify({ slug, language: 'python', code }) }); return { status: x.status, j: await x.json() }; };
const bad = await submit('max-subarray-sum', 'print("x")'); // large stdin, never read
await sleep(3000);
const good = await submit('max-subarray-sum', 'print("x")');
await sleep(3000);
const ok = await submit('two-sum-count', 'print(0)');
console.log(JSON.stringify({ early_exit: [bad.status, bad.j.verdict], second_early_exit: [good.status, good.j.verdict], next_problem: [ok.status, ok.j.verdict] }));
const alive = bad.status === 200 && good.status === 200 && ok.status === 200;
console.log(alive ? 'PASS runner survived early-exit submissions' : 'FAIL runner died');
process.exit(alive ? 0 : 1);
