'use client';

import * as React from 'react';
import { Slider, LabFrame, fmt, INK, MUTED, FAINT, ACCENT } from './core';

/* ---------------- TerminalSteps: simulated shell session ---------------- */
export function TerminalSteps({ params }: { params: Record<string, unknown> }) {
  const steps0 = (params.steps as { cmd: string; out: string[]; note?: string }[]) ?? [];
  const [i, setI] = React.useState(0);
  const [ran, setRan] = React.useState(false);
  const step = steps0[Math.min(i, steps0.length - 1)];
  if (!step) {
    return <LabFrame title="Terminal" note=""><p className="text-[15px] text-faint">No steps configured.</p></LabFrame>;
  }
  return (
    <LabFrame title="Try it in a safe, simulated terminal" caption={step.note ?? 'Step through the commands, the output shown is what you would see.'}>
      <div className="font-mono text-[13px] sm:text-[13px] border rounded-lg bg-[#0d1117] text-[#c9d1d9] overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[12px] text-white/40">bash, simulation</span>
        </div>
        <div className="p-3 min-h-[110px] space-y-1">
          {steps0.slice(0, i + 1).map((s, k) => (
            <div key={k}>
              <div><span className="text-[#7ee787]">$</span> <span className="text-[#79c0ff]">{s.cmd}</span></div>
              {k === i && ran || k < i ? s.out.map((l, j) => <div key={j} className="text-[#c9d1d9] whitespace-pre">{l}</div>) : null}
            </div>
          ))}
          {i < steps0.length - 1 && !ran && <div className="text-white/30">… press Run to see the output</div>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => { setRan(true); }}
          className="px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-[13px] font-medium"
        >Run command</button>
        <div className="flex gap-1">
          {steps0.map((_, k) => (
            <button key={k} aria-label={`step ${k + 1}`} onClick={() => { setI(k); setRan(false); }}
              className={`h-1.5 w-6 rounded-full ${k === i ? 'bg-accent' : 'bg-border'}`} />
          ))}
        </div>
        <span className="text-[13px] text-faint ml-auto tnum">{i + 1} / {steps0.length}</span>
        <button onClick={() => { setI(v => Math.min(v + 1, steps0.length - 1)); setRan(false); }}
          disabled={i >= steps0.length - 1}
          className="px-3 py-1.5 rounded-md border text-[13px] disabled:opacity-40">Next →</button>
      </div>
    </LabFrame>
  );
}

