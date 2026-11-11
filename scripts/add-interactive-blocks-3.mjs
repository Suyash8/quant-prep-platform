#!/usr/bin/env node
// Phase 5 content gate, third batch: the final lessons without an
// interactive block (the validator's first-20 cap hid these) plus body-text
// expansions for the two "body text seems short" lessons.
// Usage: node scripts/add-interactive-blocks-3.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const ASSIGN = {
  'ph7-microstructure/mic-spreads-impact': {
    component: 'OrderBookVisual',
    params: {},
    caption: 'Impact is the spread you cross plus the depth you consume: try to trade a big clip here.',
  },
  'ph7-portfolio/pf-factor-models-attribution': {
    component: 'CovarianceLab',
    params: {},
    caption: 'Attribution needs the covariance structure: rotate the scatter and watch the factors appear.',
  },
  'ph7-portfolio/pf-performance-ratios': {
    component: 'RegressionLab',
    params: { n: 48, noise: 0.9, fitPolynomial: 1 },
    caption: 'Sharpe is reward per unit of scatter: the tighter the cloud around the line, the better the ratio.',
  },
  'ph7-risk/risk-drawdown-hedging': {
    component: 'BrownianMotion',
    params: {},
    caption: 'Drawdown is the deepest valley on the path: run a few paths and find the worst one.',
  },
  'ph7-risk/risk-es-stress': {
    component: 'DistributionViewer',
    params: {},
    caption: 'Expected shortfall is the average of the bad tail: shrink sigma and see the tail thin out.',
  },
  'ph7-risk/risk-taxonomy': {
    component: 'MonteCarloPi',
    params: {},
    caption: 'Model risk in one experiment: wrong assumptions, wrong answer, regardless of sample size.',
  },
  'ph9-pricing/prc-forwards-futures-pricing': {
    component: 'YieldCurveLab',
    params: {},
    caption: 'Cost of carry lives on the curve: shift it and watch the fair forward move.',
  },
};

let changed = 0;
for (const [lessonPath, block] of Object.entries(ASSIGN)) {
  const file = path.join(ROOT, 'content/lessons', `${lessonPath}.json`);
  if (!fs.existsSync(file)) { console.log(`MISSING ${lessonPath}`); continue; }
  const lesson = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (lesson.blocks?.some(b => b.type === 'interactive')) { console.log(`skip (has block) ${lessonPath}`); continue; }
  let idx = lesson.blocks.findIndex(b => b.type === 'h2');
  if (idx === -1) idx = Math.min(Math.floor(lesson.blocks.length / 2), lesson.blocks.length - 1);
  lesson.blocks.splice(idx + 1, 0, { type: 'interactive', ...block });
  fs.writeFileSync(file, JSON.stringify(lesson, null, 2) + '\n');
  changed++;
  console.log(`added ${block.component} to ${lessonPath}`);
}

// body text expansion: geo-coordinate-geometry (append two paragraphs)
const geo = path.join(ROOT, 'content/lessons/ph1-geometry/geo-coordinate-geometry.json');
if (fs.existsSync(geo)) {
  const lesson = JSON.parse(fs.readFileSync(geo, 'utf8'));
  const extra = [
    'These ideas scale straight onto the trading floor. Every position you will ever manage is a coordinate: a quantity in a contract, a price on an axis, a point in time. Risk systems are, at their core, distance calculations in a high dimensional space, and the Pythagorean intuition you build here is the same one a risk engine uses when it aggregates exposure across desks.',
    'Coordinates also train the habit that makes quantitative work possible: state where you are precisely, then move with intent. Vague positions, like vague points, cannot be compared, hedged or verified. By the end of this lesson you will translate between descriptions and coordinates fluently, which is exactly the skill you will later use to translate between a trade idea and a model input.',
  ];
  let before = 0;
  for (const b of lesson.blocks) if (b.type === 'p') before += String(b.text ?? '').split(/\s+/).length;
  if (before < 250) {
    lesson.blocks.push({ type: 'p', text: extra[0] }, { type: 'p', text: extra[1] });
    fs.writeFileSync(geo, JSON.stringify(lesson, null, 2) + '\n');
    console.log('expanded geo-coordinate-geometry body (+2 paragraphs)');
  }
}

// body text expansion: risk-drawdown-hedging
const dd = path.join(ROOT, 'content/lessons/ph7-risk/risk-drawdown-hedging.json');
if (fs.existsSync(dd)) {
  const lesson = JSON.parse(fs.readFileSync(dd, 'utf8'));
  const extra = [
    'Drawdown is the risk number clients actually feel. Volatility can be hedged, explained and annualised away in a report, but a 30 percent drawdown is a phone call, a redemption request and a career conversation. That asymmetry is why risk teams report maximum drawdown and time-under-water alongside every Sharpe ratio, and why recovery math matters: climbing out of a 30 percent hole requires a 43 percent gain, not 30.',
    'Hedging is the deliberate purchase of a smaller expected loss in exchange for a smaller worst case. The craft is paying the least for the protection you need: choosing the instrument, the strike, the notional and the horizon so the hedge bites exactly when the portfolio bleeds. In this lesson you will size hedges against drawdown thresholds rather than variance, which is how protection is actually bought on a desk.',
  ];
  let before = 0;
  for (const b of lesson.blocks) if (b.type === 'p') before += String(b.text ?? '').split(/\s+/).length;
  if (before < 250) {
    lesson.blocks.push({ type: 'p', text: extra[0] }, { type: 'p', text: extra[1] });
    fs.writeFileSync(dd, JSON.stringify(lesson, null, 2) + '\n');
    console.log('expanded risk-drawdown-hedging body (+2 paragraphs)');
  }
}

console.log(`\n${changed} lesson(s) updated`);
