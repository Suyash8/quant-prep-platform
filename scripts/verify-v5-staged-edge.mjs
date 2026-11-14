// node scripts/verify-v5-staged-edge.mjs [baseUrl]  Production build. Two edge cases of progressive availability: (1) the manifest CHANGES while a first download is staged (stored packs must never cross manifest versions); (2) device storage fails mid-download (quota).
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? 'playwright'); const base = process.argv[2] ?? 'http://localhost:3112'; let fails = 0; const check = (n, ok, x = '') => { console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : String(x)); if (!ok) fails++; };
const b = await chromium.launch();
const mk = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.request.post(base + '/api/auth/login', { data: { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD } }); return ctx; };
const readIdb = (page) => page.evaluate(async () => { const dbs = await indexedDB.databases(); const out = { packs: 0, staged: null, committed: null }; for (const d of dbs) { if (!d.name?.startsWith('qf-v5')) continue; await new Promise((res) => { const o = indexedDB.open(d.name); o.onsuccess = () => { const db = o.result; if (!db.objectStoreNames.contains('packs')) return res(); const tx = db.transaction(['packs', 'meta']); const c = tx.objectStore('packs').count(); c.onsuccess = () => { out.packs = Math.max(out.packs, c.result); }; const s = tx.objectStore('meta').get('staged'); s.onsuccess = () => { if (s.result) out.staged = s.result.v.manifest.contentVersion; }; const m = tx.objectStore('meta').get('manifest'); m.onsuccess = () => { if (m.result) out.committed = m.result.v.contentVersion; }; tx.oncomplete = () => res(); }; o.onerror = () => res(); }); } return out; });
const ctx = await mk(); const man = await (await ctx.request.get(base + '/v5/manifest.json')).json(); const lessons = man.packs.filter((p) => p.kind === 'lesson'); const total = man.packs.length;
// ---------- (1) manifest changes while staged ----------
const lessonA = lessons[0].id; const lessonOnlyInA = lessons[1].id;                      // both stored early
const manB = { ...man, contentVersion: man.contentVersion + '-B', packs: man.packs.filter((p) => p.id !== lessonOnlyInA) };   // B drops one lesson but is otherwise valid
let phase = 'A'; let served = 0, limit = 40; let manifestSwapped = false;
await ctx.route(/\/v5\/manifest\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(phase === 'A' ? man : manB) }));
await ctx.route(/\/v5\/packs\//, (r) => { if (served++ < limit) r.continue(); else r.abort(); });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(base + '/v5/learn', { timeout: 100000 }); await page.waitForTimeout(7000);
let idb = await readIdb(page); check('A staged and partial', idb.staged === man.contentVersion && idb.committed === null && idb.packs > 0 && idb.packs < total, JSON.stringify(idb));
phase = 'B'; served = 0; limit = 10; await page.goto(base + '/v5/learn'); await page.waitForTimeout(7000);
idb = await readIdb(page); check('manifest changed: the staged pointer moves to B, nothing committed', idb.staged === manB.contentVersion && idb.committed === null, JSON.stringify(idb));
await page.goto(base + '/v5/learn/' + lessonOnlyInA); await page.waitForTimeout(3000); let body = await page.locator('body').innerText();
check('a lesson whose pack is stored from A but is NOT in B does not open (no crossing manifest versions)', !/BUILD THE IDEA/.test(body), body.slice(0, 200));
await page.goto(base + '/v5/learn/' + lessonA); await page.waitForTimeout(3000); body = await page.locator('body').innerText();
check('a lesson in B with a verified stored pack opens', /BUILD THE IDEA/.test(body), body.slice(0, 200));
await page.goto(base + '/v5/learn'); await page.waitForTimeout(1500); body = await page.locator('body').innerText(); check('still not reported ready', !/Offline library ready/.test(body));
await ctx.unroute(/\/v5\/packs\//); await page.goto(base + '/v5/learn'); const ready = await page.getByText('Offline library ready').waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
idb = await readIdb(page); check('B completes: committed manifest is B, staged record removed', ready && idb.committed === manB.contentVersion && idb.staged === null, JSON.stringify(idb));
await ctx.close();
// ---------- (2) quota mid-download ----------
const ctx2 = await mk(); await ctx2.addInitScript(() => { let n = 0; const orig = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (...a) { if (this.name === 'packs' && n++ >= 30) throw new DOMException('quota', 'QuotaExceededError'); return orig.apply(this, a); }; });
const p2 = await ctx2.newPage(); p2.on('pageerror', (e) => errs.push(String(e)));
await p2.goto(base + '/v5/learn', { timeout: 100000 }); await p2.waitForTimeout(8000); body = await p2.locator('body').innerText();
idb = await readIdb(p2);
check('quota: library not ready, storage-full notice shown, some packs stored', !/Offline library ready/.test(body) && /Device storage is full/.test(body) && idb.packs > 0 && idb.packs < total, JSON.stringify(idb) + body.slice(0, 200));
check('quota: manifest not committed', idb.committed === null, JSON.stringify(idb));
await p2.goto(base + '/v5/learn/' + lessonA); await p2.waitForTimeout(3000); body = await p2.locator('body').innerText();
check('quota: a pack stored before the failure is still usable', /BUILD THE IDEA/.test(body), body.slice(0, 200));
check('no page errors', errs.length === 0, errs.join('|'));
console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
