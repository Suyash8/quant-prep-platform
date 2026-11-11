#!/usr/bin/env node
// Phase 5 content gate: add a registered interactive block to lessons that
// lack one (Part 8.4). Each assignment picks the closest existing lab from
// src/components/interactive/registry.tsx. Idempotent: skips lessons that
// already have an interactive block.
// Usage: node scripts/add-interactive-blocks.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const ASSIGN = {
  'ph2-software-engineering/swe-design-patterns': {
    component: 'ComplexityCompare',
    params: {},
    caption: 'Pattern choice is a complexity trade: swap the strategies and watch the cost curves split.',
    after: 'h2',
  },
  'ph2-software-engineering/swe-git': {
    component: 'TerminalSteps',
    params: { steps: [
      { cmd: 'git status', out: ['On branch main', 'Changes not staged for commit:', '  modified: main.cpp'] },
      { cmd: 'git add main.cpp && git commit -m "fix"', out: ['[main 4f2a91c] fix', ' 1 file changed, 12 insertions(+), ' + ' 3 deletions(-)'] },
      { cmd: 'git log --oneline -3', out: ['4f2a91c fix', '9c31be7 feat: order book parser', 'a1d0e42 init'] },
    ] },
    caption: 'Step through the three commands every workflow is built from: status, commit, log.',
  },
  'ph2-software-engineering/swe-testing': {
    component: 'RegressionLab',
    params: { n: 40, noise: 1.2, fitPolynomial: 1 },
    caption: 'Fit a line to noisy defect data: one test suite is a sample, the trend is the signal.',
  },
  'ph3-advanced-python/py-asyncio': {
    component: 'LatencyBudget',
    params: {},
    caption: 'Where the milliseconds of one request go, and what awaiting I/O instead of blocking buys you.',
  },
  'ph3-advanced-python/py-cpp-interop': {
    component: 'MemoryLayout',
    params: {},
    caption: 'Crossing the boundary means agreeing on layout: pad a struct the same way on both sides.',
  },
  'ph3-advanced-python/py-gil-threading': {
    component: 'LatencyBudget',
    params: {},
    caption: 'One core at a time for Python bytecode: see where the time goes when threads contend.',
  },
  'ph3-advanced-python/py-profiling': {
    component: 'PercentileExplorer',
    params: {},
    caption: 'Means lie, tails do not: profile the p99, not the average.',
  },
  'ph3-python-foundations/py-files-errors': {
    component: 'PipePipeline',
    params: { commands: ['cat trades.csv', 'grep BUY', "awk -F, '{print $3}'", 'sort -n', 'head -5'] },
    caption: 'Files are streams: every stage reads and writes, and errors flow the same way.',
  },
  'ph3-scientific-python/spy-pandas': {
    component: 'JoinVisual',
    params: {},
    caption: 'merge, join, concat in one picture: the four join types on toy ticker tables.',
  },
  'ph3-scientific-python/spy-visualisation': {
    component: 'TimeSeriesDecompose',
    params: {},
    caption: 'Every good chart starts with decomposition: trend, season, noise, drawn apart.',
  },
  'ph4-cpp-l1/cpp-compilation-model': {
    component: 'TerminalSteps',
    params: { steps: [
      { cmd: 'g++ -E main.cpp -o main.i', out: ['preprocess: 12,041 lines after header expansion'] },
      { cmd: 'g++ -S main.i -o main.s', out: ['compile: main.s, x86-64 assembly generated'] },
      { cmd: 'g++ -c main.s -o main.o', out: ['assemble: main.o, ELF relocatable object'] },
      { cmd: 'g++ main.o -o app', out: ['link: app, executable with runtime dependencies'] },
    ] },
    caption: 'The four stops every C++ file makes on the way to a binary. Run them one at a time.',
  },
  'ph4-cpp-l1/cpp-control-functions': {
    component: 'FunctionPlotter',
    params: { a: 1, b: -2, c: 0 },
    caption: 'A function in code and a function in math: move the coefficients and watch control flow flatten.',
  },
  'ph4-cpp-l1/cpp-references-pointers': {
    component: 'MemoryLayout',
    params: {},
    caption: 'Pointers are addresses: watch where each field actually lands in memory.',
  },
  'ph4-cpp-l1/cpp-structs-enums-namespaces': {
    component: 'MemoryLayout',
    params: {},
    caption: 'Struct layout rules the compiler follows: order fields differently, pay a different size.',
  },
  'ph4-cpp-l2/cpp-operator-overloading': {
    component: 'MatrixTransform',
    params: {},
    caption: 'operator* on matrices: overload the symbol, keep the math honest.',
  },
  'ph4-cpp-l6/cpp-internals-abi': {
    component: 'MemoryLayout',
    params: {},
    caption: 'The ABI is a layout contract: same struct, same offsets, or garbage at the boundary.',
  },
  'ph4-cpp-l6/cpp-internals-linking': {
    component: 'TerminalSteps',
    params: { steps: [
      { cmd: 'nm -C app | grep -i "order" | head -3', out: ['00000000004011a6 T OrderBook::add(Order)', '0000000000401204 T OrderBook::top() const'] },
      { cmd: 'objdump -d app | grep -c "call"', out: ['182'] },
      { cmd: 'ldd app', out: ['libstdc++.so.6 => /usr/lib/x86_64-linux-gnu/libstdc++.so.6', 'libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6'] },
    ] },
    caption: 'Symbols, relocations and dependencies: the three things a linker actually resolves.',
  },
  'ph4-cpp-l6/cpp-internals-optimisation': {
    component: 'FloatErrorLab',
    params: {},
    caption: 'What an optimiser may and may not reorder: float math is not associative, prove it here.',
  },
  'ph4-cpp-l7/cpp-futures-async': {
    component: 'LatencyBudget',
    params: {},
    caption: 'One thread waiting is not one thread working: budget the wait out of your latency.',
  },
};

let changed = 0;
for (const [lessonPath, block] of Object.entries(ASSIGN)) {
  const file = path.join(ROOT, 'content/lessons', `${lessonPath}.json`);
  if (!fs.existsSync(file)) { console.log(`MISSING ${lessonPath}`); continue; }
  const lesson = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (lesson.blocks?.some(b => b.type === 'interactive')) { console.log(`skip (has block) ${lessonPath}`); continue; }
  // insert after the first h2 (a concept section start) or at the end of the first third
  let idx = lesson.blocks.findIndex(b => b.type === 'h2');
  if (idx === -1) idx = Math.min(Math.floor(lesson.blocks.length / 2), lesson.blocks.length - 1);
  lesson.blocks.splice(idx + 1, 0, { type: 'interactive', ...block });
  fs.writeFileSync(file, JSON.stringify(lesson, null, 2) + '\n');
  changed++;
  console.log(`added ${block.component} to ${lessonPath}`);
}
console.log(`\n${changed} lesson(s) updated`);
