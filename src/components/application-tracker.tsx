'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface AppRow { id: string; company: string; role: string; status: string; note: string }

const STATUSES = ['planned', 'applied', 'oa', 'interview', 'offer', 'rejected'];

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
    <div className="mt-4">
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company" className="h-10 px-3 rounded-xl border-2 bg-surface text-sm w-40" aria-label="Company" />
        <input value={role} onChange={e => setRole(e.target.value)} placeholder="Role" className="h-10 px-3 rounded-xl border-2 bg-surface text-sm w-56" aria-label="Role" />
        <button type="submit" className="btn3d">
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>
      <div className="mt-4 qf-card-flat divide-y">
        {rows.length === 0 && <div className="px-4 py-6 text-center text-sm text-faint">No applications tracked yet. Add one when you start applying.</div>}
        {rows.map(r => {
          const removeLabel = 'Remove ' + r.company + ' application';
          return (
          <div key={r.id} className="px-4 py-2.5 flex items-center gap-3 text-sm flex-wrap">
            <span className="font-bold min-w-32">{r.company}</span>
            <span className="text-muted flex-1 min-w-40">{r.role}</span>
            <select value={r.status} onChange={e => update(r.id, { status: e.target.value })} className="h-8 px-2 rounded-lg border-2 bg-background text-xs" aria-label="Status">
              {STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
            <input
              defaultValue={r.note}
              onBlur={e => update(r.id, { note: e.target.value })}
              placeholder="notes…"
              className="h-8 px-2 rounded-lg border-2 bg-background text-xs flex-1 min-w-40"
              aria-label="Notes"
            />
            <button onClick={() => remove(r.id)} className="text-faint hover:text-danger press" aria-label={removeLabel}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );
}
