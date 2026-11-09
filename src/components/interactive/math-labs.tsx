'use client';

import * as React from 'react';
import { Slider, LabFrame, PlotArea, safeFn, rng, fmt, INK, MUTED, FAINT, ACCENT } from './core';

/* ---------------- NumberLine ---------------- */
export function NumberLine({ params }: { params: Record<string, unknown> }) {
  const [min, setMin] = React.useState((params.min as number) ?? -5);
  const [max, setMax] = React.useState((params.max as number) ?? 5);
  const markers = (params.markers as number[]) ?? [-1, 0.5, 2];
  const W = 560, P = 40;
  const toX = (v: number) => P + ((v - min) / (max - min || 1)) * (W - 2 * P);
  return (
    <LabFrame title="Number line" caption="Drag the bounds to rescale; every integer, fraction and decimal lives on the same continuous line.">
      <svg viewBox={`0 0 ${W} 90`} className="w-full h-auto">
        <line x1={P} y1={45} x2={W - P} y2={45} stroke={INK} strokeWidth={1.5} />
        {Array.from({ length: Math.floor(max) - Math.ceil(min) + 1 }, (_, i) => Math.ceil(min) + i).map(v => (
          <g key={v}>
            <line x1={toX(v)} y1={39} x2={toX(v)} y2={51} stroke={INK} strokeWidth={1} />
            <text x={toX(v)} y={68} textAnchor="middle" fontSize="11" fill={MUTED}>{v}</text>
          </g>
        ))}
        {markers.filter(m => m >= min && m <= max).map((m, i) => (
          <g key={i}>
            <circle cx={toX(m)} cy={45} r={5} fill={ACCENT} />
            <text x={toX(m)} y={26} textAnchor="middle" fontSize="10" fill={ACCENT}>{m}</text>
          </g>
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Slider label="min" value={min} min={-20} max={Math.min(max - 1, 0)} step={1} onChange={v => setMin(Math.min(v, max - 1))} format={v => v.toFixed(0)} />
        <Slider label="max" value={max} min={Math.max(min + 1, 0)} max={20} step={1} onChange={v => setMax(Math.max(v, min + 1))} format={v => v.toFixed(0)} />
      </div>
    </LabFrame>
  );
}

/* ---------------- FractionVisual ---------------- */
export function FractionVisual({ params }: { params: Record<string, unknown> }) {
  const [num, setNum] = React.useState((params.numerator as number) ?? 3);
  const [den, setDen] = React.useState((params.denominator as number) ?? 8);
  const maxDen = 12;
  const n = Math.min(num, den);
  return (
    <LabFrame title="Fraction visualiser" caption={`${n}/${den} = ${(n / den).toFixed(4)} = ${Math.round((n / den) * 100)}%`}>
      <svg viewBox="0 0 240 120" className="h-28 mx-auto">
        {Array.from({ length: den }, (_, i) => {
          const filled = i < n;
          const cx = 15 + (i % 12) * 19;
          const cy = 30 + Math.floor(i / 12) * 30;
          const r = 8;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill={filled ? ACCENT : 'none'} stroke={INK} strokeOpacity={0.5} />
            </g>
          );
        })}
        <line x1={95} y1={92} x2={145} y2={92} stroke={INK} strokeWidth={2} />
        <text x={120} y={86} textAnchor="middle" fontSize="20" fill={INK}>{n}</text>
        <text x={120} y={112} textAnchor="middle" fontSize="20" fill={INK}>{den}</text>
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Slider label="numerator" value={num} min={0} max={den} step={1} onChange={setNum} format={v => v.toFixed(0)} />
        <Slider label="denominator" value={den} min={1} max={maxDen} step={1} onChange={v => { setDen(v); setNum(Math.min(num, v)); }} format={v => v.toFixed(0)} />
      </div>
    </LabFrame>
  );
}

/* ---------------- CompoundGrowth ---------------- */
export function CompoundGrowth({ params }: { params: Record<string, unknown> }) {
  const [principal, setPrincipal] = React.useState((params.principal as number) ?? 10000);
  const [rate, setRate] = React.useState((params.rate as number) ?? 0.07);
  const [years, setYears] = React.useState((params.years as number) ?? 20);
  const [freq, setFreq] = React.useState(1);
  const W = 560, H = 260, P = 40;
  const pts = (() => {
    const out: [number, number][] = [];
    for (let t = 0; t <= years; t += years / 100) {
      out.push([t, principal * Math.pow(1 + rate / freq, freq * t)]);
    }
    return out;
  })();
  const maxY = pts[pts.length - 1]?.[1] ?? 1;
  const simple = principal * (1 + rate * years);
  const toX = (t: number) => P + (t / (years || 1)) * (W - 2 * P);
  const toY = (v: number) => H - P - (v / (maxY || 1)) * (H - 2 * P);
  return (
    <LabFrame title="Compound growth" caption={`After ${years} years: compound ${fmt(principal * Math.pow(1 + rate / freq, freq * years))} vs simple ${fmt(simple)} — compounding adds ${fmt(principal * Math.pow(1 + rate / freq, freq * years) - simple)}.`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
        <line x1={P} y1={toY(0)} x2={W - P} y2={toY(0)} stroke={FAINT} />
        <line x1={P} y1={toY(0)} x2={P} y2={toY(maxY)} stroke={FAINT} />
        <polyline fill="none" stroke={ACCENT} strokeWidth={2}
          points={pts.map(([t, v]) => `${toX(t)},${toY(v)}`).join(' ')} />
        <line x1={P} y1={toY(simple)} x2={W - P} y2={toY(simple)} stroke={MUTED} strokeDasharray="4 3" />
        <text x={P + 6} y={toY(simple) - 5} fontSize="11" fill={MUTED}>simple interest path</text>
        <text x={W - P - 6} y={toY(maxY) + 14} textAnchor="end" fontSize="11" fill={ACCENT}>{fmt(maxY, 0)}</text>
      </svg>
      <div className="mt-2 grid sm:grid-cols-2 gap-3">
        <Slider label="principal" value={principal} min={1000} max={200000} step={1000} onChange={setPrincipal} format={v => fmt(v, 0)} />
        <Slider label="rate" value={rate} min={0.01} max={0.2} step={0.0025} onChange={setRate} format={v => `${(v * 100).toFixed(2)}%`} />
        <Slider label="years" value={years} min={1} max={40} step={1} onChange={setYears} format={v => v.toFixed(0)} />
        <Slider label="compounds/yr" value={freq} min={1} max={12} step={1} onChange={setFreq} format={v => v.toFixed(0)} />
      </div>
    </LabFrame>
  );
}

/* ---------------- FunctionPlotter ---------------- */
export function FunctionPlotter({ params }: { params: Record<string, unknown> }) {
  const expr = (params.expression as string) ?? (params.fn as string) ?? 'sin(x)';
  const [x0, x1] = [params.xmin as number ?? params.xMin as number ?? -5, params.xmax as number ?? params.xMax as number ?? 5];
  const [ymin, setYmin] = React.useState(params.ymin as number ?? params.yMin as number ?? -3);
  const [ymax, setYmax] = React.useState(params.ymax as number ?? params.yMax as number ?? 3);
  const f = (safeFn(expr, x => x));
  const W = 560, H = 300, P = 34;
  const N = 300;
  const pts = (() => {
    const out: string[] = [];
    for (let i = 0; i <= N; i++) {
      const x = x0 + ((x1 - x0) * i) / N;
      const y = f(x);
      if (!Number.isFinite(y) || Math.abs(y) > 1e7) { out.push('M'); continue; }
      const px = P + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * P);
      const py = H - P - ((y - ymin) / (ymax - ymin || 1)) * (H - 2 * P);
      out.push(`${px},${py}`);
    }
    return out;
  })();
  const path = pts.filter(p => p !== 'M').join(' ');
  const toX = (x: number) => P + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  const axisY = H - P - ((0 - ymin) / (ymax - ymin || 1)) * (H - 2 * P);
  const axisX = P + ((0 - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  return (
    <LabFrame title={`f(x) = ${expr}`} caption={`Domain [${fmt(x0)}, ${fmt(x1)}].`} note="Sliders adjust the vertical window; watch how asymptotes and growth rates appear.">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Graph of ${expr}`}>
        <line x1={P} y1={axisY} x2={W - P} y2={axisY} stroke={FAINT} />
        <line x1={axisX} y1={P} x2={axisX} y2={H - P} stroke={FAINT} />
        <polyline fill="none" stroke={ACCENT} strokeWidth={2} points={path} />
        <text x={W - P - 4} y={axisY - 6} textAnchor="end" fontSize="10" fill={FAINT}>y = 0</text>
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Slider label="ymin" value={ymin} min={-100} max={0} step={0.5} onChange={setYmin} format={v => fmt(v, 1)} />
        <Slider label="ymax" value={ymax} min={0} max={100} step={0.5} onChange={setYmax} format={v => fmt(v, 1)} />
      </div>
    </LabFrame>
  );
}

/* ---------------- DerivativeLab ---------------- */
export function DerivativeLab({ params }: { params: Record<string, unknown> }) {
  const expr = (params.function as string) ?? 'x^2';
  const xMin = params.xMin as number ?? -3;
  const xMax = params.xMax as number ?? 3;
  const [point, setPoint] = React.useState((params.point as number) ?? 1);
  const [h, setH] = React.useState(1);
  const f = (safeFn(expr, x => x * x));
  const W = 560, H = 300, P = 34;
  const ymin = -4, ymax = 4;
  const toX = (x: number) => P + ((x - xMin) / (xMax - xMin || 1)) * (W - 2 * P);
  const toY = (y: number) => H - P - ((y - ymin) / (ymax - ymin || 1)) * (H - 2 * P);
  const N = 250;
  const path = (() => {
    const out: string[] = [];
    for (let i = 0; i <= N; i++) {
      const x = xMin + ((xMax - xMin) * i) / N;
      const y = f(x);
      if (!Number.isFinite(y)) continue;
      out.push(`${toX(x)},${toY(Math.max(ymin, Math.min(ymax, y)))}`);
    }
    return out.join(' ');
  })();
  const fp = f(point);
  const fp1 = f(point + h);
  const secant = h !== 0 ? (fp1 - fp) / h : NaN;
  const deriv = h !== 0 ? (f(point + h / 2) - f(point - h / 2)) / h : NaN;
  // tangent + secant lines
  const lineY = (x: number, x0: number, y0: number, slope: number) => y0 + slope * (x - x0);
  const segLine = (slope: number, color: string, dash?: string) => {
    const xa = xMin, xb = xMax;
    const ya = Math.max(ymin, Math.min(ymax, lineY(xa, point, fp, slope)));
    const yb = Math.max(ymin, Math.min(ymax, lineY(xb, point, fp, slope)));
    return <line x1={toX(xa)} y1={toY(ya)} x2={toX(xb)} y2={toY(yb)} stroke={color} strokeWidth={1.5} strokeDasharray={dash} />;
  };
  return (
    <LabFrame title={`Derivative of f(x) = ${expr}`} caption={`At x = ${fmt(point)}: secant slope (h=${fmt(h)}) = ${fmt(secant, 4)}, symmetric derivative = ${fmt(deriv, 4)}. Shrink h and watch the secant converge on the tangent.`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={P} y1={toY(0)} x2={W - P} y2={toY(0)} stroke={FAINT} />
        <line x1={toX(0)} y1={P} x2={toX(0)} y2={H - P} stroke={FAINT} />
        <polyline fill="none" stroke={INK} strokeWidth={2} points={path} />
        {segLine((fp1 - fp) / (h || 1), 'var(--warning)', '5 3')}
        {segLine(deriv, ACCENT)}
        <circle cx={toX(point)} cy={toY(fp)} r={4.5} fill={ACCENT} />
        <circle cx={toX(point + h)} cy={toY(fp1)} r={3.5} fill="var(--warning)" />
      </svg>
      <div className="mt-2 grid sm:grid-cols-2 gap-3">
        <Slider label="point x" value={point} min={xMin + 0.05} max={xMax - 0.05} step={0.05} onChange={setPoint} />
        <Slider label="step h" value={h} min={0.01} max={1.5} step={0.01} onChange={setH} format={v => v.toFixed(2)} />
      </div>
    </LabFrame>
  );
}

/* ---------------- IntegralLab ---------------- */
export function IntegralLab({ params }: { params: Record<string, unknown> }) {
  const expr = (params.function as string) ?? 'x^2';
  const a = (params.a as number) ?? 0;
  const b = (params.b as number) ?? 1;
  const [n, setN] = React.useState((params.n as number) ?? 8);
  const f = (safeFn(expr, x => x * x));
  const W = 560, H = 260, P = 34;
  const ymin = -1, ymax = 4;
  const toX = (x: number) => P + ((x - a) / (b - a || 1)) * (W - 2 * P);
  const toY = (y: number) => H - P - ((y - ymin) / (ymax - ymin || 1)) * (H - 2 * P);
  const dx = (b - a) / n;
  const bars = (() => {
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const x = a + i * dx + dx / 2; // midpoint rule (better behaved visually)
      out.push({ x: a + i * dx, y: f(x) });
    }
    return out;
  })();
  const approx = bars.reduce((s, bar) => s + bar.y * dx, 0);
  const exact = (() => {
    // 2000-point Simpson as reference "exact"
    const N = 2000;
    const h2 = (b - a) / N;
    let s = f(a) + f(b);
    for (let i = 1; i < N; i++) s += f(a + i * h2) * (i % 2 ? 4 : 2);
    return (s * h2) / 3;
  })();
  const curve = (() => {
    const out: string[] = [];
    for (let i = 0; i <= 250; i++) {
      const x = a + ((b - a) * i) / 250;
      const y = f(x);
      if (!Number.isFinite(y)) continue;
      out.push(`${toX(x)},${toY(Math.max(ymin, Math.min(ymax, y)))}`);
    }
    return out.join(' ');
  })();
  return (
    <LabFrame title={`Riemann sum of f(x) = ${expr} on [${a}, ${b}]`} caption={`${n} midpoint rectangles: ${fmt(approx, 5)}. Simpson reference: ${fmt(exact, 5)}. Error: ${fmt(Math.abs(approx - exact), 5)} — halve dx and the error falls roughly 4×.`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={P} y1={toY(0)} x2={W - P} y2={toY(0)} stroke={FAINT} />
        {bars.map((bar, i) => {
          const yTop = Math.min(Math.max(toY(bar.y), P), H - P);
          return (
            <rect key={i} x={toX(bar.x)} y={Math.min(yTop, toY(0))} width={Math.max((W - 2 * P) / n - 0.5, 0.5)} height={Math.abs(toY(0) - yTop)} fill={ACCENT} opacity={0.25} stroke={ACCENT} strokeOpacity={0.5} strokeWidth={0.5} />
          );
        })}
        <polyline fill="none" stroke={INK} strokeWidth={2} points={curve} />
      </svg>
      <div className="mt-2">
        <Slider label="rectangles n" value={n} min={2} max={120} step={1} onChange={setN} format={v => v.toFixed(0)} />
      </div>
    </LabFrame>
  );
}

/* ---------------- TaylorLab ---------------- */
export function TaylorLab({ params }: { params: Record<string, unknown> }) {
  const expr = (params.function as string) ?? 'exp(x)';
  const center = (params.center as number) ?? 0;
  const [order, setOrder] = React.useState((params.order as number) ?? 3);
  const xMin = params.xMin as number ?? -3;
  const xMax = params.xMax as number ?? 3;
  const f = (safeFn(expr, Math.exp));
  const W = 560, H = 280, P = 34;
  const ymin = -3, ymax = 6;
  const toX = (x: number) => P + ((x - xMin) / (xMax - xMin || 1)) * (W - 2 * P);
  const toY = (y: number) => H - P - ((y - ymin) / (ymax - ymin || 1)) * (H - 2 * P);
  // numeric derivatives at center
  const deriv = (k: number): number => {
    const h = Math.max(1e-4, 1e-3 * Math.max(1, Math.abs(center)));
    let s = 0;
    for (let i = 0; i <= k; i++) {
      const coef = ((-1) ** i) * comb(k, i);
      s += coef * f(center + (k - 2 * i) * h);
    }
    return s / Math.pow(2 * h, k);
  };
  const polyAt = (x: number) => {
    let s = 0;
    for (let k = 0; k <= order; k++) {
      s += (deriv(k) / fact(k)) * Math.pow(x - center, k);
    }
    return s;
  };
  const paths = (() => {
    const fp: string[] = [], tp: string[] = [];
    for (let i = 0; i <= 250; i++) {
      const x = xMin + ((xMax - xMin) * i) / 250;
      const y = f(x);
      if (Number.isFinite(y)) fp.push(`${toX(x)},${toY(Math.max(ymin, Math.min(ymax, y)))}`);
      const ty = polyAt(x);
      if (Number.isFinite(ty)) tp.push(`${toX(x)},${toY(Math.max(ymin, Math.min(ymax, ty)))}`);
    }
    return { fp: fp.join(' '), tp: tp.join(' ') };
  })();
  return (
    <LabFrame title={`Taylor polynomial of ${expr} around x = ${center}`} caption={`Order ${order} polynomial (blue dashed) vs the true function. Increase the order — the approximation improves near the centre first.`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={P} y1={toY(0)} x2={W - P} y2={toY(0)} stroke={FAINT} />
        <line x1={toX(center)} y1={P} x2={toX(center)} y2={H - P} stroke={FAINT} strokeDasharray="3 3" />
        <polyline fill="none" stroke={INK} strokeWidth={2} points={paths.fp} />
        <polyline fill="none" stroke={ACCENT} strokeWidth={2} strokeDasharray="5 3" points={paths.tp} />
      </svg>
      <div className="mt-2">
        <Slider label="order" value={order} min={0} max={9} step={1} onChange={setOrder} format={v => v.toFixed(0)} />
      </div>
    </LabFrame>
  );
}

function comb(n: number, k: number): number { return fact(n) / (fact(k) * fact(n - k)); }
function fact(n: number): number { let s = 1; for (let i = 2; i <= n; i++) s *= i; return s; }

/* ---------------- VectorVisual ---------------- */
export function VectorVisual({ params }: { params: Record<string, unknown> }) {
  const vectors = (params.vectors as number[][]) ?? [[3, 1], [1, 2]];
  const gridRange = (params.gridRange as number) ?? 5;
  const [showSum, setShowSum] = React.useState(true);
  const W = 380, H = 380, P = 20;
  const toX = (v: number) => W / 2 + (v / gridRange) * (W / 2 - P);
  const toY = (v: number) => H / 2 - (v / gridRange) * (H / 2 - P);
  const sum = vectors.reduce(([sx, sy], [vx, vy]) => [sx + vx, sy + vy], [0, 0]);
  const dot = vectors.length === 2 ? vectors[0][0] * vectors[1][0] + vectors[0][1] * vectors[1][1] : null;
  const mag = (v: number[]) => Math.hypot(v[0], v[1]);
  return (
    <LabFrame title="Vector arithmetic" caption={dot !== null ? `|a|=${fmt(mag(vectors[0]))}, |b|=${fmt(mag(vectors[1]))}, a·b = ${fmt(dot)}, cos θ = ${fmt(dot / (mag(vectors[0]) * mag(vectors[1])))}` : `Sum: (${fmt(sum[0])}, ${fmt(sum[1])})`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto h-auto">
        {Array.from({ length: 2 * gridRange + 1 }, (_, i) => i - gridRange).map(v => (
          <g key={v} stroke={FAINT} strokeOpacity={0.35}>
            <line x1={toX(v)} y1={P} x2={toX(v)} y2={H - P} strokeWidth={0.5} />
            <line x1={P} y1={toY(v)} x2={W - P} y2={toY(v)} strokeWidth={0.5} />
          </g>
        ))}
        <line x1={P} y1={toY(0)} x2={W - P} y2={toY(0)} stroke={MUTED} />
        <line x1={toX(0)} y1={P} x2={toX(0)} y2={H - P} stroke={MUTED} />
        {vectors.map((v, i) => (
          <Arrow key={i} x1={toX(0)} y1={toY(0)} x2={toX(v[0])} y2={toY(v[1])} color={['var(--accent)', '#9a6d0b'][i % 2]} label={`v${i + 1}`} />
        ))}
        {showSum && <Arrow x1={toX(0)} y1={toY(0)} x2={toX(sum[0])} y2={toY(sum[1])} color="var(--success)" label="sum" dashed />}
      </svg>
      <label className="mt-2 flex items-center gap-2 text-xs text-muted justify-center">
        <input type="checkbox" checked={showSum} onChange={e => setShowSum(e.target.checked)} /> show sum vector
      </label>
    </LabFrame>
  );
}

function Arrow({ x1, y1, x2, y2, color, label, dashed }: { x1: number; y1: number; x2: number; y2: number; color: string; label?: string; dashed?: boolean }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len = 9;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} strokeDasharray={dashed ? '4 3' : undefined} markerEnd="url(#arrowhead)" />
      <polygon
        points={`${x2},${y2} ${x2 - len * Math.cos(angle - 0.4)},${y2 - len * Math.sin(angle - 0.4)} ${x2 - len * Math.cos(angle + 0.4)},${y2 - len * Math.sin(angle + 0.4)}`}
        fill={color}
      />
      {label && <text x={x2 + 6} y={y2 - 4} fontSize="10" fill={color}>{label}</text>}
    </g>
  );
}

/* ---------------- MatrixTransform ---------------- */
export function MatrixTransform({ params }: { params: Record<string, unknown> }) {
  const matrix = (params.matrix as number[][]) ?? [[2, 0], [0, 1.5]];
  const gridRange = (params.gridRange as number) ?? 4;
  const W = 380, H = 380, P = 20;
  const toX = (v: number) => W / 2 + (v / gridRange) * (W / 2 - P);
  const toY = (v: number) => H / 2 - (v / gridRange) * (H / 2 - P);
  const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  const apply = ([x, y]: number[]): [number, number] => [matrix[0][0] * x + matrix[0][1] * y, matrix[1][0] * x + matrix[1][1] * y];
  const basis = [[1, 0], [0, 1]];
  const unit = [[1, 0], [0.6, 1], [0, 1], [1, 0.6]];
  return (
    <LabFrame title={`Matrix $A = \\begin{pmatrix}${matrix[0][0]} & ${matrix[0][1]} \\\\ ${matrix[1][0]} & ${matrix[1][1]}\\end{pmatrix}`.replace(/\$/g, '')} caption={`det A = ${fmt(det)}. The unit square maps to a parallelogram of area |det A|; negative det flips orientation.`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto h-auto">
        {Array.from({ length: 2 * gridRange + 1 }, (_, i) => i - gridRange).map(v => (
          <g key={v} stroke={FAINT} strokeOpacity={0.3}>
            <line x1={toX(v)} y1={P} x2={toX(v)} y2={H - P} strokeWidth={0.5} />
            <line x1={P} y1={toY(v)} x2={W - P} y2={toY(v)} strokeWidth={0.5} />
          </g>
        ))}
        <polygon points={unit.map(u => `${toX(u[0])},${toY(u[1])}`).join(' ')} fill={MUTED} opacity={0.12} stroke={MUTED} strokeDasharray="3 3" />
        <polygon points={unit.map(u => { const t = apply(u); return `${toX(t[0])},${toY(t[1])}`; }).join(' ')} fill={ACCENT} opacity={0.2} stroke={ACCENT} strokeWidth={1.5} />
        {basis.map((b, i) => {
          const t = apply(b);
          return <Arrow key={i} x1={toX(0)} y1={toY(0)} x2={toX(t[0])} y2={toY(t[1])} color={['var(--accent)', '#9a6d0b'][i]} />;
        })}
      </svg>
    </LabFrame>
  );
}

/* ---------------- MonteCarloPi ---------------- */
export function MonteCarloPi({ params }: { params: Record<string, unknown> }) {
  const target = (params.points as number) ?? 2000;
  const [n, setN] = React.useState(target);
  const [seed, setSeed] = React.useState(1);
  const result = (() => {
    const rand = rng(seed);
    let inside = 0;
    const pts: [number, number, boolean][] = [];
    const shown = Math.min(n, 1200);
    for (let i = 0; i < n; i++) {
      const x = rand() * 2 - 1, y = rand() * 2 - 1;
      const inC = x * x + y * y <= 1;
      if (inC) inside++;
      if (i < shown) pts.push([x, y, inC]);
    }
    return { pts, estimate: (4 * inside) / n, inside, n };
  })();
  const W = 260;
  const toXY = (v: number) => W / 2 + v * (W / 2 - 8);
  return (
    <LabFrame title="Monte Carlo estimation of π" caption={`With ${result.n.toLocaleString()} points: π ≈ 4 × ${result.inside}/${result.n} = ${fmt(result.estimate, 4)} (true: 3.14159). Error shrinks like 1/√n.`}>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <svg viewBox={`0 0 ${W} ${W}`} className="w-56 h-56">
          <rect x={0} y={0} width={W} height={W} fill="var(--surface-2)" />
          <circle cx={W / 2} cy={W / 2} r={W / 2 - 8} fill="none" stroke={ACCENT} />
          {result.pts.map(([x, y, inC], i) => (
            <circle key={i} cx={toXY(x)} cy={toXY(-y)} r={1.3} fill={inC ? ACCENT : 'var(--danger)'} opacity={0.7} />
          ))}
        </svg>
        <div className="flex-1 w-full space-y-2">
          <Slider label="points" value={n} min={100} max={50000} step={100} onChange={setN} format={v => v.toFixed(0)} />
          <button onClick={() => setSeed(s => s + 1)} className="text-xs px-3 py-1.5 border rounded-md hover:bg-surface-2">
            Resample (seed {seed})
          </button>
        </div>
      </div>
    </LabFrame>
  );
}
