'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, MailWarning, Loader2 } from 'lucide-react';

export function VerifyEmailClient({ token }: { token: string }) {
  const [status, setStatus] = React.useState<'verifying' | 'ok' | 'error'>(token ? 'verifying' : 'error');
  const [email, setEmail] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string>('Verification link expired or invalid.');

  React.useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    let alive = true;
    fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const d = (await res.json().catch(() => ({}))) as { ok?: boolean; email?: string; error?: string };
        if (!alive) return;
        if (res.ok && d.ok) {
          setEmail(d.email ?? null);
          setStatus('ok');
          window.dispatchEvent(new CustomEvent('qf:auth-refresh'));
        } else {
          setErrorMsg(d.error || 'Verification link expired or invalid.');
          setStatus('error');
        }
      })
      .catch(() => {
        if (alive) {
          setErrorMsg('Network error while verifying your email.');
          setStatus('error');
        }
      });
    return () => { alive = false; };
  }, [token]);

  return (
    <main className="max-w-lg mx-auto px-4 py-16">
      <div className="qf-card p-8 text-center">
        {status === 'verifying' && (
          <>
            <span className="mx-auto h-14 w-14 rounded-2xl bg-surface-2 text-accent flex items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin" />
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight">Verifying your email…</h1>
            <p className="mt-2 text-[15px] font-semibold text-muted">Confirming your verification token securely.</p>
          </>
        )}
        {status === 'ok' && (
          <>
            <span className="mx-auto h-14 w-14 rounded-2xl bg-accent-soft text-accent-deep flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight">Email verified</h1>
            <p className="mt-2 text-[15px] font-semibold text-muted">
              {email ? <strong className="text-foreground">{email}</strong> : 'Your email'} is confirmed. You now have full account recovery and billing access.
            </p>
            <Link href="/dashboard" className="btn3d mt-6 inline-flex">Continue to dashboard</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <span className="mx-auto h-14 w-14 rounded-2xl bg-warning-soft text-warning-strong flex items-center justify-center">
              <MailWarning className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight">Verification link expired or invalid</h1>
            <p className="mt-2 text-[15px] font-semibold text-muted">
              {errorMsg} Open Account Settings to request a fresh verification email.
            </p>
            <Link href="/settings" className="btn3d mt-6 inline-flex">Go to settings</Link>
          </>
        )}
      </div>
    </main>
  );
}
