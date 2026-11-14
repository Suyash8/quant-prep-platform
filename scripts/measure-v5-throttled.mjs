// node scripts/measure-v5-throttled.mjs [baseUrl]  Production build, fresh browser context per profile. CDP-emulated CPU slowdown and network (latency + bandwidth) on a LOCAL machine: an emulation, not a real phone or carrier, and no SLO is claimed. Measures first lesson-route paint and the time for the full offline library download to report complete.
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? 'playwright'); const base = process.argv[2] ?? 'http://localhost:3112';
const profiles = [{ name: 'no throttle', cpu: 1, down: -1, up: -1, rtt: 0 }, { name: 'CPU x4, 1.6 Mbps / 150 ms RTT', cpu: 4, down: 1.6e6 / 8, up: 0.75e6 / 8, rtt: 150 }, { name: 'CPU x6, 400 kbps / 400 ms RTT', cpu: 6, down: 0.4e6 / 8, up: 0.4e6 / 8, rtt: 400 }];
const only = process.env.QF_PROFILE ? Number(process.env.QF_PROFILE) : null;
for (const [i, p] of profiles.entries()) { if (only !== null && i !== only) continue;
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.request.post(base + '/api/auth/login', { data: { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD } });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: p.rtt, downloadThroughput: p.down, uploadThroughput: p.up });
  let bytes = 0; cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
  const t0 = Date.now(); await page.goto(base + '/v5/learn/qf5-python-control-flow', { waitUntil: 'commit', timeout: 120000 });
  await page.getByText('BUILD THE IDEA').first().waitFor({ timeout: 110000 }).catch(() => {}); const tLesson = Date.now() - t0; 
  await page.goto(base + '/v5/learn', { timeout: 110000 }); const t1 = Date.now();
  const done = await page.getByText('Offline library ready').waitFor({ timeout: 110000 }).then(() => true).catch(() => false); const tLib = Date.now() - t1;
  console.log(JSON.stringify({ profile: p.name, firstLessonVisibleMs: tLesson, offlineLibraryComplete: done, offlineLibraryMsFromLearnLoad: done ? tLib : `>${tLib} (not complete in 110 s)`, transferredMB: +(bytes / 1048576).toFixed(1) }));
  await b.close(); }
