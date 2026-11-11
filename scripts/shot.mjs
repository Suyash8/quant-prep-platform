// usage: node scripts/shot.mjs <outDir> [baseUrl] [width] [height]
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path';

const [OUT = '/tmp/audit', BASE = 'http://localhost:3002', W = '1280', H = '900'] = process.argv.slice(2);
const ROOT = process.env.QF_ROOT || process.cwd();
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (/\.(png|json)$|scores\.txt$/.test(f)) fs.rmSync(path.join(OUT, f));

const first = (dir, skip) => { const d = path.join(ROOT, 'content', dir);
  return fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json') && !(skip && f.includes(skip))).sort()[0]?.replace(/\.json$/, '') : ''; };
const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/map/curriculum.json'), 'utf8'));
const l0 = map.phases[0].modules[0].lessons[0];
const ID = { lesson: typeof l0 === 'object' ? l0.id : l0, prob: first('problems'), assess: first('assessments'),
             proj: first('projects'), career: first('companies', 'matrix') };
console.log('IDs', ID);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const hOverflow = {};

async function login() {
  await page.goto(`${BASE}/login`); await page.waitForTimeout(1500);
  await page.fill('input[type=email]', 'visual@test.dev');
  await page.fill('input[type=password]', 'visualtest12345');
  await page.click('button[type=submit]'); await page.waitForTimeout(3000);
}
async function shot(name, route) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'load' }); await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  hOverflow[name] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`${name}: OK  overflowX=${hOverflow[name]}`);
}

await login();
await shot('landing', '/');
await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' })); await page.waitForTimeout(1500);
await shot('login', '/login'); await shot('register', '/register');
await login();
for (const [n, r] of [
  ['dashboard', '/dashboard'], ['curriculum', '/curriculum'], ['learn_list', '/learn'],
  ['lesson', `/learn/${ID.lesson}`], ['practice', '/practice'], ['problem', `/practice/${ID.prob}`],
  ['assessments', '/assessments'], ['assessment', `/assessments/${ID.assess}`], ['drills', '/drills'],
  ['revision', '/revision'], ['lab', '/lab'], ['analytics', '/analytics'], ['projects', '/projects'],
  ['project', `/projects/${ID.proj}`], ['career', '/career'], ['career_detail', `/career/${ID.career}`],
  ['diagnostic', '/diagnostic'], ['planner', '/planner'], ['methodology', '/methodology'],
  ['about', '/about'], ['settings', '/settings'], ['admin', '/admin'],
  // new routes you add go here, at the END, and nowhere else
]) await shot(n, r);

fs.writeFileSync(path.join(OUT, 'overflow.json'), JSON.stringify(hOverflow, null, 2));
await browser.close();
console.log('=== ALL SHOTS DONE ===');
