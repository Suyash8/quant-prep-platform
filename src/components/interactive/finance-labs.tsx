'use client';

import * as React from 'react';
import { Slider, LabFrame, fmt, erf, INK, MUTED, FAINT, ACCENT } from './core';

const W = 560, H = 260, P = 36;

function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}
function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}
export function blackScholes(S: number, K: number, r: number, sigma: number, T: number, isCall: boolean) {
  if (T <= 0 || sigma <= 0) {
    const intrinsic = isCall ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return { price: intrinsic, delta: isCall ? (S > K ? 1 : S < K ? 0 : 0.5) : (S < K ? -1 : S > K ? 0 : -0.5), gamma: 0, theta: 0, vega: 0, rho: 0, d1: 0, d2: 0 };
  }
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const disc = Math.exp(-r * T);
  const call = S * normCdf(d1) - K * disc * normCdf(d2);
  const put = K * disc * normCdf(-d2) - S * normCdf(-d1);
  const price = isCall ? call : put;
  const delta = isCall ? normCdf(d1) : normCdf(d1) - 1;
  const gamma = normPdf(d1) / (S * sigma * Math.sqrt(T));
  const theta = (-(S * normPdf(d1) * sigma) / (2 * Math.sqrt(T)) - (isCall ? r * K * disc * normCdf(d2) : -r * K * disc * normCdf(-d2))) / 365;
  const vega = (S * normPdf(d1) * Math.sqrt(T)) / 100;
  const rho = ((isCall ? K * T * disc * normCdf(d2) : -K * T * disc * normCdf(-d2))) / 100;
  return { price, delta, gamma, theta, vega, rho, d1, d2 };
}

