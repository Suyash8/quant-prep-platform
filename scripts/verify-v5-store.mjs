// Real-browser test of the v5 IndexedDB store + outbox + pack download against a running server.
// node scripts/verify-v5-store.mjs [baseUrl]   needs /tmp/qfb/idb-store.js (bun build src/lib/v5/idb-store.ts --format=iife --global-name=QF5)
// and QF_DEMO_EMAIL / QF_DEMO_PASSWORD. Uses PW_PATH if set.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? 'playwright');
const base = process.argv[2] ?? 'http://127.0.0.1:3002';
const bundle = readFileSync(process.env.QF5_BUNDLE ?? '/tmp/qfb/idb-store.js', 'utf8');
let fails = 0; const check = (n, ok, x = '') => { console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : String(x)); if (!ok) fails++; };
const browser = await chromium.launch(); const ctx = await browser.newContext();
const lr = await ctx.request.post(base + '/api/auth/login', { data: { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD } });
check('login', lr.ok());
const UID = (await (await ctx.request.get(base + '/api/auth/me')).json()).user?.id; check('me exposes own id', typeof UID === 'string' && UID.length > 0);
const setUid = (pg, id) => pg.addScriptTag({ content: `window.UID=${JSON.stringify(id)}` });
const page = await ctx.newPage(); await page.goto(base + '/_blank.html'); await page.addScriptTag({ content: bundle }); await setUid(page, UID);
const run = Date.now();
const r1 = await page.evaluate(async () => {
  const s = await QF5.openV5Store({ userId: window.UID }); await s.downloadPacks(); const snap = s.getSnapshot(); s.close();
  return { packs: snap.packs };
});
check('download: all packs stored and sha-verified', r1.packs.state === 'complete' && r1.packs.stored === r1.packs.total && r1.packs.total > 0, JSON.stringify(r1));
// OFFLINE: attempt answered with no network
await ctx.setOffline(true);
const r2 = await page.evaluate(async (run) => {
  const s = await QF5.openV5Store({ userId: window.UID }); const man = await (await caches.keys(), null);
  const m = JSON.parse(await new Promise((res) => { const o = indexedDB.open('qf-v5:' + (window.UID ?? 'anon')); o.onsuccess = () => { const g = o.result.transaction('meta').objectStore('meta').get('manifest'); g.onsuccess = () => res(JSON.stringify(g.result.v)); }; }));
  const ip = m.packs.find((p) => p.kind === 'items'); const q = await (async () => { const rec = await new Promise((res) => { const o = indexedDB.open('qf-v5:' + (window.UID ?? 'anon')); o.onsuccess = () => { const g = o.result.transaction('packs').objectStore('packs').get(ip.sha256); g.onsuccess = () => res(g.result); }; }); return JSON.parse(rec.body).find((x) => x.kind === 'choice' && x.selectionMode === 'one'); })();
  const item = await s.getItem(ip.sha256, q.id);
  const good = q.correct[0]; const bad = q.options.find((o) => o.id !== good).id;
  const mk = (id, sel) => { const r = { kind: 'choice', selected: [sel] }; const res = s.gradeLocal(item, r); return { eventId: `b-${run}-${id}`, questionId: q.id, revision: q.revision, packSha: ip.sha256, response: r, clientResult: res, hintsUsed: 0, startedAt: Date.now(), answeredAt: Date.now() }; };
  const rc1 = await s.submitAttempt(mk('ok', good)); const rc2 = await s.submitAttempt(mk('wrong', bad)); const dup = await s.submitAttempt(mk('ok', good));
  const snap = s.getSnapshot(); const due = await s.getDueReviews(Date.now() + 15 * 60_000);
  s.close(); return { itemFound: !!item, rc1: rc1.status, rc2: rc2.status, dup: dup.status, pending: snap.pending, online: snap.online, provXp: snap.provisional.xp, verified: !!snap.verified, due: due.length, dueRev: due[0]?.card.revision === q.revision && due[0]?.packSha === ip.sha256, qid: q.id };
}, run);
check('offline: question resolves from IndexedDB', r2.itemFound);
check('offline: attempts stored local, never verified', r2.rc1 === 'local' && r2.rc2 === 'local' && r2.verified === false, JSON.stringify(r2));
check('offline: duplicate eventId idempotent (pending 2, not 3)', r2.pending === 2, r2.pending);
check('offline: snapshot reports offline and provisional progress', r2.online === false && r2.provXp === 10, JSON.stringify(r2));
check('offline: wrong answer scheduled a review with exact packSha+revision', r2.due >= 1 && r2.dueRev, JSON.stringify(r2));
// RELOAD page (still offline): state persists across store instances
const r3 = await page.evaluate(async () => { const s = await QF5.openV5Store({ userId: window.UID }); const sn = s.getSnapshot(); s.close(); return { pending: sn.pending, xp: sn.provisional.xp, packs: sn.packs }; });
check('persists across new store instance while offline', r3.pending === 2 && r3.xp === 10 && r3.packs.state === 'complete', JSON.stringify(r3));
// ONLINE: sync
await ctx.setOffline(false);
const rHeld = await page.evaluate(async () => { const s = await QF5.openV5Store({ userId: window.UID }); await s.sync(); const sn = s.getSnapshot(); s.close(); return { pending: sn.pending, unconfirmed: sn.unconfirmed, verified: !!sn.verified }; });
check('offline-written answers are HELD as unconfirmed identity, not uploaded on reconnect', rHeld.unconfirmed === 2 && rHeld.pending === 2 && rHeld.verified === false, JSON.stringify(rHeld));
const r4 = await page.evaluate(async (qid) => { const s = await QF5.openV5Store({ userId: window.UID }); const sum = await s.getUnconfirmedSummary(); const idc = await s.identityCheck(); const rc = (await s.getReceipts({})).filter((x) => x.receipt.identity === 'unconfirmed').length; let wrong = 'none'; try { await s.confirmUnconfirmed('someone-else', sum.answers.map((a) => a.eventId)); } catch (e) { wrong = e.name; } const first = sum.answers[0].eventId; const n1 = await s.confirmUnconfirmed(idc.sessionAccountId, [first]); const left = (await s.getUnconfirmedSummary()).count; const n = n1 + await s.confirmUnconfirmed(idc.sessionAccountId, sum.answers.map((a) => a.eventId)); const cardsHeld = sum.reviewRatings; const humanOk = cardsHeld >= 1 && sum.answers.every((a) => a.prompt && a.responseText && a.packSha && a.revision); await s.sync(); const rows = await s.getReceipts({ questionId: qid }); const sn = s.getSnapshot(); s.close(); return { statuses: rows.map((r) => r.receipt.status).sort(), pending: sn.pending, verifiedXp: sn.verified?.xp, sumCount: sum.count, sumAnswers: sum.answers.length, rc, wrong, label: !!idc.sessionLabel, matches: idc.matches, n1, left, n, humanOk, cardsAfter: (await s.getUnconfirmedSummary()).reviewRatings }; }, r2.qid);
check('confirm only the reviewed event ids (others stay held), summary has prompt/revision/human response; unconfirmed summary lists each answer, receipts expose per-row identity, wrong account id refused, live label shown', r4.sumCount === 2 && r4.sumAnswers === 2 && r4.rc === 2 && r4.wrong === 'AccountChanged' && r4.label && r4.matches && r4.n1 === 1 && r4.left === 1 && r4.n === 2 && r4.humanOk && r4.cardsAfter === 0, JSON.stringify(r4));
check('online: outbox synced, server receipts verified', r4.pending === 0 && r4.statuses.length >= 2 && r4.statuses.every((x) => x === 'verified'), JSON.stringify(r4));
check('verified progress only from server receipts (xp 10 for 1 correct)', r4.verifiedXp === 10, JSON.stringify(r4));
// TAMPERED pack: sha mismatch must not complete
const ctx2 = await browser.newContext(); await ctx2.request.post(base + '/api/auth/login', { data: { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD } });
const p2 = await ctx2.newPage(); await p2.goto(base + '/_blank.html'); await p2.addScriptTag({ content: bundle }); await setUid(p2, UID);
await p2.route('**/v5/packs/items-*.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
const r5 = await p2.evaluate(async () => { const s = await QF5.openV5Store({ userId: window.UID }); await s.downloadPacks(); const sn = s.getSnapshot(); s.close(); return sn.packs; });
check('tampered pack rejected: not complete, counts honest', r5.state === 'incomplete' && r5.stored < r5.total, JSON.stringify(r5));

// ACCOUNT ISOLATION: same browser, session switches to account B
const emailB = `iso-${Date.now()}@test.dev`, pwB = 'isolation-test-12345';
const ctxB = await browser.newContext(); const rg = await ctxB.request.post(base + '/api/auth/register', { data: { name: 'Iso Test', email: emailB, password: pwB } });
check('register second account', rg.ok(), rg.status());
const UIDB = (await (await ctxB.request.get(base + '/api/auth/me')).json()).user?.id; check('second account has a different id', !!UIDB && UIDB !== UID);
await ctx.setOffline(true);
const r7 = await page.evaluate(async () => { const s = await QF5.openV5Store({ userId: window.UID }); const m = await new Promise((res) => { const o = indexedDB.open('qf-v5:' + window.UID); o.onsuccess = () => { const g = o.result.transaction('meta').objectStore('meta').get('manifest'); g.onsuccess = () => res(g.result.v); }; }); const ip = m.packs.find((p) => p.kind === 'items'); const q = await new Promise((res) => { const o = indexedDB.open('qf-v5:' + window.UID); o.onsuccess = () => { const g = o.result.transaction('packs').objectStore('packs').get(ip.sha256); g.onsuccess = () => res(JSON.parse(g.result.body).find((x) => x.kind === 'choice' && x.id)); }; });
  const item = await s.getItem(ip.sha256, q.id); const r = { kind: 'choice', selected: [q.correct[0]] };
  await s.submitAttempt({ eventId: 'iso-' + Date.now(), questionId: q.id, revision: q.revision, packSha: ip.sha256, response: r, clientResult: s.gradeLocal(item, r), hintsUsed: 0, startedAt: 0, answeredAt: Date.now() }); const n = s.getSnapshot().pending; s.close(); return n; });
check('account A has one unsynced attempt while offline', r7 === 1, r7);
await ctx.setOffline(false);
await ctx.request.post(base + '/api/auth/logout', { data: { confirmCurrent: true } }); const lb = await ctx.request.post(base + '/api/auth/login', { data: { email: emailB, password: pwB } }); check('same browser now signed in as B', lb.ok());
const r8 = await page.evaluate(async () => { const s = await QF5.openV5Store({ userId: window.UID }); await s.sync(); const n = s.getSnapshot().pending; s.close(); return n; });
check('A attempts are NOT uploaded under B session (stay pending)', r8 === 1, r8);
const r9 = await page.evaluate(async (uidB) => { const s = await QF5.openV5Store({ userId: uidB }); const sn = s.getSnapshot(); const rc = await s.getReceipts({}); s.close(); return { pending: sn.pending, xp: sn.provisional.xp, packs: sn.packs.stored, receipts: rc.length }; }, UIDB);
check("B's store sees none of A's attempts or reviews", r9.pending === 0 && r9.xp === 0 && r9.receipts === 0, JSON.stringify(r9));
const r10 = await page.evaluate(async () => { const s = await QF5.openV5Store({ userId: window.UID }); await s.sync(); const n = s.getSnapshot().pending; s.close(); return n; });
check('A still pending after repeated sync as B (no leak)', r10 === 1, r10);
const hb = await ctx.request.post(base + '/api/v5/attempts', { headers: { 'x-qf-account': UID }, data: { events: [] } }); check('server rejects events claiming account A under B session (409)', hb.status() === 409, hb.status());
const hn = await ctx.request.post(base + '/api/v5/attempts', { data: { events: [] } }); check('server rejects sync without account header (400)', hn.status() === 400, hn.status());

// HISTORICAL packs: due cards resolve against the exact stored pack, or become an explicit version-unavailable state (never dropped, never latest)
const r11 = await page.evaluate(async () => {
  const dbn = 'qf-v5:' + window.UID; const open = () => new Promise((res) => { const o = indexedDB.open(dbn); o.onsuccess = () => res(o.result); });
  const d = await open(); const m = await new Promise((res) => { const g = d.transaction('meta').objectStore('meta').get('manifest'); g.onsuccess = () => res(g.result.v); }); const ip = m.packs.find((p) => p.kind === 'items');
  const rec = await new Promise((res) => { const g = d.transaction('packs').objectStore('packs').get(ip.sha256); g.onsuccess = () => res(g.result); }); const qs = JSON.parse(rec.body); const q = qs.find((x) => x.kind === 'choice');
  const oldSha = 'a'.repeat(64), ghostSha = 'dead'.repeat(16);
  await new Promise((res) => { const tx = d.transaction(['packs', 'cards'], 'readwrite'); tx.objectStore('packs').put({ sha: oldSha, id: 'items-old', kind: 'items', body: JSON.stringify([q]) });
    const card = (sha, id) => ({ key: `${sha}:${id}`, questionId: id, revision: q.revision, packSha: sha, due: 1, interval: 1, ease: 2.5, lapses: 1, schedulerVersion: 1 });
    tx.objectStore('cards').put(card(oldSha, q.id)); tx.objectStore('cards').put(card(ghostSha, q.id)); tx.oncomplete = res; }); d.close();
  const s = await QF5.openV5Store({ userId: window.UID }); const due = await s.getDueReviews(Date.now() + 86400000); const un = await s.getUnavailableReviews(Date.now() + 86400000); s.close();
  return { oldResolved: due.some((e) => e.packSha === oldSha), ghostInDue: due.some((e) => e.packSha === ghostSha), ghostUnavailable: un.some((e) => e.card.packSha === ghostSha && e.reason === 'version-unavailable'), oldUnavailable: un.some((e) => e.card.packSha === oldSha) };
});
check('historical due card resolves from its exact old stored pack (not in current manifest)', r11.oldResolved && !r11.oldUnavailable, JSON.stringify(r11));
check('card whose pack is not stored is explicit version-unavailable, not dropped, not in due', r11.ghostUnavailable && !r11.ghostInDue, JSON.stringify(r11));
// PRE-ACTION GUARD: A's store is stale while B is signed in (online): a new answer must be rejected and NOT written to A's namespace
const r12 = await page.evaluate(async () => { const s = await QF5.openV5Store({ userId: window.UID }); const before = s.getSnapshot().pending;
  const m = await new Promise((res) => { const o = indexedDB.open('qf-v5:' + window.UID); o.onsuccess = () => { const g = o.result.transaction('meta').objectStore('meta').get('manifest'); g.onsuccess = () => res(g.result.v); }; }); const ip = m.packs.find((p) => p.kind === 'items');
  const q = await new Promise((res) => { const o = indexedDB.open('qf-v5:' + window.UID); o.onsuccess = () => { const g = o.result.transaction('packs').objectStore('packs').get(ip.sha256); g.onsuccess = () => res(JSON.parse(g.result.body).find((x) => x.kind === 'choice')); }; });
  const item = await s.getItem(ip.sha256, q.id); const r = { kind: 'choice', selected: [q.correct[0]] }; let err = null;
  let err2 = null; const mkEv = (id) => ({ eventId: id + Date.now(), questionId: q.id, revision: q.revision, packSha: ip.sha256, response: r, clientResult: s.gradeLocal(item, r), hintsUsed: 0, startedAt: 0, answeredAt: Date.now() });
  try { await s.submitAttempt(mkEv('guard2-')); } catch (e) { err2 = e.name; }
  try { await s.submitAttempt({ eventId: 'guard-' + Date.now(), questionId: q.id, revision: q.revision, packSha: ip.sha256, response: r, clientResult: s.gradeLocal(item, r), hintsUsed: 0, startedAt: 0, answeredAt: Date.now() }); } catch (e) { err = e.name; }
  const after = s.getSnapshot().pending; s.close(); return { err, err2, before, after }; });
check('pre-action guard: online answer under a different session is rejected (AccountChanged), nothing written', r12.err === 'AccountChanged' && r12.err2 === 'AccountChanged' && r12.after === r12.before, JSON.stringify(r12));
// Signed-out sync stays local
const ctx3 = await browser.newContext(); const p3 = await ctx3.newPage(); await p3.goto(base + '/_blank.html'); await p3.addScriptTag({ content: bundle });
await p3.evaluate(async () => { const s = await QF5.openV5Store({ userId: window.UID }); await s.downloadPacks(); s.close(); });
const r6 = await p3.evaluate(async () => { const s = await QF5.openV5Store({ userId: window.UID }); const m = (await new Promise((res) => { const o = indexedDB.open('qf-v5:' + (window.UID ?? 'anon')); o.onsuccess = () => { const g = o.result.transaction('meta').objectStore('meta').get('manifest'); g.onsuccess = () => res(g.result.v); }; })); const ip = m.packs.find((p) => p.kind === 'items'); const q = await new Promise((res) => { const o = indexedDB.open('qf-v5:' + (window.UID ?? 'anon')); o.onsuccess = () => { const g = o.result.transaction('packs').objectStore('packs').get(ip.sha256); g.onsuccess = () => res(JSON.parse(g.result.body).find((x) => x.kind === 'choice')); }; });
  const item = await s.getItem(ip.sha256, q.id); const r = { kind: 'choice', selected: [q.correct[0]] };
  await s.submitAttempt({ eventId: 'so-' + Date.now(), questionId: q.id, revision: q.revision, packSha: ip.sha256, response: r, clientResult: s.gradeLocal(item, r), hintsUsed: 0, startedAt: 0, answeredAt: Date.now() }); await s.sync(); const sn = s.getSnapshot(); s.close(); return { pending: sn.pending, local: sn.localOnlyCount, localOnly: sn.localOnly, verified: !!sn.verified }; });
check('signed out: answer stays local-only (never pending upload), unverified', r6.pending === 0 && r6.local === 1 && r6.localOnly === true && r6.verified === false, JSON.stringify(r6));

// Storage honesty: GC of stale unreferenced packs, and quota failure never reports a save
const rq = await page.evaluate(async () => {
  const s = await QF5.openV5Store({ userId: window.UID });
  const db = await new Promise((res) => { const o = indexedDB.open('qf-v5:' + window.UID); o.onsuccess = () => res(o.result); });
  await new Promise((res) => { const tx = db.transaction('packs', 'readwrite'); tx.objectStore('packs').put({ sha: 'stale-' + 'f'.repeat(58), id: 'old', kind: 'lesson', body: '{}' }); tx.oncomplete = res; });
  const before = await new Promise((res) => { const g = db.transaction('packs').objectStore('packs').count(); g.onsuccess = () => res(g.result); });
  await s.downloadPacks();
  const after = await new Promise((res) => { const g = db.transaction('packs').objectStore('packs').count(); g.onsuccess = () => res(g.result); });
  const removed = s.getSnapshot().packsRemoved;
  const m = await new Promise((res) => { const g = db.transaction('meta').objectStore('meta').get('manifest'); g.onsuccess = () => res(g.result.v); });
  const ip = m.packs.find((p) => p.kind === 'items'); const q = (await s.getContent()).questions; const qid = Object.keys(q)[0]; const item = await s.getItem(ip.sha256, qid);
  s.close(); db.close();
  return { before, after, removed };
});
check('GC removes a stale unreferenced pack after a complete download (before > after, removed >= 1)', rq.before === rq.after + 1 && rq.removed >= 1, JSON.stringify(rq));
const rq2 = await p3.evaluate(async () => {
  const s = await QF5.openV5Store({ userId: window.UID });
  const m = await new Promise((res) => { const o = indexedDB.open('qf-v5:' + (window.UID ?? 'anon')); o.onsuccess = () => { const g = o.result.transaction('meta').objectStore('meta').get('manifest'); g.onsuccess = () => res(g.result.v); }; });
  const ip = m.packs.find((p) => p.kind === 'items'); const qid = Object.keys((await s.getContent()).questions)[0]; const item = await s.getItem(ip.sha256, qid);
  const rows0 = (await s.getReceipts({})).length;
  const orig = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function () { throw new DOMException('quota', 'QuotaExceededError'); };
  let name = 'none'; const r = { kind: 'choice', selected: [item.options[0].id] };
  try { await s.submitAttempt({ eventId: 'quota-' + Date.now(), questionId: qid, revision: item.revision, packSha: ip.sha256, response: r, clientResult: s.gradeLocal(item, r), hintsUsed: 0, startedAt: 0, answeredAt: Date.now() }); } catch (e) { name = e.name; }
  IDBObjectStore.prototype.put = orig; const err = s.getSnapshot().storageError; const rows1 = (await s.getReceipts({})).length; s.close(); return { name, err, rows0, rows1 };
});
check('quota failure: StorageFull thrown, storageError=quota, nothing saved', rq2.name === 'StorageFull' && rq2.err === 'quota' && rq2.rows0 === rq2.rows1, JSON.stringify(rq2));

const rd = await p3.evaluate(async () => {
  const s = await QF5.openV5Store({ userId: window.UID });
  const m = await new Promise((res) => { const o = indexedDB.open('qf-v5:' + (window.UID ?? 'anon')); o.onsuccess = () => { const g = o.result.transaction('meta').objectStore('meta').get('manifest'); g.onsuccess = () => res(g.result.v); }; });
  const ip = m.packs.find((p) => p.kind === 'items'); const qid = Object.keys((await s.getContent()).questions)[0]; const item = await s.getItem(ip.sha256, qid);
  const resp = { kind: 'choice', selected: [item.options[0].id] };
  const ok = await s.saveDraft(ip.sha256, qid, item.revision, resp, 1); s.close();
  const s2 = await QF5.openV5Store({ userId: window.UID });
  const back = await s2.getDraft(ip.sha256, qid, item.revision); const otherRev = await s2.getDraft(ip.sha256, qid, item.revision + 1); const otherPack = await s2.getDraft('other-pack', qid, item.revision);
  const pos = await s2.setPosition('lesson-x', 3, 'cv1', 2); const gp = await s2.getPosition('lesson-x', 'cv1'); const gpOld = await s2.getPosition('lesson-x', 'cv0');
  const before = (await s2.getReceipts({})).length;
  await s2.submitAttempt({ eventId: 'draft-' + Date.now(), questionId: qid, revision: item.revision, packSha: ip.sha256, response: resp, clientResult: s2.gradeLocal(item, resp), hintsUsed: 0, startedAt: 0, answeredAt: Date.now() });
  await new Promise((r) => setTimeout(r, 200)); const after = await s2.getDraft(ip.sha256, qid, item.revision); s2.close();
  return { ok, back: back && back.response.selected[0] === resp.selected[0], otherRev, otherPack, pos, gp: gp && gp.blockIndex, gpOld, cleared: after === null, before };
});
const rcd = await p3.evaluate(async () => {
  const s = await QF5.openV5Store({ userId: window.UID }); const P = 'qfp-ledger-replay', st = 'def main():\n    pass\n', st2 = 'def main():\n    return\n';
  const bad = await s.saveCodeDraft('qfp-nope', 'python', st, 'x', 1); const big = await s.saveCodeDraft(P, 'python', st, 'x'.repeat(131073), 1);
  const a = await s.saveCodeDraft(P, 'python', st, 'print(1)\n', 10); const exact = await s.getCodeDraft(P, 'python', st); const otherLang = await s.getCodeDraft(P, 'cpp', st); const otherStarter = await s.getCodeDraft(P, 'python', st2);
  const olderBefore = await s.findOlderCodeDrafts(P, 'python', st); const olderForNew = await s.findOlderCodeDrafts(P, 'python', st2);
  s.close();
  const s2 = await QF5.openV5Store({ userId: window.UID }); const persisted = await s2.getCodeDraft(P, 'python', st); const cleared = await s2.clearCodeDraft(P, 'python', st); const after = await s2.getCodeDraft(P, 'python', st); s2.close();
  return { bad, big, a, exact, otherLang, otherStarter, olderBefore: olderBefore.length, olderForNew, persisted, cleared, after };
});
check('code draft: unknown problem and >128K source rejected with a reason', rcd.bad.ok === false && rcd.bad.reason === 'unknown-problem' && rcd.big.ok === false && rcd.big.reason === 'too-large', JSON.stringify([rcd.bad, rcd.big]));
check('code draft: exact match only (same pack, language, starter); persists across store instances; clears', rcd.a.ok && rcd.exact?.source === 'print(1)\n' && rcd.otherLang === null && rcd.otherStarter === null && rcd.persisted?.source === 'print(1)\n' && rcd.cleared === true && rcd.after === null, JSON.stringify(rcd));
check('code draft: a changed starter/revision DISCOVERS the older draft (returned, not applied) and never exposes it as the exact draft', rcd.olderBefore === 0 && rcd.olderForNew.length === 1 && rcd.olderForNew[0].source === 'print(1)\n', JSON.stringify([rcd.olderBefore, rcd.olderForNew]));
const rbound = await p3.evaluate(async () => {
  // Mixed-version: editor loaded against OLD pack revision; content swaps to a new one mid-edit. The save must stay under the OLD revision, never relabelled as the current pack.
  const s = await QF5.openV5Store({ userId: window.UID }); const P = 'qfp-ledger-replay', st = 'def main():\n    pass\n', OLD = 'f'.repeat(64);
  const w = await s.saveCodeDraft(P, 'python', st, 'OLD-CODE\n', 20, OLD);
  const asCurrent = await s.getCodeDraft(P, 'python', st); const asOld = await s.getCodeDraft(P, 'python', st, OLD); const older = await s.findOlderCodeDrafts(P, 'python', st); const olderBoundOld = await s.findOlderCodeDrafts(P, 'python', st, OLD);
  await s.clearCodeDraft(P, 'python', st, OLD); const gone = await s.getCodeDraft(P, 'python', st, OLD); s.close();
  return { w: w.ok, asCurrent, asOld: asOld?.source, older: older.map((x) => x.source), olderBoundOld: olderBoundOld.length, gone };
});
check('code draft: a save bound to an OLD pack revision stays under that revision (never the current exact draft); the current revision only discovers it as an older draft', rbound.w && rbound.asCurrent === null && rbound.asOld === 'OLD-CODE\n' && rbound.older.length === 1 && rbound.older[0] === 'OLD-CODE\n' && rbound.olderBoundOld === 0 && rbound.gone === null, JSON.stringify(rbound));
const race = await p3.evaluate(async () => {
  const s = await QF5.openV5Store({ userId: window.UID }); const P = 'qfp-ledger-replay', st = 'def main():\n    pass\n';
  const ps = []; for (let i = 0; i < 25; i++) ps.push(s.saveCodeDraft(P, 'python', st, 'v' + i, i)); const rs = await Promise.all(ps);   // panel chain, unmount flush and others all call the same store method
  const fin = await s.getCodeDraft(P, 'python', st); await s.clearCodeDraft(P, 'python', st); s.close(); return { all: rs.every((r) => r.ok), fin: fin?.source };
});
check('code draft: 25 overlapping saves (as an unmount flush would race a pending save) serialise in the store; the LAST write wins and none is lost to a stale restore', race.all && race.fin === 'v24', JSON.stringify(race));
const cas = await p3.evaluate(async () => { window.__st = []; const T = (p, n) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout at ' + n + ' ' + window.__st.join())), 12000))]);
  return T((async () => {
  const P = 'qfp-ledger-replay', st = 'def main():\n    pass\n';
  const rawGet = (k) => new Promise((res) => { const o = indexedDB.open('qf-v5:' + (window.UID ?? 'anon')); o.onsuccess = () => { const g = o.result.transaction('meta').objectStore('meta').get(k); g.onsuccess = () => { res(g.result?.v); o.result.close(); }; }; });
  const rawPut = (rec) => new Promise((res) => { const o = indexedDB.open('qf-v5:' + (window.UID ?? 'anon')); o.onsuccess = () => { const tx = o.result.transaction('meta', 'readwrite'); tx.objectStore('meta').put(rec); tx.oncomplete = () => { o.result.close(); res(); }; }; });
  const rawAll = () => new Promise((res, rej) => { const o = indexedDB.open('qf-v5:' + (window.UID ?? 'anon')); o.onerror = () => rej(new Error('open error')); o.onblocked = () => rej(new Error('open blocked')); o.onsuccess = () => { try { const g = o.result.transaction('meta').objectStore('meta').getAll(); g.onsuccess = () => { res(g.result); o.result.close(); }; g.onerror = () => rej(new Error('getAll error')); } catch (e) { rej(e); } }; });
  const sp = await QF5.openV5Store({ userId: window.UID }); window.__st.push('open'); await sp.saveCodeDraft(P, 'python', st, 'probe', 1); window.__st.push('saved'); sp.close();
  const all0 = await rawAll(); window.__st.push('raw' + all0.length); const probe = (all0).find((r) => typeof r.k === 'string' && r.k.startsWith('cdraft:' + P + ':python:')); const key = probe.k; const { problemSha: sha, starterSha: sh } = probe.v;   // the key and hashes exactly as the store derived them
  const mk = (source, token) => ({ k: key, v: { problemId: P, language: 'python', problemSha: sha, starterSha: sh, source, savedAt: 1, token } });
  const mkStore = async (flip) => { let n = 0; let armed = false; const st0 = await QF5.openV5Store({ userId: window.UID, fetchImpl: async (u, o) => { if (armed && String(u).includes('/api/auth/me')) { n++; if (n === 1) return new Response(JSON.stringify({ user: { id: window.UID } }), { status: 200 }); await flip?.(); return new Response(JSON.stringify({ user: { id: 'someone-else' } }), { status: 200 }); } return fetch(u, o); } }); await new Promise((r) => setTimeout(r, 700)); armed = true; return st0; };   // armed only after open, so the 1st identity call is the pre-write check and the 2nd is the post-write check
  // A: identity flips between the write and the post-check, nobody else wrote: the previous draft P0 is restored exactly.
  await rawPut(mk('P0', 'p0-token')); const sA = await mkStore(null); window.__st.push('sA'); window.__st.push('A0'); const rA = await sA.saveCodeDraft(P, 'python', st, 'W1', 5); const afterA = await rawGet(key); sA.close();
  // B: identity flips AND a newer write W2 (other token) lands first: rollback must NOT restore P0 over W2 and must not delete it.
  await rawPut(mk('P0', 'p0-token')); const sB = await mkStore(async () => { await rawPut(mk('W2', 'w2-token')); }); const rB = await sB.saveCodeDraft(P, 'python', st, 'W1', 5); const afterB = await rawGet(key); sB.close();
  // C: no previous draft, identity flips, nobody else wrote: the W1 write is removed (nothing left behind).
  await new Promise((res) => { const o = indexedDB.open('qf-v5:' + (window.UID ?? 'anon')); o.onsuccess = () => { const tx = o.result.transaction('meta', 'readwrite'); tx.objectStore('meta').delete(key); tx.oncomplete = () => { o.result.close(); res(); }; }; });
  const sC = await mkStore(null); const rC = await sC.saveCodeDraft(P, 'python', st, 'W1', 5); const afterC = await rawGet(key); sC.close();
  await new Promise((res) => { const o = indexedDB.open('qf-v5:' + (window.UID ?? 'anon')); o.onsuccess = () => { const tx = o.result.transaction('meta', 'readwrite'); tx.objectStore('meta').delete(key); tx.oncomplete = () => { o.result.close(); res(); }; }; });
  return { rA, a: afterA?.source, rB, b: afterB?.source, bTok: afterB?.token, rC, c: afterC ?? null };
  })(), 'cas'); });
check('code draft rollback (deterministic identity flip after the write): previous draft restored; a NEWER write is never overwritten or deleted; with no previous draft the failed write is removed', cas.rA.ok === false && cas.rA.reason === 'identity' && cas.a === 'P0' && cas.rB.ok === false && cas.b === 'W2' && cas.bTok === 'w2-token' && cas.rC.ok === false && cas.c === null, JSON.stringify(cas));
const held = await p3.evaluate(async () => {
  const P = 'qfp-ledger-replay', st = 'def main():\n    pass\n';
  const s = await QF5.openV5Store({ userId: window.UID, fetchImpl: async (u, o) => { if (String(u).includes('/api/auth/me')) throw new TypeError('network down'); return fetch(u, o); } });
  const r = await s.saveCodeDraft(P, 'python', st, 'HELD-OFFLINE', 7); const back = await s.getCodeDraft(P, 'python', st);
  const pos = await s.setPosition('held-lesson', 3, 'cv', 7); const gp = await s.getPosition('held-lesson', 'cv');
  const older = await s.findOlderCodeDrafts(P, 'python', st + '#'); await s.clearCodeDraft(P, 'python', st); const gone = await s.getCodeDraft(P, 'python', st); s.close();
  return { r, back: back?.source, pos, gp: gp?.blockIndex, older: older.length, gone };
});
check('offline / identity unreachable: code drafts and positions are HELD in this account\'s own namespace (saved, read back, cleared); never refused as identity', held.r.ok === true && held.r.held === true && held.back === 'HELD-OFFLINE' && held.pos === true && held.gp === 3 && held.older === 1 && held.gone === null, JSON.stringify(held));
const bind = await p3.evaluate(async () => {
  const dbOf = (u) => 'qf-v5:' + u; const sha = 'a'.repeat(64), qid = 'q-held', rev = 1, resp = { kind: 'shortText', text: 'X' };
  const rawGet = (u, k) => new Promise((res) => { const o = indexedDB.open(dbOf(u)); o.onsuccess = () => { const g = o.result.transaction('meta').objectStore('meta').get(k); g.onsuccess = () => { res(g.result?.v ?? null); o.result.close(); }; }; });
  const mk = async (uid, state, opts = {}) => { const st = { me: state }; const s = await QF5.openV5Store({ userId: uid, ...opts, fetchImpl: async (u, o) => { if (String(u).includes('/api/auth/me')) { if (st.me === 'offline') throw new TypeError('down'); return new Response(JSON.stringify({ user: { id: st.me } }), { status: 200 }); } return fetch(u, o); } }); await new Promise((r) => setTimeout(r, 400)); return { s, st }; };
  const out = {};
  // 1) a store that was NEVER confirmed refuses offline writes (no binding): nothing is attributed to a guessed account
  const a0 = await mk('user-A', 'offline'); out.neverConfirmed = await a0.s.saveDraft(sha, qid, rev, resp, 1); a0.s.close();
  // 2) confirmed once (live), then offline: held write succeeds, flagged held, and reads back
  const a1 = await mk('user-A', 'user-A'); out.confirmedWrite = await a1.s.saveDraft(sha, qid, rev, { kind: 'shortText', text: 'A-confirmed' }, 2); await new Promise((r) => setTimeout(r, 300)); a1.st.me = 'offline';
  out.heldWrite = await a1.s.saveDraft(sha, 'q-held2', rev, { kind: 'shortText', text: 'A-held' }, 3); out.heldRead = (await a1.s.getDraft(sha, 'q-held2', rev))?.response.text; out.heldFlag = (await rawGet('user-A', `draft:${sha}:q-held2:${rev}`))?.held; out.confFlag = (await rawGet('user-A', `draft:${sha}:${qid}:${rev}`))?.held; out.binding = (await rawGet('user-A', 'binding'))?.userId;
  // 3) delayed mismatch: reconnect says another account is signed in -> A's store refuses reads and writes; A's held record is untouched
  a1.st.me = 'user-B'; out.mismatchWrite = await a1.s.saveDraft(sha, 'q-held3', rev, { kind: 'shortText', text: 'B-in-A-tab' }, 4); out.mismatchRead = await a1.s.getDraft(sha, 'q-held2', rev); a1.s.close();
  out.heldStillThere = (await rawGet('user-A', `draft:${sha}:q-held2:${rev}`))?.response.text; out.noB = await rawGet('user-A', `draft:${sha}:q-held3:${rev}`);
  // 4) A offline -> B -> A separation: B's own database never contains or returns A's work; B offline with no binding refuses
  const b0 = await mk('user-B', 'offline'); out.bNeverConfirmed = await b0.s.saveDraft(sha, 'q-b', rev, resp, 5); out.bReadsA = await b0.s.getDraft(sha, 'q-held2', rev); b0.s.close();
  const b1 = await mk('user-B', 'user-B'); out.bWrite = await b1.s.saveDraft(sha, 'q-b', rev, { kind: 'shortText', text: 'B-work' }, 6); out.bReadsAConf = await b1.s.getDraft(sha, 'q-held2', rev); b1.s.close();
  const a2 = await mk('user-A', 'user-A'); out.aBack = (await a2.s.getDraft(sha, 'q-held2', rev))?.response.text; out.aSeesB = await a2.s.getDraft(sha, 'q-b', rev);
  // 5) reconnect on the SAME account: the held flag is NOT auto-promoted; a new confirmed save clears it
  out.flagAfterReconnect = (await rawGet('user-A', `draft:${sha}:q-held2:${rev}`))?.held; await a2.s.saveDraft(sha, 'q-held2', rev, { kind: 'shortText', text: 'A-edited-online' }, 7); out.flagAfterConfirmedSave = (await rawGet('user-A', `draft:${sha}:q-held2:${rev}`))?.held; a2.s.close();
  // 6) a bound offline boot for user-A whose cached account is a different id (stale binding) cannot read A's work: stores are per-account databases
  const sx = await mk('user-C', 'offline'); out.cReadsA = await sx.s.getDraft(sha, 'q-held2', rev); sx.s.close();
  for (const u of ['user-A', 'user-B', 'user-C']) indexedDB.deleteDatabase(dbOf(u));
  return out;
});
check('account binding: a never-confirmed store refuses offline writes (nothing attributed to a guessed account)', bind.neverConfirmed === false && bind.bNeverConfirmed === false, JSON.stringify(bind));
check('account binding: after a live confirmation, offline writes are HELD (flagged held, read back); confirmed writes are not flagged; binding names the account', bind.confirmedWrite === true && bind.heldWrite === 'held' && bind.heldRead === 'A-held' && bind.heldFlag === true && bind.confFlag === false && bind.binding === 'user-A', JSON.stringify(bind));
check('delayed mismatch: reconnect shows another account -> that store refuses reads and writes; the earlier held record stays untouched and nothing of B lands in A', bind.mismatchWrite === false && bind.mismatchRead === null && bind.heldStillThere === 'A-held' && bind.noB === null, JSON.stringify(bind));
check('A offline -> B -> A separation: B never reads or holds A\'s work, A gets only A\'s work back, an unrelated account offline reads nothing', bind.bReadsA === null && bind.bReadsAConf === null && bind.bWrite === true && bind.aBack === 'A-held' && bind.aSeesB === null && bind.cReadsA === null, JSON.stringify(bind));
check('held flag is not auto-promoted on reconnect; a new confirmed save clears it', bind.flagAfterReconnect === true && bind.flagAfterConfirmedSave === false, JSON.stringify(bind));
const rg2 = await page.evaluate(async () => {
  const s = await QF5.openV5Store({ userId: window.UID }); const resp = { kind: 'shortText', text: 'private' };
  const m = await new Promise((res) => { const o = indexedDB.open('qf-v5:' + window.UID); o.onsuccess = () => { const g = o.result.transaction('meta').objectStore('meta').get('manifest'); g.onsuccess = () => res(g.result.v); }; });
  const sha = m.packs.find((p) => p.kind === 'items').sha256;
  const cdB = await s.saveCodeDraft('qfp-ledger-replay', 'python', 's', 'secret', 1); const cdRead = await s.getCodeDraft('qfp-ledger-replay', 'python', 's'); const cdOld = await s.findOlderCodeDrafts('qfp-ledger-replay', 'python', 's2'); const asB = await s.saveDraft(sha, 'qx', 1, resp, 1); const posB = await s.setPosition('lx', 1, 'c', 1); const readB = await s.getDraft(sha, 'qx', 1); const gposB = await s.getPosition('lx', 'c'); s.close(); return { asB, posB, readB, gposB, cdB, cdRead, cdOld };
});
check('identity guard: signed in as ANOTHER account -> draft/position not saved or read (false/null)', rg2.asB === false && rg2.posB === false && rg2.readB === null && rg2.gposB === null && rg2.cdB.ok === false && rg2.cdB.reason === 'identity' && rg2.cdRead === null && rg2.cdOld.length === 0, JSON.stringify(rg2));
check('draft persists across store instances, is not offered for another revision, and is cleared on submit; reading position persists', rd.ok && rd.back && rd.otherRev === null && rd.otherPack === null && rd.pos && rd.gp === 3 && rd.gpOld === null && rd.cleared, JSON.stringify(rd));

const rv = await p3.evaluate(async () => {
  const s = await QF5.openV5Store({ userId: window.UID }); const far = Date.now() + 400 * 86400000;
  const e = (await s.getDueReviews(far))[0]; if (!e) { s.close(); return { none: true }; }
  const id = { questionId: e.card.questionId, revision: e.card.revision, packSha: e.packSha }; const has = async (at) => (await s.getDueReviews(at)).some((x) => x.card.questionId === id.questionId);
  const due0 = e.card.due; const rated = await s.recordReview(id, 'good', Date.now()); const moved = rated.due !== due0 || rated.interval !== e.card.interval;
  const un = await s.undoReview(id); const restored = un.due === due0 && un.interval === e.card.interval && un.ease === e.card.ease; let again = 'none'; try { await s.undoReview(id); } catch (x) { again = x.name; }
  await s.snoozeReview(id, far + 86400000); const snoozed = !(await has(far)); const after = await has(far + 2 * 86400000);
  await s.snoozeReview(id, 0); await s.retireReview(id, true); const retired = !(await has(far)); await s.retireReview(id, false); const back = await has(far);
  await s.retireReview(id, true); const listed = (await s.getRetiredReviews()).some((x) => x.card.questionId === id.questionId); await s.retireReview(id, false); const unlisted = !(await s.getRetiredReviews()).some((x) => x.card.questionId === id.questionId);
  const sBefore = JSON.stringify((await s.getDueReviews(far)).find((x) => x.card.questionId === id.questionId)?.card);
  const offDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine'); Object.defineProperty(Navigator.prototype, 'onLine', { get: () => false, configurable: true });
  const rej = {}; for (const [k, f] of [['undo', () => s.undoReview(id)], ['snooze', () => s.snoozeReview(id, far + 1)], ['retire', () => s.retireReview(id, true)], ['rate', () => s.recordReview(id, 'easy', Date.now())]]) { try { await f(); rej[k] = 'accepted'; } catch (x) { rej[k] = x.name; } }
  Object.defineProperty(Navigator.prototype, 'onLine', offDesc);
  const sAfter = JSON.stringify((await s.getDueReviews(far)).find((x) => x.card.questionId === id.questionId)?.card);
  s.close(); return { moved, restored, again, snoozed, after, retired, back, listed, unlisted, rej, unchanged: sBefore === sAfter };
});
check('review controls (+retired list, +all four REJECT with IdentityUnconfirmed and change nothing when identity cannot be checked): undo restores exact schedule (once only), snooze hides until time, retire hides, unretire returns', !rv.none && rv.moved && rv.restored && rv.again === 'NothingToUndo' && rv.snoozed && rv.after && rv.retired && rv.back && rv.listed && rv.unlisted && Object.values(rv.rej).every((x) => x === 'IdentityUnconfirmed') && rv.unchanged, JSON.stringify(rv));
await browser.close(); console.log(fails ? `FAILED ${fails}` : 'ALL PASS'); process.exit(fails ? 1 : 0);
