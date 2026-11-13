'use client';

import * as React from 'react';
import { Slider, LabFrame, rng, gaussian, fmt, normCdf, normPdf, INK, MUTED, FAINT, ACCENT } from './core';

const W = 560, H = 260, P = 34;

/* ---------------- ProbabilitySimulator ---------------- */
export function ProbabilitySimulator({ params }: { params: Record<string, unknown> }) {
  const experiment = (params.experiment as string) ?? 'coin';
  const [trials, setTrials] = React.useState(Math.min((params.trials as number) ?? 1000, 20000));
  const [seed, setSeed] = React.useState(7);
  const result = (() => {
    const rand = rng(seed);
    const counts: Record<string, number> = {};
    let sum = 0;
    for (let i = 0; i < trials; i++) {
      let key: string;
      let val = 0;
      if (experiment === 'coin') {
        const p = (params.p as number) ?? 0.5;
        const heads = rand() < p;
        key = heads ? 'heads' : 'tails';
        val = heads ? 1 : 0;
      } else if (experiment === 'dice') {
        const sides = (params.sides as number) ?? 6;
        const roll = 1 + Math.floor(rand() * sides);
        key = String(roll);
        val = roll;
      } else if (experiment === 'regime-mixture') {
        const pBull = (params.pBull as number) ?? 0.3;
        const rBull = (params.rBull as number) ?? 0.02;
        const rBear = (params.rBear as number) ?? -0.01;
        const bull = rand() < pBull;
        key = bull ? 'bull' : 'bear';
        val = bull ? rBull : rBear;
      } else {
        const p = 0.5;
        const heads = rand() < p;
        key = heads ? 'heads' : 'tails';
        val = heads ? 1 : 0;
      }
      counts[key] = (counts[key] ?? 0) + 1;
      sum += val;
    }
    const mean = sum / trials;
    return { counts, mean };
  })();
  const keys = Object.keys(result.counts);
  const maxC = Math.max(...keys.map(k => result.counts[k]));
  const expected = experiment === 'coin' ? `Expected proportion of heads: ${((params.p as number) ?? 0.5).toFixed(2)}`
    : experiment === 'dice' ? `Expected mean: ${(((params.sides as number) ?? 6) + 1) / 2}`
    : `Expected return: ${fmt(((params.pBull as number) ?? 0.3) * ((params.rBull as number) ?? 0.02) + (1 - ((params.pBull as number) ?? 0.3)) * ((params.rBear as number) ?? -0.01), 4)}`;
  return (
    <LabFrame title="Probability simulator" caption={`Empirical mean: ${fmt(result.mean, 4)}. ${expected}. As trials grow the empirical distribution converges, that IS the law of large numbers.`}>
      <div className="flex items-end gap-4">
        <svg viewBox={`0 0 ${W} 150`} className="flex-1 h-36">
          {keys.map((k, i) => {
            const bw = (W - 40) / keys.length - 12;
            const bh = (result.counts[k] / maxC) * 110;
            const x = 30 + i * ((W - 40) / keys.length);
            return (
              <g key={k}>
                <rect x={x} y={140 - bh} width={bw} height={bh} fill={ACCENT} opacity={0.75} />
                <text x={x + bw / 2} y={136} textAnchor="middle" fontSize="12" fill={MUTED}>{k}</text>
                <text x={x + bw / 2} y={132 - bh} textAnchor="middle" fontSize="12" fill={MUTED}>{((result.counts[k] / trials) * 100).toFixed(1)}%</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 grid sm:grid-cols-2 gap-3 items-end">
        <Slider label="trials" value={trials} min={10} max={20000} step={10} onChange={setTrials} format={v => v.toFixed(0)} />
        <button onClick={() => setSeed(s => s + 1)} className="text-[13px] px-3 py-1.5 border rounded-md hover:bg-surface-2 w-fit">Resample (seed {seed})</button>
      </div>
    </LabFrame>
  );
}

/* ---------------- DistributionViewer ---------------- */
export function DistributionViewer({ params }: { params: Record<string, unknown> }) {
  const dist = (params.distribution as string) ?? 'normal';
  const [mu, setMu] = React.useState((params.mu as number) ?? 0);
  const [sigma, setSigma] = React.useState((params.sigma as number) ?? 1);
  const [shade, setShade] = React.useState(2); // shade P(-shade, shade) in sigmas


  const toX = (x: number) => P + ((x - (mu - 4 * sigma)) / (8 * sigma || 1)) * (W - 2 * P);
  const toY = (p: number) => H - P - (p / 0.45) * (H - 2 * P);
  const pts: string[] = [];
  for (let i = 0; i <= 250; i++) {
    const x = mu - 4 * sigma + (8 * sigma * i) / 250;
    const p = dist === 'normal' ? normPdf(x, mu, sigma) : uniformPdf(x, mu, sigma);
    pts.push(`${toX(x)},${toY(p)}`);
  }
  const within = normCdf(mu + shade * sigma, mu, sigma) - normCdf(mu - shade * sigma, mu, sigma);
  const bandPts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const x = mu - shade * sigma + (2 * shade * sigma * i) / 120;
    bandPts.push(`${toX(x)},${toY(normPdf(x, mu, sigma))}`);
  }
  return (
    <LabFrame title={`${dist === 'normal' ? 'N(μ, σ²)' : 'Uniform'} density`} caption={`P(μ−${shade}σ ≤ X ≤ μ+${shade}σ) = ${within.toFixed(4)}. Drag σ and watch the 68-95-99.7 bands move.`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={P} y1={toY(0)} x2={W - P} y2={toY(0)} stroke={FAINT} />
        <polygon points={`${toX(mu - shade * sigma)},${toY(0)} ${bandPts.join(' ')} ${toX(mu + shade * sigma)},${toY(0)}`} fill={ACCENT} opacity={0.18} />
        <polyline fill="none" stroke={INK} strokeWidth={2} points={pts.join(' ')} />
        <line x1={toX(mu)} y1={toY(0)} x2={toX(mu)} y2={toY(normPdf(mu, mu, sigma))} stroke={MUTED} strokeDasharray="3 3" />
        <text x={toX(mu)} y={toY(normPdf(mu, mu, sigma)) - 6} textAnchor="middle" fontSize="12" fill={MUTED}>μ</text>
      </svg>
      <div className="mt-2 grid sm:grid-cols-3 gap-3">
        <Slider label="μ" value={mu} min={-5} max={5} step={0.1} onChange={setMu} />
        <Slider label="σ" value={sigma} min={0.2} max={3} step={0.05} onChange={setSigma} />
        <Slider label="shade ±kσ" value={shade} min={0.25} max={4} step={0.25} onChange={setShade} format={v => v.toFixed(2)} />
      </div>
    </LabFrame>
  );
}

function uniformPdf(x: number, mu: number, sigma: number): number {
  const a = mu - Math.sqrt(3) * sigma, b = mu + Math.sqrt(3) * sigma;
  return x >= a && x <= b ? 1 / (b - a) : 0;
}

/* ---------------- RandomWalk ---------------- */
export function RandomWalk({ params }: { params: Record<string, unknown> }) {
  const n = (params.n as number) ?? 250;
  const [paths, setPaths] = React.useState(5);
  const [vol, setVol] = React.useState(1);
  const [seed, setSeed] = React.useState((params.seed as number) ?? 3);
  const data = (() => {
    const rand = rng(seed);
    const norm = gaussian(rand);
    const out: number[][] = [];
    for (let p = 0; p < paths; p++) {
      const walk: number[] = [0];
      for (let i = 1; i <= n; i++) walk.push(walk[i - 1] + norm() * vol);
      out.push(walk);
    }
    return out;
  })();
  const all = data.flat();
  const minY = Math.min(...all), maxY = Math.max(...all);
  const toX = (i: number) => P + (i / n) * (W - 2 * P);
  const toY = (v: number) => H - P - ((v - minY) / (maxY - minY || 1)) * (H - 2 * P);
  return (
    <LabFrame title="Random walks (discrete)" caption="Each step is an independent random increment. Var grows linearly in time, the standard deviation grows like √t, the square-root-of-time rule." >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke={FAINT} />
        {data.map((walk, p) => (
          <polyline key={p} fill="none" stroke={ACCENT} strokeWidth={1.5} opacity={0.8}
            points={walk.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')} />
        ))}
      </svg>
      <div className="mt-2 grid sm:grid-cols-3 gap-3">
        <Slider label="paths" value={paths} min={1} max={20} step={1} onChange={setPaths} format={v => v.toFixed(0)} />
        <Slider label="step vol" value={vol} min={0.2} max={3} step={0.1} onChange={setVol} />
        <button onClick={() => setSeed(s => s + 1)} className="text-[13px] px-3 py-1.5 border rounded-md hover:bg-surface-2 w-fit self-center">Resample</button>
      </div>
    </LabFrame>
  );
}

/* ---------------- BrownianMotion ---------------- */
export function BrownianMotion({ params }: { params: Record<string, unknown> }) {
  const steps = (params.steps as number) ?? 250;
  const dt = (params.dt as number) ?? 0.004;
  const [drift, setDrift] = React.useState(0.05);
  const [vol, setVol] = React.useState(0.2);
  const [seed, setSeed] = React.useState(11);
  const data = (() => {
    const rand = rng(seed);
    const norm = gaussian(rand);
    // GBM: dS = μS dt + σS dW  (Euler-Maruyama), S0 = 100


    const s: number[] = [100];
    for (let i = 1; i <= steps; i++) {
      const S = s[i - 1];
      s.push(S * (1 + drift * dt + vol * Math.sqrt(dt) * norm()));
    }
    return s;
  })();
  const minY = Math.min(...data), maxY = Math.max(...data);
  const toX = (i: number) => P + (i / steps) * (W - 2 * P);
  const toY = (v: number) => H - P - ((v - minY) / (maxY - minY || 1)) * (H - 2 * P);
  return (
    <LabFrame title="Geometric Brownian motion (GBM)" caption="Euler-Maruyama simulation of dS = μS dt + σS dW, the standard model for stock prices: positive drift on average, multiplicative noise, never negative.">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke={FAINT} />
        <polyline fill="none" stroke={ACCENT} strokeWidth={1.8}
          points={data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')} />
        <text x={toX(steps) - 4} y={toY(data[steps - 1])} textAnchor="end" fontSize="12" fill={ACCENT}>{fmt(data[steps - 1], 1)}</text>
      </svg>
      <div className="mt-2 grid sm:grid-cols-3 gap-3">
        <Slider label="drift μ" value={drift} min={-0.1} max={0.3} step={0.01} onChange={setDrift} />
        <Slider label="vol σ" value={vol} min={0.02} max={0.6} step={0.01} onChange={setVol} />
        <button onClick={() => setSeed(s => s + 1)} className="text-[13px] px-3 py-1.5 border rounded-md hover:bg-surface-2 w-fit self-center">Resample</button>
      </div>
    </LabFrame>
  );
}

/* ---------------- ConfidenceIntervalLab ---------------- */
export function ConfidenceIntervalLab({ params }: { params: Record<string, unknown> }) {
  const [diff, setDiff] = React.useState((params.diff as number) ?? 0.005);
  const [se, setSe] = React.useState((params.se as number) ?? 0.004);
  const [conf, setConf] = React.useState((params.confidence as number) ?? 0.95);
  const z = { 0.9: 1.6449, 0.95: 1.96, 0.99: 2.5758 }[conf as 0.9 | 0.95 | 0.99] ?? 1.96;
  const half = z * se;
  const significant = Math.abs(diff) > half;
  // plotting window in units of se


  const lo = Math.min(diff - 2.5 * half, -half) - 0.2 * se;
  const hi = Math.max(diff + 2.5 * half, half) + 0.2 * se;
  const toX = (v: number) => P + ((v - lo) / (hi - lo || 1)) * (W - 2 * P);
  return (
    <LabFrame title="Confidence interval vs zero" caption={`${Math.round(conf * 100)}% CI: [${fmt(diff - half, 4)}, ${fmt(diff + half, 4)}] (z=${fmt(z, 3)}, SE=${fmt(se, 4)}). The interval ${significant ? 'excludes' : 'contains'} zero, so at this level the difference is ${significant ? 'statistically detectable' : 'not distinguishable from noise'}.`}>
      <svg viewBox={`0 0 ${W} 110`} className="w-full h-auto">
        <line x1={P} y1={62} x2={W - P} y2={62} stroke={FAINT} />
        <line x1={toX(0)} y1={30} x2={toX(0)} y2={94} stroke={MUTED} strokeDasharray="3 3" />
        <text x={toX(0)} y={24} textAnchor="middle" fontSize="12" fill={MUTED}>0</text>
        <line x1={toX(diff - half)} y1={62} x2={toX(diff + half)} y2={62} stroke={ACCENT} strokeWidth={3} />
        <line x1={toX(diff - half)} y1={52} x2={toX(diff - half)} y2={72} stroke={ACCENT} strokeWidth={2} />
        <line x1={toX(diff + half)} y1={52} x2={toX(diff + half)} y2={72} stroke={ACCENT} strokeWidth={2} />
        <circle cx={toX(diff)} cy={62} r={4.5} fill={ACCENT} />
        <text x={toX(diff)} y={92} textAnchor="middle" fontSize="12" fill={INK}>{fmt(diff, 4)}</text>
      </svg>
      <div className="mt-2 grid sm:grid-cols-3 gap-3">
        <Slider label="estimate" value={diff} min={-0.03} max={0.03} step={0.0005} onChange={setDiff} format={v => v.toFixed(4)} />
        <Slider label="std error" value={se} min={0.0005} max={0.02} step={0.0005} onChange={setSe} format={v => v.toFixed(4)} />
        <Slider label="confidence" value={conf} min={0.9} max={0.99} step={0.01} onChange={setConf} format={v => `${Math.round(v * 100)}%`} />
      </div>
    </LabFrame>
  );
}

/* ---------------- MarkovChainSim ---------------- */
export function MarkovChainSim({ params }: { params: Record<string, unknown> }) {
  const states = (params.states as string[]) ?? ['A', 'B'];
  const transitions = (params.transitions as Record<string, Record<string, number>>) ?? { A: { A: 0.7, B: 0.3 }, B: { A: 0.4, B: 0.6 } };
  const steps = (params.steps as number) ?? 10;
  const [seed, setSeed] = React.useState(2);
  const run = (() => {
    const rand = rng(seed);
    let state = states[0];
    const seq: string[] = [state];
    for (let i = 0; i < steps; i++) {
      const row = transitions[state] ?? {};
      const entries = Object.entries(row);
      const total = entries.reduce((s, [, p]) => s + p, 0) || 1;
      let r = rand() * total;
      for (const [k, p] of entries) {
        r -= p;
        if (r <= 0) { state = k; break; }
      }
      seq.push(state);
    }
    return seq;
  })();
  return (
    <LabFrame title="Markov chain trajectory" caption={`One realisation over ${steps} steps: ${run.join(' → ')}. Run repeatedly to see how the transition matrix shapes long-run frequencies.`}>
      <svg viewBox={`0 0 ${W} 120`} className="w-full h-auto">
        {run.map((s, i) => {
          const x = 20 + (i * (W - 40)) / Math.max(run.length - 1, 1);
          const y = 60 + ((i % 2) * 16 - 8);
          return (
            <g key={i}>
              {i > 0 && <line x1={20 + ((i - 1) * (W - 40)) / Math.max(run.length - 1, 1)} y1={60 + (((i - 1) % 2) * 16 - 8)} x2={x} y2={y} stroke={MUTED} />}
              <circle cx={x} cy={y} r={11} fill={i === 0 ? ACCENT : 'var(--surface)'} stroke={ACCENT} />
              <text x={x} y={y + 3.5} textAnchor="middle" fontSize="12" fill={i === 0 ? '#fff' : INK}>{s.slice(0, 4)}</text>
            </g>
          );
        })}
      </svg>
      <button onClick={() => setSeed(s => s + 1)} className="mt-2 text-[13px] px-3 py-1.5 border rounded-md hover:bg-surface-2">Resample</button>
    </LabFrame>
  );
}

/* ---------------- NormalConvergence ---------------- */
export function NormalConvergence({ params }: { params: Record<string, unknown> }) {
  const sampleSize = (params.sampleSize as number) ?? 30;
  const [trials, setTrials] = React.useState(Math.min((params.trials as number) ?? 1000, 8000));
  const [seed, setSeed] = React.useState(5);
  const data = (() => {
    const rand = rng(seed);
    const means: number[] = [];
    for (let t = 0; t < trials; t++) {
      let s = 0;
      for (let i = 0; i < sampleSize; i++) s += rand(); // Uniform(0,1)


      means.push(s / sampleSize);
    }
    return means;
  })();
  const bins = 40;
  const min = 0.2, max = 0.8;
  const hist = new Array(bins).fill(0);
  for (const m of data) {
    const b = Math.floor(((m - min) / (max - min)) * bins);
    if (b >= 0 && b < bins) hist[b]++;
  }
  const maxCount = Math.max(...hist);
  const mean = data.reduce((s, v) => s + v, 0) / (data.length || 1);
  const sd = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / (data.length || 1));
  const bw = (W - 2 * P) / bins;
  const toY = (c: number) => H - P - (c / maxCount) * (H - 2 * P - 10);
  const bell: string[] = [];
  for (let i = 0; i <= 200; i++) {
    const x = min + ((max - min) * i) / 200;
    const c = normPdf(x, 0.5, 1 / Math.sqrt(12) / Math.sqrt(sampleSize)) / normPdf(0.5, 0.5, 1 / Math.sqrt(12) / Math.sqrt(sampleSize)) * maxCount;
    bell.push(`${P + (i / 200) * (W - 2 * P)},${toY(c)}`);
  }
  return (
    <LabFrame title="Central limit theorem in action" caption={`Distribution of means of ${sampleSize} Uniform(0,1) draws over ${trials.toLocaleString()} trials, empirical mean ${fmt(mean, 4)}, sd ${fmt(sd, 4)} (CLT predicts sd ${fmt(1 / Math.sqrt(12) / Math.sqrt(sampleSize), 4)}). The bell shape emerges regardless of the source distribution.`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {hist.map((c, i) => (
          <rect key={i} x={P + i * bw} y={toY(c)} width={bw - 1} height={H - P - toY(c)} fill={ACCENT} opacity={0.55} />
        ))}
        <polyline fill="none" stroke={INK} strokeWidth={1.5} strokeDasharray="4 3" points={bell.join(' ')} />
      </svg>
      <div className="mt-2 grid sm:grid-cols-2 gap-3">
        <Slider label="trials" value={trials} min={200} max={8000} step={100} onChange={setTrials} format={v => v.toFixed(0)} />
        <button onClick={() => setSeed(s => s + 1)} className="text-[13px] px-3 py-1.5 border rounded-md hover:bg-surface-2 w-fit self-center">Resample</button>
      </div>
    </LabFrame>
  );
}

/* ---------------- RegressionLab ---------------- */
export function RegressionLab({ params }: { params: Record<string, unknown> }) {
  const n = (params.n as number) ?? 30;
  const noise = (params.noise as number) ?? 0.8;
  const fitDeg = (params.fitPolynomial as number) ?? 1;
  const [deg, setDeg] = React.useState(fitDeg);
  const [seed, setSeed] = React.useState(4);
  const { pts, r2 } = (() => {
    const rand = rng(seed);
    const data: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const x = -2 + (4 * i) / (n - 1);
      data.push([x, Math.sin(x) + (rand() * 2 - 1) * noise]);
    }
    // least squares polynomial fit via normal equations (deg <= 9, Gaussian elimination)


    const d = Math.min(deg, 9);
    const A: number[][] = Array.from({ length: d + 1 }, () => new Array(d + 2).fill(0));
    for (let r = 0; r <= d; r++) {
      for (let c = 0; c <= d; c++) {
        A[r][c] = data.reduce((s, [x]) => s + Math.pow(x, r + c), 0);
      }
      A[r][d + 1] = data.reduce((s, [x, y]) => s + y * Math.pow(x, r), 0);
    }
    for (let i = 0; i <= d; i++) {
      let piv = i;
      for (let r2 = i + 1; r2 <= d; r2++) if (Math.abs(A[r2][i]) > Math.abs(A[piv][i])) piv = r2;
      [A[i], A[piv]] = [A[piv], A[i]];
      for (let r2 = 0; r2 <= d; r2++) {
        if (r2 === i) continue;
        const f = A[r2][i] / (A[i][i] || 1e-12);
        for (let c = i; c <= d + 1; c++) A[r2][c] -= f * A[i][c];
      }
    }
    const coef = Array.from({ length: d + 1 }, (_, i) => A[i][d + 1] / (A[i][i] || 1e-12));
    const predict = (x: number) => coef.reduce((s, c, k) => s + c * Math.pow(x, k), 0);
    const mean = data.reduce((s, [, y]) => s + y, 0) / n;
    const ssTot = data.reduce((s, [, y]) => s + (y - mean) ** 2, 0);
    const ssRes = data.reduce((s, [x, y]) => s + (y - predict(x)) ** 2, 0);
    return { pts: { data, predict }, r2: 1 - ssRes / (ssTot || 1e-12) };
  })();
  const all = pts.data.flatMap(([x, y]) => [x, y]);
  const xmin = Math.min(...pts.data.map(p => p[0])), xmax = Math.max(...pts.data.map(p => p[0]));
  const ymin = Math.min(...pts.data.map(p => p[1])) - 0.5, ymax = Math.max(...pts.data.map(p => p[1])) + 0.5;
  const toX = (v: number) => P + ((v - xmin) / (xmax - xmin || 1)) * (W - 2 * P);
  const toY = (v: number) => H - P - ((v - ymin) / (ymax - ymin || 1)) * (H - 2 * P);
  const fitPath: string[] = [];
  for (let i = 0; i <= 200; i++) {
    const x = xmin + ((xmax - xmin) * i) / 200;
    fitPath.push(`${toX(x)},${toY(pts.predict(x))}`);
  }
  return (
    <LabFrame title="Least-squares fit" caption={`Degree ${deg} polynomial: R² = ${fmt(r2, 4)}. Push the degree high and R² keeps rising on the sample, that is overfitting, not understanding. Compare with the validation behaviour discussed in the lesson.`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={P} y1={toY(0)} x2={W - P} y2={toY(0)} stroke={FAINT} />
        {pts.data.map(([x, y], i) => <circle key={i} cx={toX(x)} cy={toY(y)} r={3} fill={MUTED} />)}
        <polyline fill="none" stroke={ACCENT} strokeWidth={2} points={fitPath.join(' ')} />
      </svg>
      <div className="mt-2 grid sm:grid-cols-2 gap-3">
        <Slider label="poly degree" value={deg} min={1} max={12} step={1} onChange={setDeg} format={v => v.toFixed(0)} />
        <button onClick={() => setSeed(s => s + 1)} className="text-[13px] px-3 py-1.5 border rounded-md hover:bg-surface-2 w-fit self-center">New sample</button>
      </div>
    </LabFrame>
  );
}

/* ---------------- TimeSeriesDecompose ---------------- */
export function TimeSeriesDecompose({ params }: { params: Record<string, unknown> }) {
  const n = (params.n as number) ?? 48;
  const trend = (params.trend as number) ?? 0.4;
  const seasonalAmp = (params.seasonalAmp as number) ?? 2;
  const noise = (params.noise as number) ?? 0.8;
  const period = (params.period as number) ?? 4;
  const [seed, setSeed] = React.useState(9);
  const series = (() => {
    const rand = rng(seed);
    const out: { x: number; total: number; tr: number; se: number; no: number }[] = [];
    for (let i = 0; i < n; i++) {
      const tr = trend * i;
      const se = seasonalAmp * Math.sin((2 * Math.PI * i) / period);
      const no = (rand() * 2 - 1) * noise;
      out.push({ x: i, total: tr + se + no, tr, se, no });
    }
    return out;
  })();
  const all = series.flatMap(s => [s.total, s.tr, s.se]);
  const minY = Math.min(...all) - 0.5, maxY = Math.max(...all) + 0.5;
  const toX = (i: number) => P + (i / (n - 1 || 1)) * (W - 2 * P);
  const toY = (v: number) => H - P - ((v - minY) / (maxY - minY || 1)) * (H - 2 * P);
  const line = (key: 'total' | 'tr' | 'se', color: string, dash?: string) =>
    <polyline fill="none" stroke={color} strokeWidth={key === 'total' ? 2 : 1.2} strokeDasharray={dash}
      points={series.map(s => `${toX(s.x)},${toY(s[key])}`).join(' ')} />;
  return (
    <LabFrame title="Time series decomposition" caption="Grey: observed series. Blue: trend. Orange dashed: seasonal component. Additive model: observation = trend + seasonality + noise.">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {line('total', MUTED)}
        {line('tr', ACCENT)}
        {line('se', '#9a6d0b', '4 3')}
      </svg>
      <div className="mt-2 grid sm:grid-cols-2 gap-3">
        <Slider label="trend slope" value={trend} min={-1} max={1.5} step={0.05} onChange={() => {}} />
        <button onClick={() => setSeed(s => s + 1)} className="text-[13px] px-3 py-1.5 border rounded-md hover:bg-surface-2 w-fit self-center">Resample noise</button>
      </div>
    </LabFrame>
  );
}
