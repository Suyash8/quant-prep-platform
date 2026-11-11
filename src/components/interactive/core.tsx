'use client';

import * as React from 'react';

/**
 * Safe math expression evaluator (recursive descent).
 * Supports: + - * / ^ ( ) , numbers, pi, e, and common functions.
 * No eval, no Function constructor.
 */
export function compileExpression(expr: string): (x: number) => number {
  const tokens = tokenize(expr);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function tokenize(s: string): (string | number)[] {
    const out: (string | number)[] = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const num = parseFloat(s.slice(i, j));
        if (Number.isNaN(num)) throw new Error(`bad number at ${i}`);
        out.push(num); i = j; continue;
      }
      if (/[a-zA-Z_]/.test(c)) {
        let j = i;
        while (j < s.length && /[a-zA-Z_0-9]/.test(s[j])) j++;
        out.push(s.slice(i, j)); i = j; continue;
      }
      if ('+-*/^(),'.includes(c)) { out.push(c); i++; continue; }
      throw new Error(`unexpected char ${c}`);
    }
    return out;
  }

  const FUNCS: Record<string, (...a: number[]) => number> = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    exp: Math.exp, log: Math.log, ln: Math.log, log10: Math.log10, log2: Math.log2,
    sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, ceil: Math.ceil,
    min: Math.min, max: Math.max, pow: Math.pow, atan2: Math.atan2,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sign: Math.sign,
  };

  function parseExpr(): (x: number) => number {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = next() as string;
      const right = parseTerm();
      const l = left;
      left = op === '+' ? x => l(x) + right(x) : x => l(x) - right(x);
    }
    return left;
  }
  function parseTerm(): (x: number) => number {
    let left = parseUnary();
    while (peek() === '*' || peek() === '/') {
      const op = next() as string;
      const right = parseUnary();
      const l = left;
      left = op === '*' ? x => l(x) * right(x) : x => l(x) / right(x);
    }
    return left;
  }
  function parseUnary(): (x: number) => number {
    if (peek() === '-') { next(); const v = parseUnary(); return x => -v(x); }
    if (peek() === '+') { next(); return parseUnary(); }
    return parsePow();
  }
  function parsePow(): (x: number) => number {
    const base = parseAtom();
    if (peek() === '^') {
      next();
      const exp = parseUnary(); // right-associative


      return x => Math.pow(base(x), exp(x));
    }
    return base;
  }
  function parseAtom(): (x: number) => number {
    const t = next();
    if (typeof t === 'number') return () => t;
    if (t === 'x' || t === 'y' || t === 't' || t === 'q') return x => x;
    if (t === 'pi') return () => Math.PI;
    if (t === 'e') return () => Math.E;
    if (t === '(') {
      const inner = parseExpr();
      if (peek() === ')') next();
      return inner;
    }
    if (typeof t === 'string' && FUNCS[t]) {
      if (peek() === '(') {
        next();
        const args: ((x: number) => number)[] = [parseExpr()];
        while (peek() === ',') { next(); args.push(parseExpr()); }
        if (peek() === ')') next();
        const f = FUNCS[t];
        return x => {
          const vals = args.map(a => a(x));
          if (vals.some(v => Number.isNaN(v))) return NaN;
          return f(...vals);
        };
      }
      throw new Error(`${t} requires ( )`);
    }
    throw new Error(`unexpected token ${t}`);
  }

  const fn = parseExpr();
  if (pos < tokens.length) throw new Error(`unexpected trailing token`);
  return x => fn(x);
}

export function safeFn(expr: string, fallback = (x: number) => x): (x: number) => number {
  try {
    return compileExpression(expr);
  } catch {
    return fallback;
  }
}

/** Seeded PRNG (mulberry32) for reproducible simulations */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box-Muller from a uniform generator */
export function gaussian(rand: () => number): () => number {
  let spare: number | null = null;
  return function () {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u = 0, v = 0, s = 0;
    do { u = rand() * 2 - 1; v = rand() * 2 - 1; s = u * u + v * v; } while (s === 0 || s >= 1);
    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * mul;
    return u * mul;
  };
}

export function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26


  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function normCdf(x: number, mu = 0, sigma = 1): number {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

export function normPdf(x: number, mu = 0, sigma = 1): number {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}

/** Slider with numeric label */
export function Slider({ label, value, min, max, step = 0.01, onChange, format }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <label className="flex items-center gap-3 text-xs">
      <span className="text-muted w-28 shrink-0">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="qf-range flex-1"
        style={{ ['--fill' as string]: `${((value - min) / (max - min)) * 100}%` }}
        aria-label={label}
      />
      <span className="tnum w-14 text-right font-medium">{format ? format(value) : value.toFixed(2)}</span>
    </label>
  );
}

export function LabFrame({ title, caption, children, note }: { title?: string; caption?: string; children: React.ReactNode; note?: string }) {
  return (
    <figure className="my-6 qf-card-flat overflow-hidden not-prose">
      {title && (
        <figcaption className="px-4 py-2.5 border-b bg-surface-2/50 text-sm font-extrabold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent inline-block" aria-hidden />
          {title}
        </figcaption>
      )}
      <div className="p-4">{children}</div>
      {(caption || note) && (
        <figcaption className="px-4 py-2.5 border-t text-xs text-faint font-semibold">{caption}{note ? ` ${note}` : ''}</figcaption>
      )}
    </figure>
  );
}

/** Simple SVG plotting area with axes helpers */
export function PlotArea({ width = 560, height = 300, padding = 34, children, xLabel, yLabel }: {
  width?: number; height?: number; padding?: number;
  children: (m: { x: (v: number) => number; y: (v: number) => number; w: number; h: number }) => React.ReactNode;
  xLabel?: string; yLabel?: string;
}) {
  const m = {
    x: (v: number) => padding + v,
    y: (v: number) => height - padding - v,
    w: width, h: height,
  };
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
      {children(m)}
      {xLabel && <text x={width - padding} y={height - 8} textAnchor="end" fontSize="10" fill="var(--foreground-faint)">{xLabel}</text>}
      {yLabel && <text x={10} y={padding - 12} fontSize="10" fill="var(--foreground-faint)">{yLabel}</text>}
    </svg>
  );
}

export function fmt(v: number, d = 2): string {
  if (!Number.isFinite(v)) return ', ';
  if (Math.abs(v) >= 1e6) return v.toExponential(2);
  return v.toFixed(d);
}

export const INK = 'var(--foreground)';
export const MUTED = 'var(--foreground-muted)';
export const FAINT = 'var(--foreground-faint)';
export const ACCENT = 'var(--accent)';
