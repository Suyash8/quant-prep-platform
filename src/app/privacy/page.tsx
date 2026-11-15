import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy · QuantFoundry',
  description: 'How QuantFoundry collects, stores, and protects account, progress, and submission data.',
};

const SECTIONS = [
  {
    title: '1. Data we collect',
    body: 'When you register, we store your name, email address, and salted scrypt password hash. As you study, we record lesson completion states, quiz scores, spaced-repetition intervals, drill timings, code submissions, and study plans directly under your account.',
  },
  {
    title: '2. How we use your data',
    body: 'Account and learning records are used exclusively to authenticate your session, schedule SM-2 review queues, compute honest skill analytics, enforce prerequisite order, and maintain subscription billing status.',
  },
  {
    title: '3. Sessions, cookies, and storage',
    body: 'QuantFoundry uses a single signed HttpOnly session cookie (qf_session) to keep you signed in securely. We do not embed third-party ad networks, social tracking pixels, or behavioral resale scripts.',
  },
  {
    title: '4. Billing & contact submissions',
    body: 'Paid checkouts are processed via Stripe when enabled; payment card numbers never touch QuantFoundry servers. Messages submitted on our Contact page are persisted in our database to resolve support or team inquiries.',
  },
  {
    title: '5. Data export & account deletion',
    body: 'You can inspect your progress at any time in Analytics and request permanent deletion of your account and associated records through our Contact page.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-10 sm:py-12">
      <header className="page-hero">
        <span className="icon-tile icon-tile-info"><ShieldCheck className="h-7 w-7" /></span>
        <div>
          <h1>Privacy Policy</h1>
          <p className="page-sub">Last updated: November 2026</p>
        </div>
      </header>

      <p className="text-[15px] font-semibold text-muted leading-relaxed">
        QuantFoundry collects the minimum account and learning telemetry required to grade quizzes, schedule spaced repetition, and run your sandboxed code submissions.
      </p>

      <div className="mt-8 space-y-6">
        {SECTIONS.map(section => (
          <section key={section.title} className="qf-card-flat p-5 sm:p-6">
            <h2 className="text-lg font-black">{section.title}</h2>
            <p className="mt-2 text-[15px] font-semibold text-muted leading-relaxed">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-[14px] font-semibold text-muted">
        Questions about your data? Reach us via the <Link href="/contact" className="text-info-ink underline">Contact &amp; Support</Link> page.
      </p>
    </div>
  );
}
