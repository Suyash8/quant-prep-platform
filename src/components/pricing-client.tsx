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
  }, [initialUser]);

  const [interval, setIntervalState] = React.useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = React.useState(false);
  const [portalLoading, setPortalLoading] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(
    initialStatus === 'success'
      ? 'Payment received. Confirming your Pro subscription…'
      : initialStatus === 'cancelled'
        ? 'Checkout was cancelled. You can upgrade anytime.'
        : null,
  );

  // Poll /api/auth/me up to 30s after returning from Stripe checkout (C2)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkout = new URLSearchParams(window.location.search).get('checkout') ?? initialStatus;
    if (checkout === 'cancelled') {
      setNotice('Checkout was cancelled. You can upgrade anytime.');
      return;
    }
    if (checkout !== 'success') return;
    setNotice('Payment confirmed. Confirming your Pro subscription…');
    let alive = true;
    let tries = 0;
    const timer = window.setInterval(async () => {
      tries++;
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
        if (res.ok) {
          const d = (await res.json()) as { user?: { name: string; email: string; plan?: string } };
          if (d?.user && alive) {
            setUser(d.user);
            if (d.user.plan === 'pro' || d.user.plan === 'team') {
              setNotice('Your Pro subscription is now active.');
              window.clearInterval(timer);
              return;
            }
          }
        }
      } catch { /* retry */ }
      if (tries >= 15 && alive) {
        window.clearInterval(timer);
        setNotice('Activation is taking slightly longer than usual — we will email your receipt once finalized.');
      }
    }, 2000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [initialStatus]);

  const proMonthlyPrice = interval === 'annual' ? '21.58' : '29';
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

  async function handleBillingPortal() {
    setPortalLoading(true);
    setNotice(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setNotice(data.error ?? 'Billing portal unavailable right now. Use Contact & Support for subscription help.');
        return;
      }
      window.location.href = data.url;
    } finally {
      setPortalLoading(false);
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
          Master mathematics, C++, Python, systems engineering, and quantitative finance on your schedule. No auto-charging trials, cancel anytime.
        </p>

        {/* Billing cadence switch */}
        <div className="mt-6 inline-flex items-center gap-1 rounded-2xl border-2 border-border bg-surface p-1.5">
          <button
            type="button"
            onClick={() => setIntervalState('monthly')}
            className={cn(
              'press rounded-xl px-4 py-2 text-[14px] font-extrabold transition-colors',
              interval === 'monthly' ? 'bg-accent text-on-accent' : 'text-muted hover:text-foreground',
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setIntervalState('annual')}
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
              Save 25.6%
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
              Diagnostic placement plus full Phase 0 &amp; Phase 1 access to build core fluency.
            </p>
          </div>
          <div className="mt-6 flex items-baseline gap-1.5">
            <span className="text-4xl font-black tnum">$0</span>
            <span className="text-[14px] font-bold text-muted">/ forever</span>
          </div>
          <ul className="mt-6 space-y-3 flex-1 text-[14px] font-semibold text-muted">
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Cross-domain diagnostic placement</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Phases 0–1 foundations (84 authored lessons)</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> 10 foundational C++/Python coding problems</li>
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
            Full curriculum access, timed assessments, and sandboxed C++/Python judging.
          </p>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl font-black tnum">${proMonthlyPrice}</span>
            <span className="text-[14px] font-bold text-muted">/ month</span>
            {interval === 'annual' && (
              <span className="ml-auto text-[12px] font-black text-accent-deep dark:text-accent tnum">Billed $259/yr (vs $348/yr)</span>
            )}
          </div>
          <ul className="mt-6 space-y-3 flex-1 text-[14px] font-semibold text-muted">
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> All 11 phases &amp; {lessonCount} authored lessons</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> All {problemCount} judged C++17/20 &amp; Python 3 problems</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> {assessmentCount} timed interview &amp; screening assessments</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> {projectCount} quantitative engineering capstone builds</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> All interactive browser labs &amp; mental-math drills</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Email support inbox (response within 2 business days)</li>
          </ul>
          <div className="mt-7 space-y-2">
            {currentPlan === 'pro' || currentPlan === 'team' ? (
              <>
                <Link href="/dashboard" className="btn3d w-full justify-center">
                  <Check className="h-4 w-4" /> Active on {currentPlan === 'team' ? 'Team' : 'Pro'}
                </Link>
                {stripeEnabled && (
                  <button
                    type="button"
                    onClick={handleBillingPortal}
                    disabled={portalLoading}
                    className="btn3d btn3d-ghost btn3d-sm w-full justify-center"
                  >
                    {portalLoading ? 'Opening billing portal…' : 'Manage subscription & invoices'}
                  </button>
                )}
              </>
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
            <h2 className="mt-1 text-2xl font-black">Cohort Access</h2>
            <p className="mt-1.5 text-[14px] font-semibold text-muted">
              Custom group access for student quant societies and university seminars (by arrangement).
            </p>
          </div>
          <div className="mt-6 flex items-baseline gap-1.5">
            <span className="text-4xl font-black">Custom</span>
            <span className="text-[14px] font-bold text-muted">/ group arrangement</span>
          </div>
          <ul className="mt-6 space-y-3 flex-1 text-[14px] font-semibold text-muted">
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Everything in Pro Quant for enrolled members</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Manual roster onboarding via support</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Recommended study tracks by discipline</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Verified student &amp; club discounts</li>
          </ul>
          <div className="mt-7">
            <Link href="/contact?subject=Teams%20%26%20University%20Cohort" className="btn3d btn3d-ghost w-full justify-center">
              <Users className="h-4 w-4" /> Inquire about cohort access
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
                <th className="py-3.5 px-6">Cohorts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-semibold text-muted">
              {[
                ['Authored lessons & knowledge checks', '84 (Phases 0–1)', `All ${lessonCount} (Phases 0–10)`, `All ${lessonCount} (Phases 0–10)`],
                ['Sandboxed C++ / Python problem runner', '10 starter problems', `All ${problemCount} problems`, `All ${problemCount} problems`],
                ['SM-2 spaced-repetition queue', 'Included', 'Included', 'Included'],
                ['Timed firm assessments', '1 diagnostic check', `All ${assessmentCount} assessments`, `All ${assessmentCount} assessments`],
                ['Capstone engineering builds', 'Read briefs', `Save milestones & notes (${projectCount})`, `Save milestones & notes (${projectCount})`],
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
            <ShieldCheck className="h-4 w-4 text-accent" /> Clear cancellation &amp; refund policy
          </div>
          <p className="mt-1.5 text-[14px] font-semibold text-muted leading-relaxed">
            Cancel anytime via the Stripe billing portal or Settings before your renewal date. See full terms and 7-day initial refund eligibility on our <Link href="/terms" className="text-info-ink underline">Terms of Service</Link>.
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
