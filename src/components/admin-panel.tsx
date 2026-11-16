'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  RefreshCw, FileJson, CheckCircle2, XCircle, AlertTriangle, ChevronDown,
  BookOpen, Puzzle, ClipboardCheck, FolderKanban, Building2, Clock, Layers,
  Mail, Flag,
} from 'lucide-react';
import type { ValidationReport } from '@/lib/admin-validate';

export type AdminStats = {
  lessons: number; modules: number; phases: number; problems: number;
  assessments: number; projects: number; companies: number; estHours: number;
};

interface ContactMsg {
  id: string; name: string; email: string; subject: string; message: string; status: string; createdAt: string;
}

interface ReportItem {
  id: string; lessonId: string | null; problemSlug: string | null; reason: string; comment: string; status: string; createdAt: string;
}

export function AdminPanel({ report, stats }: { report: ValidationReport; stats: AdminStats }) {
  const [rep, setRep] = React.useState(report);
  const [busy, setBusy] = React.useState(false);
  const [messages, setMessages] = React.useState<ContactMsg[]>([]);
  const [reports, setReports] = React.useState<ReportItem[]>([]);

  React.useEffect(() => {
    fetch('/api/admin/contact')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { messages?: ContactMsg[] } | null) => { if (d?.messages) setMessages(d.messages); })
      .catch(() => {});
    fetch('/api/admin/reports')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { reports?: ReportItem[] } | null) => { if (d?.reports) setReports(d.reports); })
      .catch(() => {});
  }, []);

  async function revalidate() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/validate');
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Validation failed.'); return; }
      setRep(data);
      toast.success(data.ok ? 'Content validation passed.' : `Validation found ${data.errors.length} error(s).`);
    } finally { setBusy(false); }
  }

  async function setMessageStatus(id: string, status: 'new' | 'answered' | 'spam') {
    const res = await fetch('/api/admin/contact', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, status } : m)));
      toast.success(`Ticket marked ${status}.`);
    }
  }

  async function setReportStatus(id: string, status: 'open' | 'resolved' | 'dismissed') {
    const res = await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success(`Report marked ${status}.`);
    }
  }

  const tiles = [
    { icon: BookOpen, label: 'Published lessons', value: stats.lessons, sub: `across ${stats.modules} modules`, cls: 'icon-tile-accent' },
    { icon: Puzzle, label: 'Judged problems', value: stats.problems, cls: 'icon-tile-accent' },
    { icon: Layers, label: 'Phases', value: stats.phases, cls: 'icon-tile-neutral' },
    { icon: Layers, label: 'Modules', value: stats.modules, cls: 'icon-tile-neutral' },
    { icon: ClipboardCheck, label: 'Assessments', value: stats.assessments, cls: 'icon-tile-neutral' },
    { icon: FolderKanban, label: 'Portfolio projects', value: stats.projects, cls: 'icon-tile-neutral' },
    { icon: Building2, label: 'Company profiles', value: stats.companies, cls: 'icon-tile-neutral' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {tiles.map((t, i) => (
          <div key={t.label} className="stat-tile anim-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
            <span className={`icon-tile icon-tile-sm ${t.cls}`}><t.icon className="h-5 w-5" /></span>
            <span className="stat-body">
              <span className="stat-value tnum">{t.value}</span>
              <span className="stat-label">{t.label}</span>
              {t.sub ? <span className="stat-sub">{t.sub}</span> : null}
            </span>
          </div>
        ))}
      </div>

      <div className="qf-card-flat p-4 flex items-center gap-4 !bg-surface-2/50">
        <span className="icon-tile icon-tile-sm icon-tile-accent"><Clock className="h-5 w-5" /></span>
        <p className="text-[15px] font-bold">
          ~{stats.estHours} hours of authored core content
          <span className="block text-[13px] font-semibold text-muted mt-0.5">Git-backed JSON workflow — content edits pass CI validation and pack compilation.</span>
        </p>
      </div>

      {/* Validation report */}
      <section className={`qf-card p-5 relative overflow-hidden ${rep.ok ? '' : '!border-danger/50'}`}>
        <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full ${rep.ok ? 'bg-accent-soft' : 'bg-danger-soft'}`} aria-hidden />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className={`icon-tile ${rep.ok ? 'icon-tile-accent' : 'icon-tile-danger'}`}>
                {rep.ok ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
              </span>
              <div>
                <h2 className="font-black">Content validation</h2>
                <p className="text-[13px] font-semibold text-muted">
                  {rep.ok ? 'All authored content passes the schema gate.' : 'The validator found problems, details below.'}
                </p>
              </div>
            </div>
            <button onClick={revalidate} disabled={busy} className="btn3d btn3d-sm disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Re-run validator
            </button>
          </div>

          <div className="mt-4 qf-card-flat px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className={`chip tnum ${rep.errors.length === 0 ? 'chip-success' : 'chip-danger'}`}>
              {rep.errors.length === 0 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {rep.errors.length} errors
            </span>
            <span className="chip chip-warning tnum"><AlertTriangle className="h-3 w-3" /> {rep.warnings.length} warnings</span>
            <span className="ml-auto text-[13px] font-semibold text-faint tnum">
              Validator ran {new Date(rep.ranAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>

          {rep.errors.length > 0 && (
            <div className="mt-3 rounded-2xl border-2 border-danger/30 p-3.5 bg-danger-soft/40 max-h-52 overflow-y-auto thin-scroll">
              <p className="text-[13px] font-black text-danger mb-2">Errors ({rep.errors.length})</p>
              <ul className="text-[13px] space-y-1 font-mono">{rep.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
          {rep.warnings.length > 0 && (
            <details className="mt-3 group rounded-2xl border-2 border-warning bg-warning-soft px-4 py-2.5">
              <summary className="text-[15px] font-black text-warning-strong dark:text-warning cursor-pointer flex items-center gap-2.5 select-none list-none [&::-webkit-details-marker]:hidden">
                <span className="icon-tile icon-tile-sm icon-tile-warning !h-7 !w-7"><AlertTriangle className="!h-4 !w-4" /></span>
                <span className="tnum">{rep.warnings.length} warnings</span>
                <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-2.5 text-[13px] space-y-1 font-mono max-h-40 overflow-y-auto thin-scroll rounded-xl bg-surface/70 border border-warning/25 p-3">
                {rep.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </details>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2 items-start">
        {/* Support contact inbox (D3) */}
        <section className="qf-card p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <span className="icon-tile icon-tile-info"><Mail className="h-5 w-5" /></span>
            <div>
              <h2 className="font-black">Support inbox ({messages.filter((m) => m.status === 'new').length} new)</h2>
              <p className="text-[13px] font-semibold text-muted">Submissions from /contact</p>
            </div>
          </div>
          {messages.length === 0 ? (
            <p className="text-[14px] font-semibold text-faint py-4">No contact submissions yet.</p>
          ) : (
            <ul className="space-y-3 max-h-96 overflow-y-auto thin-scroll">
              {messages.map((m) => (
                <li key={m.id} className="qf-card-flat p-3.5 text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black">{m.subject}</span>
                    <span className={`chip ${m.status === 'new' ? 'chip-warning' : 'chip-success'}`}>{m.status}</span>
                  </div>
                  <p className="text-muted font-semibold mt-0.5">{m.name} &lt;{m.email}&gt;</p>
                  <p className="mt-2 text-foreground whitespace-pre-wrap">{m.message}</p>
                  <div className="mt-2.5 flex gap-2">
                    {m.status !== 'answered' && (
                      <button type="button" onClick={() => setMessageStatus(m.id, 'answered')} className="btn3d btn3d-sm !py-1">Mark answered</button>
                    )}
                    {m.status !== 'spam' && (
                      <button type="button" onClick={() => setMessageStatus(m.id, 'spam')} className="btn3d btn3d-ghost btn3d-sm !py-1">Mark spam</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Content issue reports (H12) */}
        <section className="qf-card p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <span className="icon-tile icon-tile-warning"><Flag className="h-5 w-5" /></span>
            <div>
              <h2 className="font-black">Content reports ({reports.filter((r) => r.status === 'open').length} open)</h2>
              <p className="text-[13px] font-semibold text-muted">Learner flags from lessons &amp; problems</p>
            </div>
          </div>
          {reports.length === 0 ? (
            <p className="text-[14px] font-semibold text-faint py-4">No content reports open.</p>
          ) : (
            <ul className="space-y-3 max-h-96 overflow-y-auto thin-scroll">
              {reports.map((r) => (
                <li key={r.id} className="qf-card-flat p-3.5 text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black">{r.lessonId ?? r.problemSlug} · {r.reason}</span>
                    <span className={`chip ${r.status === 'open' ? 'chip-warning' : 'chip-success'}`}>{r.status}</span>
                  </div>
                  {r.comment && <p className="mt-1.5 text-foreground">{r.comment}</p>}
                  {r.status === 'open' && (
                    <div className="mt-2.5 flex gap-2">
                      <button type="button" onClick={() => setReportStatus(r.id, 'resolved')} className="btn3d btn3d-sm !py-1">Resolve</button>
                      <button type="button" onClick={() => setReportStatus(r.id, 'dismissed')} className="btn3d btn3d-ghost btn3d-sm !py-1">Dismiss</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="qf-card-flat p-5">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-neutral"><FileJson className="h-5 w-5" /></span>
          <div>
            <h2 className="font-black">Git-based authoring workflow</h2>
            <p className="text-[13px] font-semibold text-muted">
              Content files live in <code className="font-mono font-bold">content/</code> and are validated via <code className="font-mono font-bold">npm run verify:content</code> before pack generation. Runtime filesystem uploads are disabled for immutability.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
