'use client';

import * as React from 'react';
import { Slider, LabFrame, fmt, INK, MUTED, FAINT, ACCENT } from './core';

/* ---------------- MemoryLayout ---------------- */
export function MemoryLayout({ params }: { params: Record<string, unknown> }) {
  const type = (params.type as string) ?? 'double';
  const value = (params.value as number) ?? 42.17;
  const info = typeInfo(type);
  const bits = Array.from({ length: info.bytes * 8 }, () => false);
  // For double/int show real byte patterns (little-endian)


  const bytes = (() => {
    const out: number[] = [];
    try {
      const view = new DataView(new ArrayBuffer(info.bytes));
      if (info.bytes === 8 && !type.includes('[')) {
        view.setFloat64(0, value, true);
      } else if (info.bytes === 4 && !type.includes('[')) {
        view.setInt32(0, Math.round(value) | 0, true);
      } else if (info.bytes === 2) {
        view.setInt16(0, Math.round(value) | 0, true);
      } else if (info.bytes === 1) {
        view.setInt8(0, Math.round(value) | 0);
      } else {
        // array: first element


        view.setFloat64(0, value, true);
      }
      for (let i = 0; i < info.bytes; i++) out.push(view.getUint8(i));
    } catch {
      for (let i = 0; i < info.bytes; i++) out.push(0);
    }
    return out;
  })();
  return (
    <LabFrame title={`Memory layout: ${type}`} caption={`${info.desc}, ${info.bytes} bytes on typical 64-bit platforms. Byte values are the actual little-endian representation of ${info.bytes === 4 ? Math.round(value) : value}.`}>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {bytes.map((b, i) => (
          <div key={i} className="text-center">
            <div className="w-14 border rounded-md py-1.5 tnum text-xs bg-accent-soft" title={`byte ${i}`}>{b.toString(16).padStart(2, '0')}</div>
            <div className="text-[9px] text-faint mt-0.5">byte {i}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted text-center">
        {type === 'double' && 'A double = sign(1) + exponent(11) + mantissa(52) bits. The decimal 42.17 cannot be represented exactly, try 42.17 in the IEEE 754 lesson.'}
        {type === 'int' && 'Two\'s complement: the top bit contributes −2³¹, giving the symmetric signed range.'}
        {type.startsWith('int[') && 'Contiguous elements; address arithmetic A[i] = base + i × sizeof(element).'}
        {!type.startsWith('int[') && type !== 'double' && type !== 'int' && 'Fixed-width storage; size is platform-dependent for some types.'}
      </p>
    </LabFrame>
  );
}

function typeInfo(type: string): { bytes: number; desc: string } {
  const m = type.match(/^(\w+)\[(\d+)\]$/);
  if (m) {
    const elem: Record<string, number> = { char: 1, short: 2, int: 4, long: 8, float: 4, double: 8, bool: 1 };
    const bytes = (elem[m[1]] ?? 4) * parseInt(m[2]);
    return { bytes, desc: `array of ${m[2]} × ${m[1]}` };
  }
  const basic: Record<string, { bytes: number; desc: string }> = {
    double: { bytes: 8, desc: 'IEEE 754 binary64' },
    float: { bytes: 4, desc: 'IEEE 754 binary32' },
    int: { bytes: 4, desc: 'signed 32-bit integer' },
    long: { bytes: 8, desc: 'signed 64-bit integer (LP64)' },
    short: { bytes: 2, desc: 'signed 16-bit integer' },
    char: { bytes: 1, desc: 'single byte' },
    bool: { bytes: 1, desc: 'boolean (1 byte in practice)' },
  };
  return basic[type] ?? { bytes: 8, desc: 'typical pointer/8-byte object' };
}

/* ---------------- ComplexityCompare ---------------- */
export function ComplexityCompare({ params }: { params: Record<string, unknown> }) {
  const exprs = (params.expressions as string[]) ?? ['n', 'n*log(n)'];
  const nMax = (params.nMax as number) ?? 1000;
  const [n, setN] = React.useState(Math.min(100, nMax));
  const fns = exprs.map(e => ({ e, f: safe(e) }));
  const raw = fns.map(({ f }) => f(n));
  const maxRaw = Math.max(...fns.map(({ f }) => f(nMax)), 1);
  const normalized = raw.map(v => v / maxRaw);
  const W = 560, H = 250, P = 36;
  const colors = ['var(--accent)', '#9a6d0b', 'var(--success)', 'var(--danger)', '#6d28d9'];
  const curves = fns.map(({ f, e }, idx) => {
    const pts: string[] = [];
    for (let i = 1; i <= 200; i++) {
      const x = (nMax * i) / 200;
      const v = f(x);
      if (!Number.isFinite(v) || v < 0) continue;
      pts.push(`${P + (i / 200) * (W - 2 * P)},${H - P - Math.min((v / maxRaw) * (H - 2 * P), H - 2 * P)}`);
    }
    return { e, pts, color: colors[idx % colors.length], at: v => f(v) };
  });
  return (
    <LabFrame title={`Growth comparison at n = ${n}`} caption={fns.map(({ e }, i) => `${e} = ${fmt(raw[i], raw[i] < 10 ? 3 : 0)} (${(normalized[i] * 100).toFixed(1)}% of max)`).join(' · ')}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke={FAINT} />
        {curves.map((c, i) => (
          <polyline key={i} fill="none" stroke={c.color} strokeWidth={2} points={c.pts.join(' ')} />
        ))}
        <line x1={P + (n / nMax) * (W - 2 * P)} y1={P} x2={P + (n / nMax) * (W - 2 * P)} y2={H - P} stroke={MUTED} strokeDasharray="3 3" />
        {curves.map((c, i) => (
          <g key={i}>
            <circle cx={P + (n / nMax) * (W - 2 * P)} cy={H - P - Math.min((c.at(n) / maxRaw) * (H - 2 * P), H - 2 * P)} r={4} fill={c.color} />
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-48"><Slider label="n" value={n} min={1} max={nMax} step={1} onChange={setN} format={v => v.toFixed(0)} /></div>
        <div className="flex gap-3 text-xs">
          {curves.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full inline-block" style={{ background: c.color }} />{c.e}</span>
          ))}
        </div>
      </div>
    </LabFrame>
  );
}

function safe(expr: string): (n: number) => number {
  // Replace log with Math.log, ^ with ** handled below via simple transforms


  const js = expr.replace(/\^/g, '**').replace(/\blog\b/g, 'Math.log').replace(/\bexp\b/g, 'Math.exp')
    .replace(/\bsqrt\b/g, 'Math.sqrt').replace(/\bn\b/g, 'x');
  try {
    const f = new Function('x', `"use strict"; return (${js});`) as (x: number) => number;
    const test = f(2);
    if (typeof test !== 'number') return () => NaN;
    return f;
  } catch {
    return x => x;
  }
}

/* ---------------- SortingVisual ---------------- */
export function SortingVisual({ params }: { params: Record<string, unknown> }) {
  const initial = ((params.data as number[]) ?? [43, 42, 41, 45, 38, 47]).map((v, i) => ({ v, id: i }));
  const [arr, setArr] = React.useState(initial);
  const [algo, setAlgo] = React.useState((params.algorithm as string) ?? 'bubble');
  const [comparisons, setComparisons] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const maxV = Math.max(...arr.map(a => a.v), 1);
  const step = () => {
    setArr(prev => {
      const a = [...prev];
      let done = true;
      let comps = 0;
      if (algo === 'bubble') {
        for (let i = 0; i < a.length - 1; i++) {
          comps++;
          if (a[i].v > a[i + 1].v) {
            [a[i], a[i + 1]] = [a[i + 1], a[i]];
            done = false;
            break;
          }
        }
        // full pass check


        for (let i = 0; i < a.length - 1; i++) if (a[i].v > a[i + 1].v) done = false;
      } else if (algo === 'insertion') {
        // one insertion step from current partial order: find first inversion from left


        for (let i = 1; i < a.length; i++) {
          comps++;
          if (a[i].v < a[i - 1].v) {
            let j = i;
            while (j > 0 && a[j - 1].v > a[j].v) { [a[j - 1], a[j]] = [a[j], a[j - 1]]; j--; }
            done = false;
            break;
          }
        }
        for (let i = 0; i < a.length - 1; i++) if (a[i].v > a[i + 1].v) done = false;
      } else {
        // selection: move min of suffix


        for (let i = 0; i < a.length - 1; i++) {
          if (a[i].v > a[i + 1].v) {
            let minI = i;
            for (let j = i + 1; j < a.length; j++) if (a[j].v < a[minI].v) minI = j;
            [a[i], a[minI]] = [a[minI], a[i]];
            done = false;
            break;
          }
        }
        for (let i = 0; i < a.length - 1; i++) if (a[i].v > a[i + 1].v) done = false;
      }
      setComparisons(c => c + comps);
      if (done && timer.current) { clearInterval(timer.current); timer.current = null; setRunning(false); }
      return a;
    });
  };
  function toggle() {
    if (running) {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setRunning(false);
    } else {
      timer.current = setInterval(step, 260);
      setRunning(true);
    }
  }
  React.useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const sortedIdx = arr.map((a, i) => a.v <= Math.min(...arr.slice(i).map(x => x.v)) && arr.slice(0, i).every(x => x.v <= a.v));
  return (
    <LabFrame title={`${algo} sort, one comparison per step`} caption={`Comparisons so far: ${comparisons}. ${algo === 'bubble' ? 'Bubble sort is O(n²), watch how many steps the last few elements need.' : algo === 'insertion' ? 'Insertion sort is excellent on nearly-sorted data, try it after one swap.' : 'Selection sort makes exactly n−1 swaps but still compares O(n²) times.'}`}>
      <div className="flex items-end gap-1 h-32 justify-center">
        {arr.map((a, i) => (
          <div key={a.id} className="flex flex-col items-center gap-1" style={{ width: `${Math.max(120 / arr.length, 4)}%` }}>
            <div className="w-full rounded-t-sm transition-all duration-200"
              style={{ height: `${(a.v / maxV) * 100}%`, background: sortedIdx[i] ? 'var(--success)' : ACCENT, opacity: 0.85 }} />
            <span className="text-[9px] tnum text-faint">{a.v}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        {['bubble', 'insertion', 'selection'].map(a => (
          <button key={a} onClick={() => { setAlgo(a); setArr(initial); setComparisons(0); if (timer.current) { clearInterval(timer.current); timer.current = null; setRunning(false); } }}
            className={algo === a ? 'text-xs px-3 py-1.5 rounded-md bg-accent text-accent-foreground' : 'text-xs px-3 py-1.5 rounded-md border hover:bg-surface-2'}>
            {a}
          </button>
        ))}
        <button onClick={toggle} className="text-xs px-3 py-1.5 rounded-md border hover:bg-surface-2">{running ? 'Pause' : 'Sort'}</button>
        <button onClick={() => { setArr(initial); setComparisons(0); if (timer.current) { clearInterval(timer.current); timer.current = null; setRunning(false); } }} className="text-xs px-3 py-1.5 rounded-md border hover:bg-surface-2">Reset</button>
      </div>
    </LabFrame>
  );
}

/* ---------------- HashTableVisual ---------------- */
export function HashTableVisual({ params }: { params: Record<string, unknown> }) {
  const keys = (params.keys as string[]) ?? ['acct-1000', 'acct-1001', 'acct-1002', 'acct-1003'];
  const [buckets, setBuckets] = React.useState((params.buckets as number) ?? 4);
  const hash = (s: string, m: number) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % m;
  };
  const table: string[][] = Array.from({ length: buckets }, () => []);
  for (const k of keys) table[hash(k, buckets)].push(k);
  const maxLen = Math.max(...table.map(t => t.length), 1);
  return (
    <LabFrame title={`Hash table: ${keys.length} keys → ${buckets} buckets`} caption={`Largest chain: ${maxLen} keys; load factor α = ${(keys.length / buckets).toFixed(2)}. More buckets → shorter chains → faster lookups, at the cost of memory.`}>
      <div className="grid gap-1.5 max-w-md mx-auto">
        {table.map((chain, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-16 text-xs text-faint tnum">bucket {i}</div>
            <div className="flex gap-1 flex-wrap flex-1">
              {chain.length === 0 && <span className="text-xs text-faint">empty</span>}
              {chain.map(k => (
                <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-accent-soft text-accent tnum">{k}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Slider label="buckets" value={buckets} min={1} max={12} step={1} onChange={setBuckets} format={v => v.toFixed(0)} />
      </div>
    </LabFrame>
  );
}

/* ---------------- BSTVisual ---------------- */
export function BSTVisual({ params }: { params: Record<string, unknown> }) {
  const values = (params.values as number[]) ?? [8, 3, 10, 1, 6, 14];
  const [target, setTarget] = React.useState((params.target as number) ?? values[0]);
  const tree = (() => {
    const nodes: { v: number; left: number | null; right: number | null }[] = [];
    for (const v of values) {
      if (nodes.length === 0) { nodes.push({ v, left: null, right: null }); continue; }
      let cur = 0;
      for (;;) {
        if (v < nodes[cur].v) {
          if (nodes[cur].left === null) { nodes[cur].left = nodes.length; nodes.push({ v, left: null, right: null }); break; }
          cur = nodes[cur].left as number;
        } else {
          if (nodes[cur].right === null) { nodes[cur].right = nodes.length; nodes.push({ v, left: null, right: null }); break; }
          cur = nodes[cur].right as number;
        }
      }
    }
    // layout: in-order index = x, depth = y


    const pos: { x: number; y: number }[] = new Array(nodes.length);
    let order = 0;
    const walk = (i: number, depth: number) => {
      if (i === null || i === undefined || i >= nodes.length) return;
      const n = nodes[i];
      walk(n.left as number, depth + 1);
      pos[i] = { x: order++, y: depth };
      walk(n.right as number, depth + 1);
    };
    walk(0, 0);
    return { nodes, pos, depth: Math.max(...pos.map(p => p.y)) };
  })();
  // search path


  const path = (() => {
    const out: number[] = [];
    let cur = 0;
    for (;;) {
      if (cur === null || cur === undefined || cur >= tree.nodes.length) break;
      out.push(cur);
      const v = tree.nodes[cur].v;
      if (v === target) break;
      cur = target < v ? (tree.nodes[cur].left as number) : (tree.nodes[cur].right as number);
    }
    return out;
  })();
  const W = 560, H = 40 + (tree.depth + 1) * 52;
  const px = (i: number) => 30 + (tree.pos[i].x / Math.max(values.length - 1, 1)) * (W - 60);
  const py = (i: number) => 26 + tree.pos[i].y * 52;
  return (
    <LabFrame title="Binary search tree" caption={`Search path for ${target}: ${path.map(i => tree.nodes[i].v).join(' → ')}, ${path.length} comparisons instead of up to ${values.length}. Balanced trees keep this path O(log n).`}>
      <svg viewBox={`0 0 ${W} ${Math.max(H, 160)}`} className="w-full h-auto">
        {tree.nodes.map((n, i) => (
          <g key={`e${i}`}>
            {n.left !== null && <line x1={px(i)} y1={py(i)} x2={px(n.left as number)} y2={py(n.left as number)} stroke={FAINT} />}
            {n.right !== null && <line x1={px(i)} y1={py(i)} x2={px(n.right as number)} y2={py(n.right as number)} stroke={FAINT} />}
          </g>
        ))}
        {path.map((i, k) => k > 0 && (
          <line key={`p${k}`} x1={px(path[k - 1])} y1={py(path[k - 1])} x2={px(i)} y2={py(i)} stroke={ACCENT} strokeWidth={2.5} />
        ))}
        {tree.nodes.map((n, i) => {
          const onPath = path.includes(i);
          return (
            <g key={i}>
              <circle cx={px(i)} cy={py(i)} r={16}
                fill={n.v === target ? ACCENT : onPath ? 'var(--accent-soft)' : 'var(--surface)'}
                stroke={ACCENT} strokeWidth={onPath ? 2 : 1} />
              <text x={px(i)} y={py(i) + 4} textAnchor="middle" fontSize="11" fill={n.v === target ? '#fff' : INK}>{n.v}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2">
        <Slider label="search target" value={target} min={Math.min(...values)} max={Math.max(...values)} step={1} onChange={setTarget} format={v => v.toFixed(0)} />
      </div>
    </LabFrame>
  );
}
