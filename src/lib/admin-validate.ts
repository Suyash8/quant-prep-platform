import 'server-only';
import { execFile } from 'node:child_process';
import path from 'node:path';

export interface ValidationReport {
  ok: boolean;
  summary: string;
  errors: string[];
  warnings: string[];
  ranAt: string;
}

/** Runs the content validator (same gate CI uses) and returns its report. */
export function runContentValidation(): Promise<ValidationReport> {
  return new Promise(resolve => {
    const validator = ['scripts', 'validate-content.mjs'].join('/');
    execFile('node', [validator], { cwd: process.cwd(), timeout: 60000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      const out = `${stdout ?? ''}${stderr ?? ''}`;
      const lines = out.split('\n').filter(Boolean);
      const errors = lines.filter(l => l.includes('✗')).map(l => l.trim());
      const warnings = lines.filter(l => l.includes('⚠')).map(l => l.trim());
      const summaryLine = lines.find(l => l.includes('Authored & valid')) ?? 'validation output unavailable';
      resolve({
        ok: !err,
        summary: summaryLine.trim(),
        errors: errors.slice(0, 40),
        warnings: warnings.slice(0, 20),
        ranAt: new Date().toISOString(),
      });
    });
  });
}
