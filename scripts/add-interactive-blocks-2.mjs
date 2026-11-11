#!/usr/bin/env node
// Phase 5 content gate, second batch: the remaining lessons without an
// interactive block. Same rules as add-interactive-blocks.mjs.
// Usage: node scripts/add-interactive-blocks-2.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const ASSIGN = {
  'ph4-cpp-l8/cpp-benchmarking-profiling': {
    component: 'PercentileExplorer',
    params: {},
    caption: 'Benchmark the tail, not the mean: the p99 is what your users feel.',
  },
  'ph4-cpp-l8/cpp-branchless-simd': {
    component: 'ComplexityCompare',
    params: {},
    caption: 'Branchless trades a branch for arithmetic: watch the growth curves and guess which wins.',
  },
  'ph4-cpp-l9/cpp-production-debugging': {
    component: 'TerminalSteps',
    params: { steps: [
      { cmd: 'gdb ./app -ex "run" -ex "bt"', out: ['Program received signal SIGSEGV', '#0 0x4011a6 in OrderBook::top() at orderbook.cpp:88', '#1 0x401204 in main at main.cpp:31'] },
      { cmd: 'valgrind --leak-check=full ./app 2>&1 | tail -3', out: ['HEAP SUMMARY:', '  definitely lost: 512 bytes in 1 blocks', 'LEAK SUMMARY: 0 bytes definitely lost in 0 reaches'] },
    ] },
    caption: 'A stack trace and a leak report: the two artifacts production debugging lives on.',
  },
  'ph4-cpp-l9/cpp-testing-frameworks': {
    component: 'RegressionLab',
    params: { n: 36, noise: 0.6, fitPolynomial: 1 },
    caption: 'A test suite is a regression line through your defect history: watch the fit tighten.',
  },
  'ph4-cpp-l9/cpp-tooling': {
    component: 'PipePipeline',
    params: { commands: ['cat build.log', 'grep warning', "awk '{print $1}'", 'sort | uniq -c', 'sort -rn | head -5'] },
    caption: 'Tooling is pipelines: compose small commands until the build tells you its secrets.',
  },
  'ph5-algorithms/alg-dynamic-programming': {
    component: 'ComplexityCompare',
    params: {},
    caption: 'Memoisation collapses exponential trees into linear tables: the curves tell the story.',
  },
  'ph6-logical-reasoning/lr-constraints': {
    component: 'MarkovChainSim',
    params: {},
    caption: 'Constraint propagation as state evolution: each step rules out neighbours.',
  },
  'ph6-logical-reasoning/lr-deduction': {
    component: 'BSTVisual',
    params: {},
    caption: 'Deduction prunes the search space like a balanced tree: each fact halves the remainder.',
  },
  'ph6-logical-reasoning/lr-truth-tables': {
    component: 'HashTableVisual',
    params: {},
    caption: 'A truth table is a lookup structure: every assignment lands in exactly one cell.',
  },
  'ph7-backtesting/bt-data-biases': {
    component: 'RandomWalk',
    params: {},
    caption: 'Survivorship and lookahead bias bend the walk: generate a few and spot the too-good one.',
  },
  'ph7-backtesting/bt-lookahead-costs': {
    component: 'LatencyBudget',
    params: {},
    caption: 'Lookahead is negative latency: free microseconds you will not get in production.',
  },
  'ph7-backtesting/bt-overfitting-validation': {
    component: 'RegressionLab',
    params: { n: 24, noise: 1.6, fitPolynomial: 4 },
    caption: 'Degree 4 through 24 noisy points: that perfect fit is overfitting, live.',
  },
  'ph7-backtesting/bt-strategy-evaluation': {
    component: 'TimeSeriesDecompose',
    params: {},
    caption: 'Split a strategy curve into trend and noise before you judge it.',
  },
  'ph7-instruments/inst-swaps-fx-credit': {
    component: 'YieldCurveLab',
    params: {},
    caption: 'Swaps price off the curve: move it and watch the floating leg reprice.',
  },
  'ph7-market-fundamentals/mkt-bid-ask-liquidity': {
    component: 'OrderBookVisual',
    params: {},
    caption: 'Liquidity is depth you can trade against: drag the price and watch the book absorb it.',
  },
  'ph7-market-fundamentals/mkt-order-types': {
    component: 'OrderStateMachine',
    params: { quantity: 500 },
    caption: 'Market, limit, stop: same lifecycle, different exits. Send an order and follow it.',
  },
  'ph7-market-fundamentals/mkt-participants': {
    component: 'MatchingSim',
    params: {},
    caption: 'Price-time priority does not care who you are: queue behind the resting orders.',
  },
  'ph7-market-fundamentals/mkt-structure': {
    component: 'OrderBookVisual',
    params: {},
    caption: 'Venue structure in one picture: the book, the spread and the tape.',
  },
  'ph7-microstructure/mic-adverse-selection': {
    component: 'MatchingSim',
    params: {},
    caption: 'Adverse selection is being filled exactly when you wish you were not: rest an order and feel it.',
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
console.log(`\n${changed} lesson(s) updated`);
