'use client';

import * as React from 'react';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface AppRow { id: string; company: string; role: string; status: string; note: string }

const STATUSES = ['planned', 'applied', 'oa', 'interview', 'offer', 'rejected'];

const STATUS_META: Record<string, { label: string; cls: string }> = {
  planned: { label: 'Planned', cls: 'chip' },
  applied: { label: 'Applied', cls: 'chip chip-info' },
  oa: { label: 'Online assessment', cls: 'chip chip-warning' },
  interview: { label: 'Interview', cls: 'chip-gold' },
  offer: { label: 'Offer', cls: 'chip chip-success' },
  rejected: { label: 'Rejected', cls: 'chip chip-danger' },
};

const TILE_COLORS = ['icon-tile-accent', 'icon-tile-info', 'icon-tile-warning', 'icon-tile-violet', 'icon-tile-gold', 'icon-tile-danger'];

function monogram(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

function tileFor(name: string) {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return TILE_COLORS[h % TILE_COLORS.length];
}

export function ApplicationTracker({ initial }: { initial: AppRow[] }) {
  const [rows, setRows] = React.useState<AppRow[]>(initial);
  const [company, setCompany] = React.useState('');
  const [role, setRole] = React.useState('');

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;
    const res = await fetch('/api/applications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, role, status: 'planned' }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? 'Failed.'); return; }
    setRows(r => [...r, data.application]);
    setCompany(''); setRole('');
    toast.success(`${company} added to your tracker.`);
  }

  async function update(id: string, patch: Partial<AppRow>) {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
    const res = await fetch('/api/applications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) toast.error('Update failed.');
  }

  async function remove(id: string) {
    setRows(rs => rs.filter(r => r.id !== id));
    await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, delete: true }) });
  }

  return (
    <div className="mt-4 qf-card p-4 sm:p-5">
      {/* add form */}
      <form onSubmit={add} className="qf-card-flat p-3.5 !bg-surface-2/50 flex flex-wrap gap-2.5 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-44">
          <Building2 className="h-4 w-4 text-faint shrink-0" aria-hidden />
          <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company (e.g. Optiver)" className="qf-input h-10 py-0 text-sm flex-1" aria-label="Company" />
        </div>
        <input value={role} onChange={e => setRole(e.target.value)} placeholder="Role (e.g. Graduate C++ Developer)" className="qf-input h-10 py-0 text-sm flex-1 min-w-52" aria-label="Role" />
        <button type="submit" className="btn3d btn3d-sm h-10">
          <Plus className="h-4 w-4" /> Track application
        </button>
      </form>

      {/* rows */}
      {rows.length === 0 ? (
        <div className="qf-empty">
          <span className="empty-emoji" role="img" aria-label="empty clipboard">🗒️</span>
          <p className="text-base font-extrabold">No applications tracked yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm font-semibold text-muted">
            Add the first one when you start applying, statuses update inline and stay private to your account.
          </p>
        </div>
      ) : (
        <div className="mt-4 divide-y-2 divide-border">
          {rows.map(r => {
            const removeLabel = 'Remove ' + r.company + ' application';
            return (
              <div key={r.id} className="py-3 flex items-center gap-3 text-sm flex-wrap anim-slide-up">
                <span className={`icon-tile icon-tile-sm ${tileFor(r.company)}`}>
                  <span className="font-black text-sm tracking-tight">{monogram(r.company)}</span>
                </span>
                <span className="min-w-36 flex-1">
                  <span className="block font-bold truncate">{r.company}</span>
                  <span className="block text-xs text-muted font-semibold truncate">{r.role}</span>
                </span>
                <select value={r.status} onChange={e => update(r.id, { status: e.target.value })} className="qf-select-sm h-9 !py-0 text-xs font-bold shrink-0" aria-label={'Status for ' + r.company}>
                  {STATUSES.map(s => <option key={s} value={s}>{(STATUS_META[s] ?? { label: s }).label}</option>)}
                </select>
                <input
                  defaultValue={r.note}
                  onBlur={e => update(r.id, { note: e.target.value })}
                  placeholder="notes…"
                  className="qf-input h-9 py-0 text-xs w-44"
                  aria-label="Notes"
                />
                <button onClick={() => remove(r.id)} className="text-faint hover:text-danger press shrink-0" aria-label={removeLabel}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
