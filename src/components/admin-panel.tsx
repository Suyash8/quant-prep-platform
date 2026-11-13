'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  RefreshCw, Upload, FileJson, CheckCircle2, XCircle, AlertTriangle, ChevronDown,
  BookOpen, Puzzle, ClipboardCheck, FolderKanban, Building2, Clock, Layers,
} from 'lucide-react';
import type { ValidationReport } from '@/lib/admin-validate';

export type AdminStats = {
  lessons: number; modules: number; phases: number; problems: number;
  assessments: number; projects: number; companies: number; estHours: number;
};

export function AdminPanel({ report, stats }: { report: ValidationReport; stats: AdminStats }) {
  const [rep, setRep] = React.useState(report);
  const [busy, setBusy] = React.useState(false);
  const [importResult, setImportResult] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

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

  async function importJson(file: File) {
    if (!file.name.endsWith('.json')) { toast.error('Only .json files are accepted.'); return; }
    const text = await file.text();
    const res = await fetch('/api/admin/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, content: text }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? 'Import failed.'); setImportResult(data.error ?? 'failed'); return; }
    setImportResult(data.message);
    toast.success(data.message);
    revalidate();
  }

  /* two primary tiles carry the accent, the long tail stays neutral so the
     strip reads as hierarchy instead of seven equal shouts */
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
      {/* stat tiles */}
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

      {/* effort banner */}
      <div className="qf-card-flat p-4 flex items-center gap-4 !bg-surface-2/50">
        <span className="icon-tile icon-tile-sm icon-tile-accent"><Clock className="h-5 w-5" /></span>
        <p className="text-[15px] font-bold">
          ~{stats.estHours} hours of authored core content
          <span className="block text-[13px] font-semibold text-muted mt-0.5">Lesson time only, exercises, drills, assessments and projects add more.</span>
        </p>
      </div>

      {/* validation */}
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

          {/* validator status (not a repeat of the hero counts above) */}
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

      <div className="grid gap-5 lg:grid-cols-2 items-stretch">
        {/* import */}
        <section className="qf-card p-5 flex flex-col">
          <div className="flex items-center gap-3">
            <span className="icon-tile icon-tile-warning"><Upload className="h-6 w-6" /></span>
            <div>
              <h2 className="font-black">Bulk content import</h2>
              <p className="text-[13px] font-semibold text-muted">Drop a schema-valid JSON file to add content</p>
            </div>
          </div>
          <label
            className={`mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 cursor-pointer transition-colors select-none ${
              dragOver ? 'border-accent bg-accent-soft' : 'border-border-strong bg-surface-2/40 hover:bg-surface-2 hover:border-accent/60'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) importJson(f);
            }}
          >
            <Upload className={`h-7 w-7 ${dragOver ? 'text-accent' : 'text-faint'}`} />
            <span className="text-[15px] font-extrabold">Drag a .json file here</span>
            <span className="btn3d btn3d-ghost btn3d-sm" aria-hidden>Browse files</span>
            <span className="text-[13px] font-semibold text-muted text-center max-w-xs">
              Lesson, problem, assessment, project or company, validated before it lands in <code className="text-[0.9em] font-bold">content/</code>. Schema: content/README.md
            </span>
            <input type="file" accept=".json" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); }} />
          </label>
          {importResult && (
            <p className="mt-3 text-[13px] font-bold font-mono rounded-xl bg-surface-2/70 border border-border px-3 py-2 break-all">{importResult}</p>
          )}
        </section>

        {/* how content works: one container, divided rows, no nested cards */}
        <section className="qf-card p-5 flex flex-col">
          <div className="flex items-center gap-3">
            <span className="icon-tile icon-tile-info"><FileJson className="h-6 w-6" /></span>
            <div>
              <h2 className="font-black">How content works</h2>
              <p className="text-[13px] font-semibold text-muted">File-based authoring, validated on import</p>
            </div>
          </div>
          <ul className="mt-4 flex-1 divide-y divide-border rounded-2xl border-2 border-border bg-surface-2/40">
            {[
              { icon: Layers, k: 'Curriculum structure', v: 'Phases and modules live in content/map, edit via PR, validated on save' },
              { icon: BookOpen, k: 'Rich blocks', v: '10 lesson block types · 5 question types; interactive components registered in code' },
              { icon: FileJson, k: 'Stable ids', v: 'JSON files are immutable once published; changes ship as new versions' },
              { icon: CheckCircle2, k: 'Docs', v: 'Schema documentation lives in content/README.md' },
            ].map(item => (
              <li key={item.k} className="flex items-center gap-3 px-4 py-3">
                <span className="icon-tile icon-tile-sm icon-tile-neutral"><item.icon className="h-4 w-4" /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-extrabold">{item.k}</div>
                  <div className="text-[13px] font-semibold text-muted mt-0.5">{item.v}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
