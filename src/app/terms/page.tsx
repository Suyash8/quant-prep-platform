import Link from 'next/link';
import { ScrollText } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service · QuantFoundry',
  description: 'Terms governing use of QuantFoundry lessons, sandboxed code execution, and paid plans.',
};

const CLAUSES = [
  {
    title: '1. Educational scope & no hiring guarantee',
    body: 'QuantFoundry provides structured quantitative engineering, mathematics, computer science, and finance preparation materials. Completing the curriculum improves skill readiness but does not guarantee interviews, offers, or employment with any firm.',
  },
  {
    title: '2. Acceptable use of the code runner',
    body: 'Programming submissions execute inside resource-constrained sandboxes. Attempting to escape isolation, probe host infrastructure, mine cryptocurrency, or deliberately exhaust CPU/memory resources is prohibited and may result in account suspension.',
  },
  {
    title: '3. Accounts & intellectual property',
    body: 'Accounts are for individual learners unless licensed under a Teams & Cohort agreement. Curriculum lessons, quizzes, interactive labs, and test suites may not be scraped, republished, or resold commercially without written permission.',
  },
  {
    title: '4. Subscriptions & cancellation',
    body: 'Pro subscriptions renew on your selected monthly or annual cadence until cancelled. Cancelling stops future renewals while preserving your free Starter account and historical progress records.',
  },
  {
    title: '5. Warranty disclaimer & limitation of liability',
    body: 'Materials are provided on an "as-is" and "as-available" basis for educational purposes and do not constitute investment, trading, tax, or legal advice.',
  },
];

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-10 sm:py-12">
      <header className="page-hero">
        <span className="icon-tile icon-tile-accent"><ScrollText className="h-7 w-7" /></span>
        <div>
          <h1>Terms of Service</h1>
          <p className="page-sub">Last updated: November 2026</p>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        {CLAUSES.map(clause => (
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
