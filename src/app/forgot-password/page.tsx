'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, Sigma } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [devResetPath, setDevResetPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDevResetPath(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Could not process request.');
        return;
      }
      setSentMessage(data.message);
      if (data.devResetPath) setDevResetPath(data.devResetPath);
      toast.success('Reset instructions issued.');
    } catch {
      setError('Network error while connecting to server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-surface-2/40 to-transparent">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/" className="mx-auto h-12 w-12 rounded-2xl bg-accent text-on-accent inline-flex items-center justify-center shadow-[0_4px_0_0_var(--accent-deep)]">
            <Sigma className="h-6 w-6" aria-hidden />
          </Link>
          <h1 className="mt-4 text-2xl font-black tracking-tight">Reset your password</h1>
          <p className="mt-1 text-[15px] font-semibold text-muted">
            Enter your account email and we will issue a 30-minute reset link.
          </p>
        </div>

        <div className="qf-card p-6 space-y-4">
          {sentMessage ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-accent-soft/60 border border-accent/30 p-3.5 text-[14px] font-semibold text-foreground">
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span>{sentMessage}</span>
              </div>
              {devResetPath && (
                <div className="rounded-xl border border-border bg-surface-2 p-3 text-[13px]">
                  <p className="font-bold text-muted mb-1.5">Local dev preview link (not shown in production):</p>
                  <Link href={devResetPath} className="font-bold text-accent hover:underline break-all">
                    Open reset password page →
                  </Link>
                </div>
              )}
              <Link href="/login" className="btn3d btn3d-ghost w-full">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="text-[14px] font-extrabold">Email</label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" aria-hidden />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="qf-input !h-12 !pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>
              {error && (
                <p role="alert" className="text-[14px] font-bold text-danger bg-danger-soft rounded-xl px-3 py-2">{error}</p>
              )}
              <button type="submit" disabled={busy} className="btn3d w-full !py-3">
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
              <p className="text-center text-[14px] font-semibold text-muted">
                Remembered it? <Link href="/login" className="text-accent-deep dark:text-accent font-extrabold hover:underline">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