/* ---------------- PipePipeline: stdin → cmds → stdout flow ---------------- */
export function PipePipeline({ params }: { params: Record<string, unknown> }) {
  const cmds = (params.commands as string[]) ?? ['cat trades.csv', 'grep BUY', 'wc -l'];
  const [open, setOpen] = React.useState(true);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setTick(v => v + 1), 700);
    return () => clearInterval(t);
  }, [open]);
  return (
    <LabFrame title="Pipelines: each command reads stdin, writes stdout"
      caption="The pipe (|) is a kernel buffer: the writer never meets the reader face to face. Close it to freeze the flow.">
      <div className="flex items-center gap-2 overflow-x-auto py-6 px-1">
        <span className="text-[13px] text-faint shrink-0 font-mono">stdin</span>
        <div className="flex-1 min-w-[30px] h-0.5 bg-border relative overflow-hidden">
          {open && Array.from({ length: 3 }).map((_, k) => (
            <span key={k} className="absolute h-1.5 w-1.5 rounded-full bg-accent"
              style={{ top: -2, left: `${((tick * 12 + k * 33) % 100)}%` }} />
          ))}
        </div>
        {cmds.map((c, idx) => (
          <React.Fragment key={idx}>
            <div className="shrink-0 border rounded-lg px-3 py-2 bg-surface-2 font-mono text-[13px]">{c}</div>
            {idx < cmds.length - 1 && (
              <div className="flex-1 min-w-[30px] h-0.5 bg-border relative overflow-hidden">
                {open && Array.from({ length: 3 }).map((_, k) => (
                  <span key={k} className="absolute h-1.5 w-1.5 rounded-full bg-accent"
                    style={{ top: -2, left: `${((tick * 12 + k * 33) % 100)}%` }} />
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
        <div className="flex-1 min-w-[30px] h-0.5 bg-border relative overflow-hidden">
          {open && Array.from({ length: 3 }).map((_, k) => (
            <span key={k} className="absolute h-1.5 w-1.5 rounded-full bg-accent"
              style={{ top: -2, left: `${((tick * 12 + k * 33) % 100)}%` }} />
          ))}
        </div>
        <span className="text-[13px] text-faint shrink-0 font-mono">stdout</span>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <button onClick={() => setOpen(o => !o)} className="px-3 py-1.5 rounded-md border text-[13px]">
          {open ? 'Pause flow' : 'Resume flow'}
        </button>
        <p className="text-[13px] text-muted">Each command runs as its own process; the kernel moves bytes between them without touching disk.</p>
      </div>
    </LabFrame>
  );
}

/* ---------------- PermissionBits: rwx calculator ---------------- */
const RWX = ['read', 'write', 'execute'];
export function PermissionBits({ params }: { params: Record<string, unknown> }) {
  const [bits, setBits] = React.useState([6, 4, 4]); // owner group other as 0-7


  const owners = ['owner', 'group', 'other'];
  const octal = bits.map(b => b.toString(8)).join('');
  const sym = bits.map(b => `${b & 4 ? 'r' : '-'}${b & 2 ? 'w' : '-'}${b & 1 ? 'x' : '-'}`).join('');
  const initial = (params.initialOctal as string) ?? '644';
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync lab state to the lesson-supplied initial value
    if (initial.length === 3 && /^[0-7]{3}$/.test(initial)) setBits(initial.split('').map(c => parseInt(c, 8)));
  }, [initial]);
  return (
    <LabFrame title="Permission bits: who can do what"
      caption="chmod 755 = owner rwx, group r-x, other r-x. The leading digit (setuid/setuid/sticky) is omitted here for clarity.">
      <div className="grid sm:grid-cols-3 gap-3">
        {owners.map((who, i) => (
          <div key={who} className="border rounded-lg p-3">
            <div className="text-[13px] font-medium mb-2">{who} <span className="text-faint tnum">({bits[i].toString(8)})</span></div>
            <div className="space-y-1.5">
              {RWX.map((r, j) => {
                const mask = 4 >> j;
                const on = (bits[i] & mask) !== 0;
                return (
                  <button key={r} onClick={() => setBits(b => b.map((v, k) => k === i ? (v ^ mask) : v))}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded border text-[13px] ${on ? 'bg-accent-soft border-accent/50' : 'opacity-50'}`}>
                    <span>{r}</span><span className="font-mono">{on ? (j === 0 ? 'r' : j === 1 ? 'w' : 'x') : '-'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[15px]">
        <code className="px-2 py-1 rounded bg-surface-2 border font-mono">chmod {octal} file</code>
        <code className="px-2 py-1 rounded bg-surface-2 border font-mono">-{sym}</code>
        <span className="text-[13px] text-muted">Every file carries these 9 bits, check them with <code className="font-mono">ls -l</code>.</span>
      </div>
    </LabFrame>
  );
}

/* ---------------- PacketJourney: TCP vs UDP delivery ---------------- */
export function PacketJourney({ params }: { params: Record<string, unknown> }) {
  const [proto, setProto] = React.useState<'tcp' | 'udp'>('tcp');
  const [lossRate, setLossRate] = React.useState(30);
  const [runs, setRuns] = React.useState<{ id: number; sent: number; delivered: number; retrans: number; time: number }[]>([]);
  const [seed, setSeed] = React.useState(1);
  function simulate() {
    let s = seed * 2654435761 % 4294967296;
    const rand = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; };
    const sent = 10;
    let delivered = 0, retrans = 0, hops = 0;
    for (let p = 1; p <= sent; p++) {
      let ok = false;
      while (!ok) {
        hops++;
        if (rand() * 100 >= lossRate) { ok = true; delivered++; }
        else if (proto === 'tcp') { retrans++; }
        else break;
        if (hops > 200) break;
      }
    }
    setRuns(r => [{ id: r.length, sent, delivered, retrans, time: hops }, ...r].slice(0, 6));
    setSeed(x => x + 1);
  }
  const last = runs[0];
  return (
    <LabFrame title="Reliable vs best-effort delivery"
      caption="TCP retransmits until the packet arrives (at a latency cost); UDP sends once and moves on. Markets pay for both behaviours, choice depends on the message.">
      <div className="flex flex-wrap gap-2 mb-3">
        {(['tcp', 'udp'] as const).map(p => (
          <button key={p} onClick={() => setProto(p)}
            className={`px-3 py-1.5 rounded-md text-[13px] font-medium border ${proto === p ? 'bg-accent text-accent-foreground border-accent' : ''}`}>
            {p.toUpperCase()}
          </button>
        ))}
        <div className="flex-1" />
        <label className="flex items-center gap-2 text-[13px] text-muted">
          loss per hop: <span className="tnum font-medium">{lossRate}%</span>
          <input type="range" min={0} max={60} value={lossRate} onChange={e => setLossRate(parseInt(e.target.value))} className="qf-range w-28" />
        </label>
        <button onClick={simulate} className="px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-[13px] font-medium">Send 10 packets</button>
      </div>
      <div className="grid grid-cols-9 gap-1.5">
        {Array.from({ length: 9 }).map((_, i) => {
          const reached = last && i < Math.round((last.delivered / last.sent) * 9);
          return <div key={i} className={`h-8 rounded border ${reached ? 'bg-accent-soft border-accent/40' : 'bg-surface-2 border-border'}`}></div>;
        })}
      </div>
      {last && (
        <p className="mt-3 text-[13px] text-muted tnum">
          delivered {last.delivered}/{last.sent} packets · {last.retrans} retransmissions · {last.time} total sends , {' '}
          {proto === 'tcp'
            ? 'TCP kept retrying: everything arrives, but loss directly adds latency.'
            : 'UDP moved on: some quotes are simply gone, the next one replaces them.'}
        </p>
      )}
      {runs.length > 1 && (
        <div className="mt-2 text-[12px] text-faint tnum">history: {runs.slice(1).map(r => `${r.delivered}/${r.sent}(${r.retrans}r)`).join(' · ')}</div>
      )}
    </LabFrame>
  );
}

/* ---------------- JoinVisual: SQL joins on two small tables ---------------- */
type JoinRow = { id: number; a: string | null; b: string | null; kind: 'inner' | 'left' | 'right' | 'outer' };
export function JoinVisual({ params }: { params: Record<string, unknown> }) {
  const tableA = (params.left as { id: number; name: string }[]) ?? [{ id: 1, name: 'AAPL' }, { id: 2, name: 'MSFT' }, { id: 3, name: 'ORCL' }];
  const tableB = (params.right as { id: number; name: string }[]) ?? [{ id: 2, name: 'MSFT' }, { id: 3, name: 'ORCL' }, { id: 4, name: 'NVDA' }];
  const [kind, setKind] = React.useState<'inner' | 'left' | 'right' | 'outer'>('inner');
  const idsA = new Set(tableA.map(r => r.id));
  const idsB = new Set(tableB.map(r => r.id));
  const allIds = [...new Set([...idsA, ...idsB])].sort((x, y) => x - y);
  const result: JoinRow[] = allIds
    .filter(id => kind === 'inner' ? (idsA.has(id) && idsB.has(id)) : true)
    .map(id => ({
      id,
      a: idsA.has(id) ? (kind === 'left' || kind === 'inner' || idsB.has(id) || kind === 'outer' ? tableA.find(r => r.id === id)!.name : tableA.find(r => r.id === id)!.name) : null,
      b: idsB.has(id) ? tableB.find(r => r.id === id)!.name : null,
      kind,
    }))
    .filter(r => {
      const inA = idsA.has(r.id), inB = idsB.has(r.id);
      if (kind === 'inner') return inA && inB;
      if (kind === 'left') return inA;
      if (kind === 'right') return inB;
      return true;
    })
    .map(r => ({ ...r, a: idsA.has(r.id) ? tableA.find(x => x.id === r.id)!.name : null, b: idsB.has(r.id) ? tableB.find(x => x.id === r.id)!.name : null }));
  const sql = {
    inner: 'SELECT * FROM a JOIN b ON a.id = b.id',
    left: 'SELECT * FROM a LEFT JOIN b ON a.id = b.id',
    right: 'SELECT * FROM a RIGHT JOIN b ON a.id = b.id',
    outer: 'SELECT * FROM a FULL OUTER JOIN b ON a.id = b.id',
  }[kind];
  return (
    <LabFrame title="Join types, on toy ticker tables" caption="LEFT keeps unmatched rows from the left table with NULLs on the right; FULL OUTER keeps both sides. Switch the type and watch the result.">
      <div className="flex flex-wrap gap-2 mb-3">
        {(['inner', 'left', 'right', 'outer'] as const).map(k => (
          <button key={k} onClick={() => setKind(k)}
            className={`px-3 py-1.5 rounded-md text-[13px] font-medium border capitalize ${kind === k ? 'bg-accent text-accent-foreground border-accent' : ''}`}>
            {k === 'inner' ? 'INNER' : k === 'left' ? 'LEFT' : k === 'right' ? 'RIGHT' : 'FULL OUTER'}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-[1fr_auto_1fr_auto_1fr] gap-3 items-start">
        <table className="text-[13px] w-full">
          <thead><tr className="text-faint"><th className="text-left py-1">prices (a)</th></tr></thead>
          <tbody>{tableA.map(r => (
            <tr key={r.id} className={`border-t ${result.some(x => x.a === r.name) ? '' : 'opacity-40'}`}>
              <td className="py-1 font-mono tnum">{r.id}</td><td className="py-1 font-mono">{r.name}</td>
            </tr>
          ))}</tbody>
        </table>
        <span className="text-faint text-[13px] self-center">⋈</span>
        <table className="text-[13px] w-full">
          <thead><tr className="text-faint"><th className="text-left py-1">positions (b)</th></tr></thead>
          <tbody>{tableB.map(r => (
            <tr key={r.id} className={`border-t ${result.some(x => x.b === r.name) ? '' : 'opacity-40'}`}>
              <td className="py-1 font-mono tnum">{r.id}</td><td className="py-1 font-mono">{r.name}</td>
            </tr>
          ))}</tbody>
        </table>
        <span className="text-faint text-[13px] self-center">=</span>
        <table className="text-[13px] w-full border rounded-lg overflow-hidden">
          <thead><tr className="bg-surface-2 text-faint"><th className="text-left px-2 py-1">id</th><th className="text-left px-2 py-1">a.name</th><th className="text-left px-2 py-1">b.name</th></tr></thead>
          <tbody>{result.map(r => (
            <tr key={r.id} className="border-t">
              <td className="px-2 py-1 font-mono tnum">{r.id}</td>
              <td className="px-2 py-1 font-mono">{r.a ?? <span className="text-faint italic">NULL</span>}</td>
              <td className="px-2 py-1 font-mono">{r.b ?? <span className="text-faint italic">NULL</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <code className="block mt-3 text-[12px] font-mono px-2 py-1.5 rounded bg-surface-2 border">{sql}</code>
    </LabFrame>
  );
}

/* ---------------- LatencyBudget: stacked components ---------------- */
export function LatencyBudget({ params }: { params: Record<string, unknown> }) {
  const [parts, setParts] = React.useState(
    (params.parts as { name: string; ns: number }[]) ?? [
      { name: 'NIC hardware', ns: 120 },
      { name: 'kernel network stack', ns: 3000 },
      { name: 'application logic', ns: 8000 },
      { name: 'syscall crossing', ns: 1500 },
    ]);
  const total = parts.reduce((n, p) => n + p.ns, 0);
  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
  return (
    <LabFrame title="Where does the time go?" caption="A latency budget forces honesty: if the parts sum to more than your target, no amount of tuning one layer will save you.">
      <div className="flex h-10 rounded-lg overflow-hidden border">
        {parts.map((p, i) => (
          <div key={p.name} className="flex items-center justify-center text-[12px] text-white/90 truncate px-1"
            style={{ width: `${(p.ns / total) * 100}%`, background: colors[i % colors.length] }}
            title={`${p.name}: ${p.ns} ns`}>
            {p.ns / total > 0.09 ? `${(p.ns / 1000).toFixed(2)} µs` : ''}
          </div>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {parts.map((p, i) => (
          <span key={p.name} className="text-[12px] text-muted flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm inline-block" style={{ background: colors[i % colors.length] }} />
            {p.name}
          </span>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {parts.map((p, i) => (
          <Slider key={p.name} label={p.name} value={p.ns} min={50} max={20000} step={50}
            onChange={v => setParts(ps => ps.map((q, k) => k === i ? { ...q, ns: v } : q))}
            format={v => v >= 1000 ? `${(v / 1000).toFixed(1)} µs` : `${v} ns`} />
        ))}
      </div>
      <p className="mt-3 text-[15px]">
        Round trip ≈ <span className="font-semibold tnum">{(total / 1000).toFixed(1)} µs</span>
        {' '}({fmt(total / 1e6, 3)} ms), {total / 1000 > 50
          ? 'comfortable for most strategy gateways'
          : total / 1000 > 10
            ? 'mid-range: kernel bypass would help'
            : 'HFT territory: every component is under scrutiny'}
      </p>
    </LabFrame>
  );
}

/* ---------------- PercentileExplorer: p50 vs p99 vs tail ---------------- */
export function PercentileExplorer({ params }: { params: Record<string, unknown> }) {
  const [tail, setTail] = React.useState(1.0); // % of slow outlier


  const [tailMult, setTailMult] = React.useState(10);
  const N = 1000;
  const base = 5; // µs


  const slow = base * tailMult;
  const nSlow = Math.round(N * tail / 100);
  const latencies = React.useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < N; i++) arr.push(i < nSlow ? slow : base);
    return arr.sort((a, b) => a - b);
  }, [nSlow, slow]);
  const p = (q: number) => latencies[Math.min(N - 1, Math.floor(q * N))];
  const max = slow;
  const bars = [
    { label: 'p50', v: p(0.50) }, { label: 'p90', v: p(0.90) }, { label: 'p99', v: p(0.99) },
    { label: 'p99.9', v: p(0.999) }, { label: 'max', v: latencies[N - 1] },
  ];
  return (
    <LabFrame title="Why we quote p99, not the average"
      caption="Averages hide the tail. If 1% of your orders take 10× longer, the mean barely moves, but the exchange sees every one of those slow orders.">
      <div className="space-y-3">
        {bars.map(b => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="text-[13px] text-muted w-14 text-right">{b.label}</span>
            <div className="flex-1 h-6 bg-surface-2 rounded border overflow-hidden">
              <div className="h-full rounded" style={{ width: `${(b.v / max) * 100}%`, background: b.v > base * 1.5 ? '#ef4444' : 'var(--accent)' }} />
            </div>
            <span className="text-[13px] tnum w-20 font-medium">{b.v.toFixed(1)} µs</span>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <Slider label="% of slow calls" value={tail} min={0.1} max={10} step={0.1} onChange={setTail} format={v => `${v.toFixed(1)}%`} />
        <Slider label="slow factor" value={tailMult} min={2} max={50} step={1} onChange={setTailMult} format={v => `${v.toFixed(0)}×`} />
      </div>
      <p className="mt-3 text-[13px] text-muted tnum">
        mean {fmt((base * (N - nSlow) + slow * nSlow) / N, 2)} µs · p99 {p(0.99).toFixed(1)} µs, the mean and the median agree
        almost perfectly, and the tail is a different world. This is why trading systems report percentile latencies.
      </p>
    </LabFrame>
  );
}

/* ---------------- OrderStateMachine: order lifecycle ---------------- */
const ORDER_STATES = ['NEW', 'SENT', 'ACKED', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED'] as const;
export function OrderStateMachine({ params }: { params: Record<string, unknown> }) {
  const [state, setState] = React.useState<string>('NEW');
  const [filled, setFilled] = React.useState(0);
  const qty = (params.quantity as number) ?? 1000;
  const transitions: Record<string, { label: string; to: string; fill?: number }[]> = {
    NEW: [{ label: 'send to venue', to: 'SENT' }],
    SENT: [{ label: 'exchange acknowledges', to: 'ACKED' }, { label: 'venue rejects (bad symbol, limits)', to: 'REJECTED' }],
    ACKED: [{ label: 'partial fill (market order slice)', to: 'PARTIALLY_FILLED', fill: Math.min(qty, Math.round(qty * 0.4)) }, { label: 'cancel request accepted', to: 'CANCELLED' }, { label: 'full fill', to: 'FILLED', fill: qty }],
    PARTIALLY_FILLED: [{ label: 'another slice fills', to: 'PARTIALLY_FILLED', fill: Math.min(qty, filled + Math.round(qty * 0.3)) }, { label: 'remaining quantity fills', to: 'FILLED', fill: qty }, { label: 'cancel the rest', to: 'CANCELLED' }],
    FILLED: [], CANCELLED: [], REJECTED: [],
  };
  const ops = transitions[state] ?? [];
  return (
    <LabFrame title="Order lifecycle: every state your OMS must handle"
      caption="Position keeping only works if every one of these transitions updates the books. A missed CANCELLED is a phantom position.">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {ORDER_STATES.map(s => (
          <span key={s} className={`px-2 py-1 rounded-md text-[12px] font-mono border ${s === state ? 'bg-accent text-accent-foreground border-accent' : state === 'PARTIALLY_FILLED' && s === 'ACKED' || (state === 'SENT' || state === 'ACKED' || state === 'PARTIALLY_FILLED' || state === 'FILLED' || state === 'CANCELLED' || state === 'REJECTED') && s === 'NEW' ? 'bg-surface-2' : 'bg-surface-2 opacity-50'}`}>{s}</span>
        ))}
      </div>
      <div className="border rounded-lg p-4 bg-surface-2/50">
        <div className="flex justify-between text-[13px] text-muted mb-1"><span>state: <span className="font-mono text-foreground">{state}</span></span><span className="tnum">filled {filled}/{qty}</span></div>
        <div className="h-2 rounded bg-border overflow-hidden mt-2"><div className="h-full bg-accent" style={{ width: `${(filled / qty) * 100}%` }} /></div>
        <div className="mt-4 flex flex-wrap gap-2">
          {ops.length > 0 ? ops.map((t, i) => (
            <button key={i} onClick={() => { setState(t.to); if (t.fill !== undefined) setFilled(t.fill); }}
              className="px-3 py-1.5 rounded-md border text-[13px] hover:border-accent">{t.label} →</button>
          )) : (
            <button onClick={() => { setState('NEW'); setFilled(0); }} className="px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-[13px]">Terminal state, place a new order</button>
          )}
        </div>
      </div>
      <p className="mt-3 text-[13px] text-muted">
        Executions arrive on the market data / drop-copy channel; your fills book, positions and P&amp;L must stay consistent with them, reconciliation exists because they won&apos;t always agree.
      </p>
    </LabFrame>
  );
}

/* ---------------- CovarianceLab: scatter, covariance, eigenvectors ---------------- */
export function CovarianceLab({ params }: { params: Record<string, unknown> }) {
  const [rho, setRho] = React.useState(0.8);
  const [sx, setSx] = React.useState(1.4);
  const [sy, setSy] = React.useState(0.7);
  const [seed, setSeed] = React.useState(7);
  const pts = React.useMemo(() => {
    const state = { s: seed >>> 0 };
    const rand = () => { state.s = (1103515245 * state.s + 12345) % 2147483648; return state.s / 2147483648; };
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < 120; i++) {
      const u = rand(), v = rand();
      // Box-Muller


      const z1 = Math.sqrt(-2 * Math.log(Math.max(u, 1e-9))) * Math.cos(2 * Math.PI * v);
      const z2 = Math.sqrt(-2 * Math.log(Math.max(u, 1e-9))) * Math.sin(2 * Math.PI * v);
      out.push({ x: sx * z1, y: sy * (rho * z1 + Math.sqrt(1 - rho * rho) * z2) });
    }
    return out;
  }, [rho, sx, sy, seed]);
  const cov = rho * sx * sy;
  const W = 320, H = 300, PAD = 30;
  const scale = 90; // px per unit


  const cx = W / 2, cy = H / 2;
  // eigenvectors of [[sx^2, cov],[cov, sy^2]]


  const a = sx * sx, b = cov, c = sy * sy;
  const tr = a + c, det = a * c - b * b;
  const disc = Math.max(0, (tr * tr) / 4 - det);
  const l1 = tr / 2 + Math.sqrt(disc), l2 = tr / 2 - Math.sqrt(disc);
  const theta = b !== 0 ? Math.atan2(l1 - a, b) : (a >= c ? 0 : Math.PI / 2);
  return (
    <LabFrame title="Covariance, correlation and the principal axes"
      caption="The ellipse axes are the eigenvectors of the covariance matrix; their lengths are the square roots of its eigenvalues. That is the whole of PCA in two dimensions.">
      <div className="grid sm:grid-cols-[300px_1fr] gap-4 items-start">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto border rounded-lg bg-surface-2/40" role="img">
          <line x1={PAD} y1={cy} x2={W - PAD} y2={cy} stroke="var(--border)" strokeWidth="1" />
          <line x1={cx} y1={PAD} x2={cx} y2={H - PAD} stroke="var(--border)" strokeWidth="1" />
          {pts.map((p, i) => <circle key={i} cx={cx + p.x * scale / 2.5} cy={cy - p.y * scale / 2.5} r="2.5" fill={ACCENT} opacity="0.55" />)}
          {/* principal axes */}
          <line x1={cx - Math.cos(theta) * 90} y1={cy + Math.sin(theta) * 90} x2={cx + Math.cos(theta) * 90} y2={cy - Math.sin(theta) * 90} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1={cx - Math.cos(theta + Math.PI / 2) * 55} y1={cy + Math.sin(theta + Math.PI / 2) * 55} x2={cx + Math.cos(theta + Math.PI / 2) * 55} y2={cy - Math.sin(theta + Math.PI / 2) * 55} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 3" />
        </svg>
        <div>
          <div className="space-y-2">
            <Slider label="σx" value={sx} min={0.3} max={2} onChange={setSx} />
            <Slider label="σy" value={sy} min={0.3} max={2} onChange={setSy} />
            <Slider label="ρ (corr)" value={rho} min={-0.95} max={0.95} onChange={setRho} />
          </div>
          <button onClick={() => setSeed(s => s + 1)} className="mt-3 px-3 py-1.5 rounded-md border text-[13px]">resample</button>
          <div className="mt-3 font-mono text-[12px] text-muted leading-relaxed">
            Σ = [[{fmt(sx * sx, 2)}, {fmt(cov, 2)}], [{fmt(cov, 2)}, {fmt(sy * sy, 2)}]]<br />
            eigenvalues: {fmt(l1, 2)}, {fmt(l2, 2)}<br />
            det Σ = {fmt(det, 3)} {det > 0 ? '(positive definite ✓)' : '(singular!)'}
          </div>
        </div>
      </div>
    </LabFrame>
  );
}

/* ---------------- FloatErrorLab: float32 vs float64, cancellation ---------------- */
export function FloatErrorLab({ params }: { params: Record<string, unknown> }) {
  const [mode, setMode] = React.useState<'mean' | 'variance' | 'subtract'>('subtract');
  const [n, setN] = React.useState(1000);
  const [spread, setSpread] = React.useState(0.001);
  const run = React.useMemo(() => {
    const base = 1000000.5; // large level, tiny perturbations: the classic killer


    let s32 = 0, s64 = 0, sq32 = 0, sq64 = 0;
    const f32 = new Float32Array(n);
    let minDiff = Infinity, maxDiff = -Infinity;
    const state = { s: 42 };
    const rand = () => { state.s = (1103515245 * state.s + 12345) % 2147483648; return state.s / 2147483648; };
    const values: number[] = [];
    for (let i = 0; i < n; i++) {
      const v = base + (rand() * 2 - 1) * base * spread;
      values.push(v);
      f32[i] = v;
      s64 += v;
      s32 = Math.fround(s32 + f32[i]);
      sq64 += v * v;
      sq32 = Math.fround(sq32 + Math.fround(f32[i] * f32[i]));
      if (i > 0) { const d = v - values[i - 1]; if (Math.abs(d) < Math.abs(minDiff)) minDiff = d; if (Math.abs(d) > Math.abs(maxDiff)) maxDiff = d; }
    }
    const mean64 = s64 / n, mean32 = s32 / n;
    const var64 = sq64 / n - mean64 * mean64;
    const var32 = sq32 / n - mean32 * mean32;
    return {
      mean: { f64: mean64, f32: mean32, truth: values.reduce((a, b) => a + b, 0) / n },
      variance: { f64: var64, f32: var32, truth: values.reduce((a, b) => a + (b - values.reduce((x, y) => x + y, 0) / n) ** 2, 0) / n },
      subtract: { f64: maxDiff, f32: Math.fround(maxDiff), truth: maxDiff },
    };
  }, [n, spread]);
  const rows = mode === 'mean'
    ? [{ k: 'float32', v: run.mean.f32 }, { k: 'float64', v: run.mean.f64 }, { k: 'exact (JS number)', v: run.mean.truth }]
    : mode === 'variance'
      ? [{ k: 'float32 (E[x²]−E[x]²)', v: run.variance.f32 }, { k: 'float64 (E[x²]−E[x]²)', v: run.variance.f64 }, { k: 'two-pass exact', v: run.variance.truth }]
      : [{ k: 'float32 difference', v: run.subtract.f32 }, { k: 'float64 difference', v: run.subtract.f64 }, { k: 'true difference', v: run.subtract.truth }];
  const labels = {
    mean: 'summing n values then dividing',
    variance: 'the one-pass variance formula',
    subtract: 'subtracting two nearly-equal values',
  };
  return (
    <LabFrame title="Floating point: where the precision goes to die"
      caption="All samples sit near 1,000,000.5 with a tiny spread, exactly the situation in price series around a level. Switch the operation and watch each one fail differently.">
      <div className="flex flex-wrap gap-2 mb-3">
        {([['subtract', 'cancellation'], ['mean', 'naive sum'], ['variance', 'one-pass variance']] as const).map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-md text-[13px] font-medium border ${mode === m ? 'bg-accent text-accent-foreground border-accent' : ''}`}>{label}</button>
        ))}
      </div>
      <div className="space-y-2">
        <Slider label="samples (n)" value={n} min={100} max={10000} step={100} onChange={setN} format={v => v.toFixed(0)} />
        <Slider label="relative spread" value={spread} min={0.00001} max={0.01} step={0.00001} onChange={setSpread} format={v => v.toExponential(1)} />
      </div>
      <table className="mt-4 w-full text-[13px]">
        <thead><tr className="text-faint text-left"><th className="py-1">computation</th><th className="py-1 text-right">result</th><th className="py-1 text-right">vs exact</th></tr></thead>
        <tbody>
          {rows.map(r => {
            const truth = rows[rows.length - 1].v;
            const rel = truth !== 0 ? Math.abs((r.v - truth) / truth) : Math.abs(r.v - truth);
            return (
              <tr key={r.k} className="border-t">
                <td className="py-1.5 font-mono">{r.k}</td>
                <td className="py-1.5 text-right tnum font-medium">{r.v.toPrecision(10)}</td>
                <td className={`py-1.5 text-right tnum ${rel > 1e-4 ? 'text-danger font-semibold' : rel > 1e-8 ? 'text-amber-500' : ''}`}>
                  {rel === 0 ? 'exact' : rel < 1e-6 ? rel.toExponential(1) : rel.toExponential(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[13px] text-muted">
        Currently showing {labels[mode]}. In production systems: accumulate with Kahan sums or Welford&apos;s algorithm, and never
        compute variance as E[x²]−E[x]² in float32.
      </p>
    </LabFrame>
  );
}

export function MemoryPool({ params }: { params: Record<string, unknown> }) {
  const [allocs, setAllocs] = React.useState<{ id: number; size: number; t: number }[]>([]);
  const [mode, setMode] = React.useState<'malloc' | 'pool'>('malloc');
  const [now, setNow] = React.useState(0);
  const [cost, setCost] = React.useState(0);
  const nextId = React.useRef(1);
  const SLOT = 64;
  const POOL_SLOTS = 24;
  const MALLOC_COST_NS = 70;
  const POOL_COST_NS = 4;
  function allocate() {
    const size = 16 + Math.floor(Math.random() * 6) * 16;
    const t = now + 1;
    setAllocs(a => [...a, { id: nextId.current++, size, t }]);
    setCost(c => c + (mode === 'malloc' ? MALLOC_COST_NS : POOL_COST_NS));
    setNow(t);
  }
  function freeSome() {
    setAllocs(a => a.slice(Math.max(0, a.length - 4)));
    setCost(c => c + (mode === 'malloc' ? 60 : 0));
    setNow(n => n + 1);
  }
  const poolBlocks = Array.from({ length: POOL_SLOTS });
  return (
    <LabFrame title="General-purpose malloc vs a fixed-slot memory pool"
      caption="A pool trades flexibility for speed and determinism: allocation is pointer arithmetic, not a search. The cost column shows cumulative nanoseconds charged per operation.">
      <div className="flex flex-wrap gap-2 mb-3">
        {(['malloc', 'pool'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} disabled={allocs.length > 0}
            className={`px-3 py-1.5 rounded-md text-[13px] font-medium border ${mode === m ? 'bg-accent text-accent-foreground border-accent' : ''} disabled:opacity-60`}>
            {m === 'malloc' ? 'std::malloc / new' : 'fixed-slot pool'}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={allocate} className="px-3 py-1.5 rounded-md border text-[13px]">allocate 16-112 B</button>
        <button onClick={freeSome} className="px-3 py-1.5 rounded-md border text-[13px]" disabled={!allocs.length}>free 4</button>
        <button onClick={() => { setAllocs([]); setCost(0); }} className="px-3 py-1.5 rounded-md border text-[13px]">reset</button>
      </div>
      <div className="border rounded-lg p-3 bg-surface-2/40">
        {mode === 'pool' ? (
          <div className="flex flex-wrap gap-1">
            {poolBlocks.map((_, i) => {
              const used = allocs[i];
              return (
                <div key={i} className={`w-9 h-9 rounded border text-[12px] flex items-center justify-center tnum ${used ? 'bg-accent-soft border-accent/50' : 'bg-surface border-border'}`}
                  title={used ? `block ${i}: ${used.size} B in a ${SLOT} B slot` : `block ${i}: free (${SLOT} B)`}>
                  {used ? used.size : ''}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-1 items-start">
            {allocs.length === 0 && <span className="text-[13px] text-faint">heap empty, allocate a few objects</span>}
            {allocs.map(a => (
              <div key={a.id} className="h-6 rounded border bg-accent-soft border-accent/50 text-[12px] flex items-center px-1.5 tnum" style={{ width: `${Math.min(100, a.size)}%` }}>
                {a.size} B
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="mt-3 text-[13px] text-muted tnum">
        {allocs.length} live allocations · cumulative allocator cost ≈ {cost} ns
        {mode === 'pool' && allocs.some(a => a.size > SLOT) && ', note: an allocation larger than the slot size would not fit a fixed pool (it needs a size class or a fallback).'}
      </p>
    </LabFrame>
  );
}
