import Link from 'next/link';
import { ScrollText } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service · QuantFoundry',
  description: 'Terms governing use of QuantFoundry curriculum, sandboxed code execution, and paid plans.',
};

const CLAUSES = [
  {
    title: '1. Eligibility & educational disclaimer',
    body: 'You must be at least 16 years old (or the minimum legal age in your country) to register. QuantFoundry provides educational preparation materials across mathematics, programming, systems, and quantitative finance. Nothing on this site constitutes financial, investment, tax, legal, or career advice, and no completion metric guarantees hiring or interviews.',
  },
  {
    title: '2. Career guide & employer non-affiliation',
    body: 'Firm hiring guides summarize publicly available interview expectations with source dates where available. QuantFoundry is not affiliated with, endorsed by, or partnered with Jane Street, Citadel, Optiver, Goldman Sachs, or any listed employer. All trademarks belong to their respective owners. Report inaccurate or trademark concerns via /contact.',
  },
  {
    title: '3. Acceptable use & ownership of submitted code',
    body: 'Submitted code executes in resource-limited sandboxes. Attempting sandbox escapes, network scanning, cryptocurrency mining, host probing, or denial-of-service loops is strictly forbidden and results in immediate termination. You retain all ownership rights to code you author; by submitting solutions for judging, you grant QuantFoundry a limited license solely to compile, execute, store test verdicts, and display your submissions back to you.',
  },
  {
    title: '4. Platform intellectual property',
    body: 'Lesson prose, quiz pools, problem write-ups, test suites, assessments, and interactive components are proprietary to QuantFoundry and licensed strictly for personal study (or explicitly agreed cohort seats). Automated scraping or commercial redistribution is prohibited.',
  },
  {
    title: '5. Subscriptions, cancellation & refunds',
    body: 'Paid plans renew automatically at your chosen monthly or annual interval until cancelled via the Stripe Billing Portal or Account Settings. Cancelling stops all future renewals while preserving Starter access. First-time Pro upgrades are eligible for a full refund within 7 days of initial charge upon request at /contact.',
  },
  {
    title: '6. Limitation of liability & changes',
    body: 'Services are provided "as-is" and "as-available". To the fullest extent permitted by law, QuantFoundry is not liable for indirect or consequential losses or local browser storage eviction. Legal terms changelog: v1.1 (Nov 2026) — added runner AUP, learner code license, non-affiliation notice, and 7-day refund policy.',
  },
];

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-10 sm:py-12">
      <header className="page-hero">
        <span className="icon-tile icon-tile-accent"><ScrollText className="h-7 w-7" /></span>
        <div>
          <h1>Terms of Service</h1>
          <p className="page-sub">Effective: November 2026 · Version 1.1</p>
        </div>
      </header>

      <div className="mt-6 space-y-5">
        {CLAUSES.map((clause) => (
          <section key={clause.title} className="qf-card-flat p-5 sm:p-6">
            <h2 className="text-lg font-black">{clause.title}</h2>
            <p className="mt-2 text-[15px] font-semibold text-muted leading-relaxed">{clause.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-[14px] font-semibold text-muted">
        See also our <Link href="/privacy" className="text-info-ink underline">Privacy Policy</Link> or contact us at <Link href="/contact" className="text-info-ink underline">Contact &amp; Support</Link>.
      </p>
    </div>
  );
}
