'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, CheckCircle2, CreditCard, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingClientProps {
  user: { name: string; email: string; plan?: string | null } | null;
  lessonCount: number;
  problemCount: number;
  projectCount: number;
  assessmentCount: number;
  stripeEnabled: boolean;
  initialStatus?: string | null;
}

export function PricingClient({
  user: initialUser,
  lessonCount,
  problemCount,
  projectCount,
  assessmentCount,
  stripeEnabled,
  initialStatus,
}: PricingClientProps) {
  const router = useRouter();
  const [user, setUser] = React.useState(initialUser);
  React.useEffect(() => {
    if (initialUser) return;
    try {
      const raw = window.localStorage.getItem('qf-chrome-user');
      if (raw) {
        const u = JSON.parse(raw) as { name?: string; email?: string; plan?: string };
        if (u?.name) setUser({ name: u.name, email: u.email ?? '', plan: u.plan ?? 'free' });
      }
    } catch { /* ignore */ }
    if (navigator.onLine) {
      fetch('/api/auth/me', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { user?: { name: string; email: string; plan?: string | null } | null } | null) => {
          if (d?.user) setUser(d.user);
        })
        .catch(() => {});
    }
  }, [initialUser]);
  const [interval, setInterval] = React.useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(
    initialStatus === 'success'
      ? 'Payment confirmed. Your Pro access will finish activating shortly.'
      : initialStatus === 'cancelled'
        ? 'Checkout was cancelled. You can upgrade anytime.'
        : null,
  );

  React.useEffect(() => {
    if (typeof window === 'undefined' || initialStatus) return;
    const checkout = new URLSearchParams(window.location.search).get('checkout');
    if (checkout === 'success') setNotice('Payment confirmed. Your Pro access will finish activating shortly.');
    else if (checkout === 'cancelled') setNotice('Checkout was cancelled. You can upgrade anytime.');
  }, [initialStatus]);

  const proMonthlyEquivalent = interval === 'annual' ? 22 : 29;
  const currentPlan = user?.plan ?? 'free';

  async function handleProCheckout() {
    if (!user) {
      router.push('/register?next=/pricing');
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        configured?: boolean;
        contactUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setNotice(data.error ?? 'Unable to start checkout right now. Please try again.');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.configured === false) {
        router.push(data.contactUrl ?? '/contact?subject=Pro%20Access');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-10 sm:py-14">
      <header className="text-center max-w-2xl mx-auto">
        <span className="chip chip-accent">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> Transparent pricing
        </span>
        <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">
          Start free. Upgrade when you go deep.
        </h1>
        <p className="mt-3 text-[16px] font-semibold text-muted leading-relaxed">
          Master mathematics, C++, Python, systems engineering, and quantitative finance on your schedule. No auto-charging trials, no lock-in contracts.
        </p>

        {/* Billing cadence switch */}
        <div className="mt-6 inline-flex items-center gap-1 rounded-2xl border-2 border-border bg-surface p-1.5">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={cn(
              'press rounded-xl px-4 py-2 text-[14px] font-extrabold transition-colors',
              interval === 'monthly' ? 'bg-accent text-on-accent' : 'text-muted hover:text-foreground',
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval('annual')}
            className={cn(
              'press rounded-xl px-4 py-2 text-[14px] font-extrabold transition-colors inline-flex items-center gap-2',
              interval === 'annual' ? 'bg-accent text-on-accent' : 'text-muted hover:text-foreground',
            )}
          >
            Annual
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-black',
              interval === 'annual' ? 'bg-surface text-accent-deep' : 'bg-accent-soft text-accent-deep dark:text-accent',
            )}>
              Save 25%
            </span>
          </button>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className="mt-6 max-w-2xl mx-auto rounded-2xl border-2 border-accent bg-accent-soft/70 px-4 py-3 text-center text-[14px] font-bold text-foreground"
        >
          {notice}
        </div>
      )}

      {/* Plan cards */}
      <div className="mt-10 grid gap-6 lg:grid-cols-3 items-stretch">
        {/* Starter */}
        <section className="qf-card p-6 flex flex-col">
          <div>
            <p className="text-[13px] font-black uppercase tracking-wider text-faint">Starter</p>
            <h2 className="mt-1 text-2xl font-black">Free Foundations</h2>
            <p className="mt-1.5 text-[14px] font-semibold text-muted">
              Diagnostic placement plus full Phase 0 &amp; Phase 1 access to test the workflow.
            </p>
          </div>
          <div className="mt-6 flex items-baseline gap-1.5">
            <span className="text-4xl font-black tnum">$0</span>
            <span className="text-[14px] font-bold text-muted">/ forever</span>
          </div>
          <ul className="mt-6 space-y-3 flex-1 text-[14px] font-semibold text-muted">
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> 28-question cross-domain diagnostic</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Phases 0–1 foundations (84 authored lessons)</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> 10 foundational coding challenges</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> SM-2 spaced-repetition flashcards</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Firm career matrix &amp; skill maps</li>
          </ul>
          <div className="mt-7">
            <Link href={user ? '/dashboard' : '/register'} className="btn3d btn3d-ghost w-full justify-center">
              {user ? 'Open your workspace' : 'Create free account'}
            </Link>
          </div>
        </section>

        {/* Pro Quant */}
        <section className="qf-card p-6 flex flex-col !border-accent relative bg-surface">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-black uppercase tracking-wider text-accent-deep dark:text-accent">Most popular</p>
            <span className="chip chip-accent">Full Access</span>
          </div>
          <h2 className="mt-1 text-2xl font-black">Pro Quant</h2>
          <p className="mt-1.5 text-[14px] font-semibold text-muted">
            Complete engineering &amp; quant preparation with unlimited judged C++/Python execution.
          </p>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl font-black tnum">${proMonthlyEquivalent}</span>
            <span className="text-[14px] font-bold text-muted">/ month</span>
            {interval === 'annual' && (
              <span className="ml-auto text-[12px] font-black text-accent-deep dark:text-accent tnum">Billed $259/yr</span>
            )}
          </div>
          <ul className="mt-6 space-y-3 flex-1 text-[14px] font-semibold text-muted">
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> All 11 phases &amp; {lessonCount} authored lessons</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> All {problemCount} judged C++17/20, Python &amp; SQL problems</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> {assessmentCount} timed interview &amp; screening assessments</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> {projectCount} quantitative engineering capstone builds</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> All interactive browser labs &amp; mental-math drills</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Priority support via Contact portal</li>
          </ul>
          <div className="mt-7">
            {currentPlan === 'pro' ? (
              <Link href="/dashboard" className="btn3d w-full justify-center">
                <Check className="h-4 w-4" /> Active on Pro
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleProCheckout}
                disabled={loading}
                className="btn3d w-full justify-center"
              >
                <CreditCard className="h-4 w-4" />
                {loading
                  ? 'Connecting...'
                  : !user
                    ? 'Start with Pro'
                    : stripeEnabled
                      ? `Upgrade to Pro (${interval === 'annual' ? '$259/yr' : '$29/mo'})`
                      : 'Request Pro activation'}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>

        {/* Teams */}
        <section className="qf-card p-6 flex flex-col">
          <div>
            <p className="text-[13px] font-black uppercase tracking-wider text-faint">Teams &amp; Universities</p>
            <h2 className="mt-1 text-2xl font-black">Cohort License</h2>
            <p className="mt-1.5 text-[14px] font-semibold text-muted">
              For student quant societies, university seminars, and junior analyst onboarding cohorts.
            </p>
          </div>
          <div className="mt-6 flex items-baseline gap-1.5">
            <span className="text-4xl font-black">Custom</span>
            <span className="text-[14px] font-bold text-muted">/ seat pricing</span>
          </div>
          <ul className="mt-6 space-y-3 flex-1 text-[14px] font-semibold text-muted">
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Everything in Pro Quant for every member</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Bulk seat provisioning &amp; invoice billing</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Custom assessment tracks per target role</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Academic discounts for student clubs</li>
          </ul>
          <div className="mt-7">
            <Link href="/contact?subject=Teams%20%26%20University%20Cohort" className="btn3d btn3d-ghost w-full justify-center">
              <Users className="h-4 w-4" /> Contact sales
            </Link>
          </div>
        </section>
      </div>

      {/* Feature comparison table */}
      <section className="mt-14 qf-card-flat overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-border bg-surface-2/60">
          <h2 className="text-lg font-black">Plan comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr className="border-b-2 border-border text-[12px] font-black uppercase tracking-wider text-faint">
                <th className="py-3.5 px-6">Capability</th>
                <th className="py-3.5 px-4">Starter</th>
                <th className="py-3.5 px-4 text-accent-deep dark:text-accent">Pro Quant</th>
                <th className="py-3.5 px-6">Teams</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-semibold text-muted">
              {[
                ['Authored lessons & knowledge checks', '84 (Phases 0–1)', `All ${lessonCount} (Phases 0–10)`, `All ${lessonCount} (Phases 0–10)`],
                ['Sandboxed C++ / Python problem runner', '10 starter problems', `All ${problemCount} problems`, `All ${problemCount} problems`],
                ['SM-2 spaced-repetition queue', 'Included', 'Included', 'Included'],
                ['Timed firm assessments', '1 sample check', `All ${assessmentCount} assessments`, `All ${assessmentCount} + custom`],
                ['Capstone engineering builds', 'Read briefs', `Full starter packs (${projectCount})`, `Full packs (${projectCount})`],
                ['Firm hiring matrix & roles guide', 'Included', 'Included', 'Included'],
              ].map(([label, a, b, c]) => (
                <tr key={label}>
                  <td className="py-3.5 px-6 font-bold text-foreground">{label}</td>
                  <td className="py-3.5 px-4">{a}</td>
                  <td className="py-3.5 px-4 font-bold text-foreground">{b}</td>
                  <td className="py-3.5 px-6">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Billing & platform guarantees */}
      <section className="mt-10 grid sm:grid-cols-2 gap-4">
        <div className="qf-card-flat p-5">
          <div className="flex items-center gap-2 font-black text-[15px]">
            <ShieldCheck className="h-4 w-4 text-accent" /> No hidden lock-in
          </div>
          <p className="mt-1.5 text-[14px] font-semibold text-muted leading-relaxed">
            Cancel anytime from billing settings or through support. Your Starter access and earned progress record remain intact.
          </p>
        </div>
        <div className="qf-card-flat p-5">
          <div className="flex items-center gap-2 font-black text-[15px]">
            <Users className="h-4 w-4 text-info" /> Verified student rates
          </div>
          <p className="mt-1.5 text-[14px] font-semibold text-muted leading-relaxed">
            Studying full-time with an accredited university email? Reach out on our <Link href="/contact" className="text-info-ink underline">contact page</Link> for academic cohort pricing.
          </p>
        </div>
      </section>
    </div>
  );
}
