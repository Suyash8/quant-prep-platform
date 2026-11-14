'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Sigma, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token. Request a new password reset link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Could not reset password.');
        return;
      }
      toast.success('Password updated successfully.');
      router.push('/dashboard');
      router.refresh();
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
          <h1 className="mt-4 text-2xl font-black tracking-tight">Choose a new password</h1>
          <p className="mt-1 text-[15px] font-semibold text-muted">
            Your active sessions will refresh cleanly once updated.
          </p>
        </div>

        <form onSubmit={onSubmit} className="qf-card p-6 space-y-4">
          {!token && (
            <div className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[14px] font-bold text-danger">
              No reset token found in this URL. Please request a fresh link.
            </div>
          )}
          <div>
            <label htmlFor="new-pw" className="text-[14px] font-extrabold">New password</label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" aria-hidden />
              <input
                id="new-pw"
                type={showPw ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="qf-input !h-12 !pl-10 !pr-11"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-xl text-muted hover:bg-surface-2"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-pw" className="text-[14px] font-extrabold">Confirm password</label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" aria-hidden />
              <input
                id="confirm-pw"
                type={showPw ? 'text' : 'password'}
                required
                minLength={8}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="qf-input !h-12 !pl-10"
                autoComplete="new-password"
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-[14px] font-bold text-danger bg-danger-soft rounded-xl px-3 py-2">{error}</p>
          )}
          <button type="submit" disabled={busy || !token} className="btn3d w-full !py-3">
            {busy ? 'Updating…' : 'Set new password'}
          </button>
          <p className="text-center text-[14px] font-semibold text-muted">
            <Link href="/login" className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ResetPasswordInner />
    </Suspense>
  );
}