/* ---------------- BlackScholesLab ---------------- */
export function BlackScholesLab({ params }: { params: Record<string, unknown> }) {
  const [S, setS] = React.useState((params.spot as number) ?? 100);
  const [K, setK] = React.useState((params.strike as number) ?? 100);
  const [r, setR] = React.useState((params.rate as number) ?? 0.05);
  const [vol, setVol] = React.useState((params.vol as number) ?? 0.25);
  const [T, setT] = React.useState((params.maturity as number) ?? 1);
  const isCall = ((params.type as string) ?? 'call') === 'call';
  const bs = blackScholes(S, K, r, vol, T, isCall);
  // price curve across spot


  const Smin = Math.max(K * 0.4, 1), Smax = K * 1.6;
  const priceSeries: { s: number; p: number; pay: number }[] = [];
  for (let i = 0; i <= 200; i++) {
    const s = Smin + ((Smax - Smin) * i) / 200;
    priceSeries.push({ s, p: blackScholes(s, K, r, vol, T, isCall).price, pay: isCall ? Math.max(s - K, 0) : Math.max(K - s, 0) });
  }
  const maxY = Math.max(...priceSeries.map(x => x.p), K * 0.3);
  function mapX(s: number, lo: number, hi: number) { return P + ((s - lo) / (hi - lo)) * (W - 2 * P); }
  function mapY(p: number) { return H - P - (p / (maxY || 1)) * (H - 2 * P); }
  const curve = priceSeries.map(x => `${mapX(x.s, Smin, Smax)},${mapY(x.p)}`);
  const payCurve = priceSeries.map(x => `${mapX(x.s, Smin, Smax)},${mapY(x.pay)}`);
  return (
    <LabFrame title={`Black-Scholes ${isCall ? 'call' : 'put'} lab`} caption={`Price = ${fmt(bs.price, 4)}  (d₁=${fmt(bs.d1, 4)}, d₂=${fmt(bs.d2, 4)}). Every slider re-prices the option instantly.`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={P} y1={mapY(0)} x2={W - P} y2={mapY(0)} stroke={FAINT} />
        <line x1={mapX(K, Smin, Smax)} y1={P} x2={mapX(K, Smin, Smax)} y2={H - P} stroke={FAINT} strokeDasharray="3 3" />
        <text x={mapX(K, Smin, Smax)} y={P + 10} textAnchor="middle" fontSize="10" fill={MUTED}>K={K}</text>
        <polyline fill="none" stroke={MUTED} strokeDasharray="4 3" points={payCurve.join(' ')} />
        <polyline fill="none" stroke={ACCENT} strokeWidth={2} points={curve.join(' ')} />
        <circle cx={mapX(S, Smin, Smax)} cy={mapY(bs.price)} r={4.5} fill={ACCENT} />
        <text x={mapX(S, Smin, Smax) + 6} y={mapY(bs.price) - 6} fontSize="11" fill={ACCENT}>{fmt(bs.price, 3)}</text>
      </svg>
      <div className="mt-2 grid sm:grid-cols-2 gap-3">
        <Slider label="spot S" value={S} min={K * 0.4} max={K * 1.6} step={0.5} onChange={setS} />
        <Slider label="strike K" value={K} min={50} max={200} step={1} onChange={setK} format={v => v.toFixed(0)} />
        <Slider label="rate r" value={r} min={0} max={0.15} step={0.005} onChange={setR} format={v => `${(v * 100).toFixed(1)}%`} />
        <Slider label="vol σ" value={vol} min={0.05} max={0.8} step={0.01} onChange={setVol} format={v => `${(v * 100).toFixed(0)}%`} />
        <Slider label="maturity T" value={T} min={0.05} max={3} step={0.05} onChange={setT} format={v => `${v.toFixed(2)}y`} />
      </div>
    </LabFrame>
  );
}

/* ---------------- PayoffDiagram ---------------- */
export function PayoffDiagram({ params }: { params: Record<string, unknown> }) {
  const kind = (params.kind as string) ?? 'call';
  const [side, setSide] = React.useState((params.side as string) ?? 'long');
  const [strike, setStrike] = React.useState((params.strike as number) ?? 100);
  const [premium, setPremium] = React.useState((params.premium as number) ?? 4);
  const minSpot = (params.minSpot as number) ?? 60;
  const maxSpot = (params.maxSpot as number) ?? 140;
  const payoff = (s: number): number => {
    let p = 0;
    if (kind === 'call') p = Math.max(s - strike, 0) - premium;
    else if (kind === 'put') p = Math.max(strike - s, 0) - premium;
    else if (kind === 'forward') p = s - strike;
    else if (kind === 'covered-call') p = Math.min(s - strike, 0) + premium;
    else if (kind === 'protective-put') p = s - strike + Math.max(strike - s, 0) - premium;
    else if (kind === 'straddle') p = Math.abs(s - strike) - premium;
    return side === 'short' ? -p : p;
  };
  const series: number[] = [];
  for (let i = 0; i <= 200; i++) {
    const s = minSpot + ((maxSpot - minSpot) * i) / 200;
    series.push(payoff(s));
  }
  const maxPay = Math.max(Math.abs(series[0]), Math.abs(series[series.length - 1]), 1);
  function mapX(s: number) { return P + ((s - minSpot) / (maxSpot - minSpot)) * (W - 2 * P); }
  function clampY(p: number) { const y = H / 2 - (p / maxPay) * (H / 2 - P); return Math.max(P, Math.min(H - P, y)); }
  const pts = series.map((p, i) => `${mapX(minSpot + ((maxSpot - minSpot) * i) / 200)},${clampY(p)}`);
  return (
    <LabFrame title={`${side} ${kind} payoff`} caption="Profit at expiry per share (including premium). The kink at the strike is where the optionality lives.">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={P} y1={H / 2} x2={W - P} y2={H / 2} stroke={FAINT} />
        <line x1={mapX(strike)} y1={P} x2={mapX(strike)} y2={H - P} stroke={FAINT} strokeDasharray="3 3" />
        <text x={mapX(strike)} y={P + 10} textAnchor="middle" fontSize="10" fill={MUTED}>K={strike}</text>
        <polyline fill="none" stroke={ACCENT} strokeWidth={2} points={pts.join(' ')} />
      </svg>
      <div className="mt-2 grid sm:grid-cols-3 gap-3">
        <Slider label="strike" value={strike} min={minSpot} max={maxSpot} step={1} onChange={setStrike} format={v => v.toFixed(0)} />
        <Slider label="premium" value={premium} min={0} max={15} step={0.25} onChange={setPremium} />
        <div className="flex gap-2 text-xs items-center">
          {['long', 'short'].map(s => (
            <button key={s} onClick={() => setSide(s)}
              className={side === s ? 'px-3 py-1.5 rounded-md bg-accent text-accent-foreground' : 'px-3 py-1.5 rounded-md border hover:bg-surface-2'}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </LabFrame>
  );
}

/* ---------------- GreeksLab ---------------- */
export function GreeksLab({ params }: { params: Record<string, unknown> }) {
  const [S, setS] = React.useState((params.spot as number) ?? 100);
  const [K] = React.useState((params.strike as number) ?? 100);
  const [r] = React.useState((params.rate as number) ?? 0.05);
  const [vol, setVol] = React.useState((params.vol as number) ?? 0.2);
  const [T, setT] = React.useState((params.maturity as number) ?? 1);
  const bs = blackScholes(S, K, r, vol, T, true);
  const grid = [
    { label: 'Delta Δ', value: bs.delta, desc: 'share-equivalent per option; hedge ratio' },
    { label: 'Gamma Γ', value: bs.gamma, desc: 'rate of change of delta' },
    { label: 'Theta Θ/day', value: bs.theta, desc: 'time decay per calendar day' },
    { label: 'Vega ν/1% vol', value: bs.vega, desc: 'sensitivity to volatility' },
    { label: 'Rho ρ/1% rate', value: bs.rho, desc: 'sensitivity to interest rate' },
  ];
  return (
    <LabFrame title="The Greeks (European call)" caption="Move spot/vol/maturity and watch second-order behaviour: gamma is largest near the strike with short maturity, exactly where hedging is hardest.">
      <div className="grid sm:grid-cols-5 gap-2 mb-3">
        {grid.map(g => (
          <div key={g.label} className="border rounded-lg p-2.5 text-center" title={g.desc}>
            <div className="text-[10px] text-faint">{g.label}</div>
            <div className="tnum font-semibold">{fmt(g.value, 4)}</div>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Slider label="spot S" value={S} min={60} max={140} step={0.5} onChange={setS} />
        <Slider label="vol σ" value={vol} min={0.05} max={0.8} step={0.01} onChange={setVol} format={v => `${(v * 100).toFixed(0)}%`} />
        <Slider label="maturity T" value={T} min={0.02} max={2} step={0.02} onChange={setT} format={v => `${v.toFixed(2)}y`} />
      </div>
    </LabFrame>
  );
}

/* ---------------- YieldCurveLab ---------------- */
export function YieldCurveLab({ params }: { params: Record<string, unknown> }) {
  const tenors = (params.tenors as number[]) ?? [0.25, 0.5, 1, 2, 5, 10, 30];
  const [yields, setYields] = React.useState((params.yields as number[]) ?? [0.042, 0.0415, 0.041, 0.0395, 0.0385, 0.039, 0.0405]);
  const [shift, setShift] = React.useState(0);
  const adj = yields.map(y => y + shift);
  const minY = Math.min(...adj) - 0.005, maxY = Math.max(...adj) + 0.005;
  const maxT = Math.max(...tenors);
  const toX = (t: number) => P + (t / maxT) * (W - 2 * P);
  const toY = (y: number) => H - P - ((y - minY) / (maxY - minY || 1)) * (H - 2 * P);
  const shape = adj[adj.length - 1] > adj[0] + 0.0005 ? 'upward-sloping' : adj[adj.length - 1] < adj[0] - 0.0005 ? 'inverted' : 'flat';
  return (
    <LabFrame title="Government yield curve" caption={`Shape: ${shape}. A parallel shift of ${(shift * 100).toFixed(2)}pp moves every tenor equally; real curves twist (short vs long ends move differently).`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke={FAINT} />
        {tenors.map((t, i) => (
          <g key={t}>
            <circle cx={toX(t)} cy={toY(adj[i])} r={4} fill={ACCENT} />
            {i < tenors.length - 1 && (
              <line x1={toX(t)} y1={toY(adj[i])} x2={toX(tenors[i + 1])} y2={toY(adj[i + 1])} stroke={ACCENT} strokeWidth={1.5} />
            )}
            <text x={toX(t)} y={H - P + 14} textAnchor="middle" fontSize="9" fill={MUTED}>{t < 1 ? `${t * 12}m` : `${t}y`}</text>
            <text x={toX(t)} y={toY(adj[i]) - 9} textAnchor="middle" fontSize="9" fill={INK}>{(adj[i] * 100).toFixed(2)}%</text>
          </g>
        ))}
      </svg>
      <div className="mt-2 grid sm:grid-cols-3 gap-3">
        <Slider label="parallel shift" value={shift} min={-0.02} max={0.02} step={0.001} onChange={setShift} format={v => `${(v * 100).toFixed(2)}pp`} />
        <button
          onClick={() => setYields(y => [...y].reverse())}
          className="text-xs px-3 py-1.5 border rounded-md hover:bg-surface-2 w-fit self-center"
        >Invert curve</button>
        <button
          onClick={() => setYields((params.yields as number[]) ?? [0.042, 0.0415, 0.041, 0.0395, 0.0385, 0.039, 0.0405])}
          className="text-xs px-3 py-1.5 border rounded-md hover:bg-surface-2 w-fit self-center"
        >Reset</button>
      </div>
    </LabFrame>
  );
}

/* ---------------- EfficientFrontier ---------------- */
export function EfficientFrontier({ params }: { params: Record<string, unknown> }) {
  const [sigmaA, setSigmaA] = React.useState((params.sigmaA as number) ?? 20);
  const [sigmaB, setSigmaB] = React.useState((params.sigmaB as number) ?? 10);
  const [rho, setRho] = React.useState((params.rho as number) ?? 0.3);
  const [wA, setWA] = React.useState(0.5);
  const rA = 8, rB = 4; // % expected returns


  const vol = (w: number) => Math.sqrt((w * sigmaA) ** 2 + ((1 - w) * sigmaB) ** 2 + 2 * w * (1 - w) * rho * sigmaA * sigmaB);
  const ret = (w: number) => w * rA + (1 - w) * rB;
  const maxSig = Math.max(sigmaA, sigmaB) * 1.1;
  function mapX(s: number) { return P + (s / maxSig) * (W - 2 * P); }
  function mapY(r: number) { const top = 9, bot = 3; return H - P - ((r - bot) / (top - bot)) * (H - 2 * P); }
  const pts: string[] = [];
  for (let i = 0; i <= 200; i++) {
    const w = i / 200;
    pts.push(`${mapX(vol(w))},${mapY(ret(w))}`);
  }
  const cur = { v: vol(wA), r: ret(wA) };
  return (
    <LabFrame title="Two-asset efficient frontier" caption={`At w_A=${(wA * 100).toFixed(0)}%: σ=${fmt(cur.v, 2)}%, E[r]=${fmt(cur.r, 2)}%. Note the dip: with ρ<1, blending assets beats holding either alone, the mathematical heart of diversification.`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={P} y1={mapY(3)} x2={W - P} y2={mapY(3)} stroke={FAINT} />
        <polyline fill="none" stroke={MUTED} strokeWidth={1.2} strokeDasharray="4 3" points={pts.join(' ')} />
        {pts.filter((_, i) => i % 2 === 0 && i > 0).slice(0, 101).map((p, i) => {
          const [x, y] = p.split(',').map(Number);
          return <circle key={i} cx={x} cy={y} r={1.5} fill={ACCENT} opacity={0.4} />;
        })}
        <circle cx={mapX(cur.v)} cy={mapY(cur.r)} r={6} fill={ACCENT} />
        <circle cx={mapX(sigmaA)} cy={mapY(rA)} r={4} fill="var(--warning)" />
        <text x={mapX(sigmaA) + 6} y={mapY(rA) + 4} fontSize="10" fill="var(--warning)">A alone</text>
        <circle cx={mapX(sigmaB)} cy={mapY(rB)} r={4} fill="var(--success)" />
        <text x={mapX(sigmaB) + 6} y={mapY(rB) + 4} fontSize="10" fill="var(--success)">B alone</text>
      </svg>
      <div className="mt-2 grid sm:grid-cols-2 gap-3">
        <Slider label="weight in A" value={wA} min={0} max={1} step={0.01} onChange={setWA} format={v => `${(v * 100).toFixed(0)}%`} />
        <Slider label="correlation ρ" value={rho} min={-0.9} max={0.99} step={0.01} onChange={setRho} />
        <Slider label="σ of A" value={sigmaA} min={5} max={40} step={1} onChange={setSigmaA} format={v => `${v.toFixed(0)}%`} />
        <Slider label="σ of B" value={sigmaB} min={3} max={40} step={1} onChange={setSigmaB} format={v => `${v.toFixed(0)}%`} />
      </div>
    </LabFrame>
  );
}

/* ---------------- BinomialTreeLab ---------------- */
export function BinomialTreeLab({ params }: { params: Record<string, unknown> }) {
  const [S, setS] = React.useState((params.spot as number) ?? 100);
  const [K] = React.useState((params.strike as number) ?? 105);
  const [u, setU] = React.useState((params.u as number) ?? 1.0823);
  const [d, setD] = React.useState((params.d as number) ?? 0.924);
  const [rate, setRate] = React.useState((params.rate as number) ?? 0.05);
  const [periods, setPeriods] = React.useState((params.periods as number) ?? 3);
  const isCall = ((params.option as string) ?? 'call') === 'call';
  const tree = (() => {
    const levels: { s: number; v: number }[][] = [];
    const dt = 1 / periods;
    const R = Math.exp(rate * dt);
    const p = (R - d) / (u - d); // risk-neutral


    for (let i = 0; i <= periods; i++) {
      const level: { s: number; v: number }[] = [];
      for (let j = 0; j <= i; j++) {
        const s = S * Math.pow(u, i - j) * Math.pow(d, j);
        const intrinsic = isCall ? Math.max(s - K, 0) : Math.max(K - s, 0);
        level.push({ s, v: i === periods ? intrinsic : NaN });
      }
      levels.push(level);
    }
    for (let i = periods - 1; i >= 0; i--) {
      for (let j = 0; j <= i; j++) {
        const cont = (p * levels[i + 1][j].v + (1 - p) * levels[i + 1][j + 1].v) / R;
        const s = levels[i][j].s;
        const intrinsic = isCall ? Math.max(s - K, 0) : Math.max(K - s, 0);
        levels[i][j].v = cont; // European for the lab; lesson covers American


      }
    }
    return { levels, p };
  })();
  const price = tree.levels[0][0].v;
  const nodeW = W / (periods + 1);
  return (
    <LabFrame title={`${periods}-period binomial tree (${isCall ? 'call' : 'put'}, European)`} caption={`Risk-neutral p = ${fmt(tree.p, 4)}. Option value today: ${fmt(price, 4)}.`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {tree.levels.map((level, i) =>
          level.map((node, j) => {
            const x = P + i * nodeW;
            const y = H / 2 + (j - i / 2) * 44;
            return (
              <g key={`${i}-${j}`}>
                {i < periods && (
                  <>
                    <line x1={x} y1={y} x2={x + nodeW} y2={y - 22} stroke={FAINT} />
                    <line x1={x} y1={y} x2={x + nodeW} y2={y + 22} stroke={FAINT} />
                  </>
                )}
                <circle cx={x} cy={y} r={17} fill={i === 0 ? ACCENT : 'var(--surface)'} stroke={ACCENT} />
                <text x={x} y={y - 2} textAnchor="middle" fontSize="7.5" fill={i === 0 ? '#fff' : INK}>{fmt(node.s, 0)}</text>
                <text x={x} y={y + 8} textAnchor="middle" fontSize="7" fill={i === 0 ? '#fff' : MUTED}>{fmt(node.v, 1)}</text>
              </g>
            );
          })
        )}
      </svg>
      <div className="mt-2 grid sm:grid-cols-2 gap-3">
        <Slider label="spot S" value={S} min={60} max={140} step={1} onChange={setS} format={v => v.toFixed(0)} />
        <Slider label="up factor u" value={u} min={1.01} max={1.5} step={0.001} onChange={setU} format={v => v.toFixed(3)} />
        <Slider label="down factor d" value={d} min={0.5} max={0.99} step={0.001} onChange={setD} format={v => v.toFixed(3)} />
        <Slider label="periods" value={periods} min={1} max={6} step={1} onChange={setPeriods} format={v => v.toFixed(0)} />
      </div>
    </LabFrame>
  );
}

/* ---------------- VolatilitySmile ---------------- */
export function VolatilitySmile({ params }: { params: Record<string, unknown> }) {
  const strikes = (params.strikes as number[]) ?? [80, 90, 100, 110, 120];
  const [vols, setVols] = React.useState((params.impliedVols as number[]) ?? [0.22, 0.2, 0.19, 0.2, 0.22]);
  const minY = Math.min(...vols) - 0.02, maxY = Math.max(...vols) + 0.02;
  const kMin = strikes[0] - 5, kMax = strikes[strikes.length - 1] + 5;
  const toX = (k: number) => P + ((k - kMin) / (kMax - kMin)) * (W - 2 * P);
  const toY = (v: number) => H - P - ((v - minY) / (maxY - minY || 1)) * (H - 2 * P);
  return (
    <LabFrame title="Volatility smile (hypothetical quotes)" caption="Implied volatility by strike for the same expiry. The U-shape shows the market pricing tail risk beyond the log-normal model.">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <polyline fill="none" stroke={ACCENT} strokeWidth={2}
          points={strikes.map((k, i) => `${toX(k)},${toY(vols[i])}`).join(' ')} />
        {strikes.map((k, i) => (
          <g key={k}>
            <circle cx={toX(k)} cy={toY(vols[i])} r={4.5} fill={ACCENT} />
            <text x={toX(k)} y={H - P + 13} textAnchor="middle" fontSize="9" fill={MUTED}>{k}</text>
            <text x={toX(k)} y={toY(vols[i]) - 9} textAnchor="middle" fontSize="9" fill={INK}>{(vols[i] * 100).toFixed(1)}%</text>
          </g>
        ))}
      </svg>
      <div className="mt-2 grid sm:grid-cols-2 gap-3">
        <Slider label="wing vol (first)" value={vols[0]} min={0.1} max={0.4} step={0.005}
          onChange={v => setVols(vs => [v, ...vs.slice(1)])} format={v => `${(v * 100).toFixed(1)}%`} />
        <Slider label="wing vol (last)" value={vols[vols.length - 1]} min={0.1} max={0.4} step={0.005}
          onChange={v => setVols(vs => [...vs.slice(0, -1), v])} format={v => `${(v * 100).toFixed(1)}%`} />
      </div>
    </LabFrame>
  );
}

/* ---------------- OrderBookVisual ---------------- */
export function OrderBookVisual({ params }: { params: Record<string, unknown> }) {
  const [bids, setBids] = React.useState((params.bids as number[][]) ?? [[99.98, 1200], [99.97, 800], [99.96, 2500]]);
  const [asks, setAsks] = React.useState((params.asks as number[][]) ?? [[100.02, 900], [100.03, 1500], [100.05, 700]]);
  const bestBid = bids[0]?.[0] ?? 0;
  const bestAsk = asks[0]?.[0] ?? 0;
  const spread = bestAsk - bestBid;
  const mid = (bestBid + bestAsk) / 2;
  const maxQty = Math.max(...bids.map(b => b[1]), ...asks.map(a => a[1]), 1);
  const rowH = 26;
  return (
    <LabFrame title="Limit order book (Level 2 depth)" caption={`Best bid ${fmt(bestBid)} × ${fmt(bids[0]?.[1] ?? 0, 0)}, best ask ${fmt(bestAsk)} × ${fmt(asks[0]?.[1] ?? 0, 0)}. Spread ${fmt(spread)}, mid ${fmt(mid)}.`}>
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-xs">
        <div>
          <div className="text-center font-medium mb-1 text-success">Bids</div>
          {bids.map(([p, q], i) => (
            <div key={i} className="flex items-center gap-2 mb-1" style={{ opacity: 1 - i * 0.18 }}>
              <div className="relative flex-1 h-5 bg-surface-2 rounded-sm overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-success" style={{ width: `${(q / maxQty) * 100}%`, opacity: 0.35 }} />
                <div className="relative flex justify-between px-1.5 leading-5 tnum">
                  <span>{fmt(p)}</span><span className="text-faint">{q}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="text-center font-medium mb-1 text-danger">Asks</div>
          {asks.map(([p, q], i) => (
            <div key={i} className="flex items-center gap-2 mb-1" style={{ opacity: 1 - i * 0.18 }}>
              <div className="relative flex-1 h-5 bg-surface-2 rounded-sm overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-danger" style={{ width: `${(q / maxQty) * 100}%`, opacity: 0.35 }} />
                <div className="relative flex justify-between px-1.5 leading-5 tnum">
                  <span>{fmt(p)}</span><span className="text-faint">{q}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-2 text-xs">
        <button
          onClick={() => { setBids(b => b.map(([p, q], i) => i === 0 ? [p, Math.max(q - 300, 0)] : [p, q]).filter(([, q]) => q > 0) as number[][]); }}
          className="px-3 py-1.5 border rounded-md hover:bg-surface-2"
        >Trade 300 at bid</button>
        <button
          onClick={() => { setAsks(a => a.map(([p, q], i) => i === 0 ? [p, Math.max(q - 300, 0)] : [p, q]).filter(([, q]) => q > 0) as number[][]); }}
          className="px-3 py-1.5 border rounded-md hover:bg-surface-2"
        >Trade 300 at ask</button>
        <button
          onClick={() => { setBids((params.bids as number[][]) ?? [[99.98, 1200], [99.97, 800], [99.96, 2500]]); setAsks((params.asks as number[][]) ?? [[100.02, 900], [100.03, 1500], [100.05, 700]]); }}
          className="px-3 py-1.5 border rounded-md hover:bg-surface-2"
        >Reset</button>
      </div>
    </LabFrame>
  );
}

/* ---------------- MatchingSim ---------------- */
export function MatchingSim({ params }: { params: Record<string, unknown> }) {
  const orders = (params.orders as { side: string; qty: number; price: number }[]) ?? [
    { side: 'buy', qty: 500, price: 100.0 }, { side: 'sell', qty: 300, price: 100.02 }, { side: 'buy', qty: 200, price: 100.02 },
  ];
  const [step, setStep] = React.useState(0);
  const result = (simulate(orders));
  const shown = result.slice(0, step);
  return (
    <LabFrame title="Price-time priority matching" caption={`Step ${step}/${orders.length}. Trades printed so far: ${shown.filter(r => r.trade).length}. Step through and verify the matching rules yourself.`}>
      <div className="space-y-1.5 text-xs max-w-lg mx-auto">
        {orders.map((o, i) => {
          const r = result[i];
          const active = i < step;
          return (
            <div key={i} className={`border rounded-md px-3 py-2 flex justify-between items-center ${active ? 'bg-surface-2' : 'opacity-50'}`}>
              <span className="tnum">{o.side === 'buy' ? 'BUY' : 'SELL'} {o.qty} @ {fmt(o.price)}</span>
              <span className={r.trade ? 'text-success font-medium' : 'text-faint'}>
                {r.trade ? `→ trade ${r.trade.qty} @ ${fmt(r.trade.price)}` : r.note ?? 'resting'}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} className="text-xs px-3 py-1.5 border rounded-md hover:bg-surface-2">Back</button>
        <button onClick={() => setStep(s => Math.min(orders.length, s + 1))} className="text-xs px-3 py-1.5 border rounded-md bg-accent text-accent-foreground">Next event</button>
        <button onClick={() => setStep(0)} className="text-xs px-3 py-1.5 border rounded-md hover:bg-surface-2">Reset</button>
      </div>
    </LabFrame>
  );
}

function simulate(orders: { side: string; qty: number; price: number }[]) {
  const bids: { price: number; qty: number; seq: number }[] = [];
  const asks: { price: number; qty: number; seq: number }[] = [];
  return orders.map((o, seq) => {
    let trade: { qty: number; price: number } | null = null;
    let note: string | undefined;
    if (o.side === 'buy') {
      asks.sort((a, b) => a.price - b.price || a.seq - b.seq);
      if (asks.length && asks[0].price <= o.price) {
        const fill = Math.min(o.qty, asks[0].qty);
        trade = { qty: fill, price: asks[0].price };
        asks[0].qty -= fill;
        if (asks[0].qty === 0) asks.shift();
        if (fill < o.qty) bids.push({ price: o.price, qty: o.qty - fill, seq });
      } else {
        bids.push({ price: o.price, qty: o.qty, seq });
        note = 'no cross, resting on bid side';
      }
    } else {
      bids.sort((a, b) => b.price - a.price || a.seq - b.seq);
      if (bids.length && bids[0].price >= o.price) {
        const fill = Math.min(o.qty, bids[0].qty);
        trade = { qty: fill, price: bids[0].price };
        bids[0].qty -= fill;
        if (bids[0].qty === 0) bids.shift();
        if (fill < o.qty) asks.push({ price: o.price, qty: o.qty - fill, seq });
      } else {
        asks.push({ price: o.price, qty: o.qty, seq });
        note = 'no cross, resting on ask side';
      }
    }
    return { trade, note };
  });
}
