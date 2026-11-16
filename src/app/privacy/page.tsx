import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy · QuantFoundry',
  description: 'How QuantFoundry collects, stores, retains, and protects account, progress, and submission data.',
};

const SECTIONS = [
  {
    title: '1. Data controller & contact',
    body: 'QuantFoundry is operated by the QuantFoundry Maintainers (contact via our support portal at /contact or the published operator email configured in deployment). If you submit a support request, your name, email, subject, and message are logged to resolve your ticket.',
  },
  {
    title: '2. Data we collect & lawful basis',
    body: 'On registration, we collect your name, email address, timezone, and a salted asynchronous scrypt password hash (contractual performance to operate your account). As you study, we store lesson attempts, graded assessment answers, spaced-repetition intervals, code submissions, drill metrics, study plans, and optional career tracker rows.',
  },
  {
    title: '3. Sessions, cookies, localStorage, IndexedDB & Service Worker',
    body: 'QuantFoundry uses a single signed HttpOnly cookie (qf_session) to maintain authentication. To enable fast navigation and unreliable-connection continuity, the application also stores an owner-scoped local progress cache, pending sync events, code drafts, and cached curriculum packs inside browser localStorage, IndexedDB, and the Service Worker Cache API. Signing out or deleting your account clears these local stores from your device. We do not embed third-party ad networks or behavioral tracking pixels.',
  },
  {
    title: '4. Service providers (subprocessors)',
    body: 'Infrastructure subprocessors include our managed PostgreSQL database provider (account & progress persistence), isolated code-runner VMs (executing submitted C++/Python programs), Resend (transactional verification, password-reset, and support email delivery when configured), and Stripe (subscription billing when configured; card numbers never touch QuantFoundry servers).',
  },
  {
    title: '5. Retention schedule',
    body: 'Expired session tokens are purged daily. Processed offline sync deduplication markers are pruned after 30 days. Account, progress, and submission history are retained until you delete your account or request erasure.',
  },
  {
    title: '6. Age & international rights (GDPR & India DPDP Act)',
    body: 'QuantFoundry is intended for users aged 16 and older (or minimum digital consent age in your jurisdiction). Under GDPR, the UK Data Protection Act, and India’s Digital Personal Data Protection (DPDP) Act, you may access, export a machine-readable JSON copy of all your records directly in Account Settings, correct profile fields, withdraw consent, or permanently erase your account (including cancelling any active Stripe subscription) via Settings or /contact.',
  },
  {
    title: '7. Legal policy changelog',
    body: 'v1.1 (Nov 2026): Added full browser local storage / Service Worker disclosures, subprocessor list, retention windows, self-service JSON data export coverage, and DPDP/GDPR rights details.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-10 sm:py-12">
      <header className="page-hero">
        <span className="icon-tile icon-tile-info"><ShieldCheck className="h-7 w-7" /></span>
        <div>
          <h1>Privacy Policy</h1>
          <p className="page-sub">Effective: November 2026 · Policy version 1.1</p>
        </div>
      </header>

      <p className="text-[15px] font-semibold text-muted leading-relaxed">
        QuantFoundry collects only the account and learning data required to verify your answers, schedule spaced repetition, and run sandboxed code submissions.
      </p>

      <div className="mt-8 space-y-5">
        {SECTIONS.map((section) => (
          <section key={section.title} className="qf-card-flat p-5 sm:p-6">
            <h2 className="text-lg font-black">{section.title}</h2>
            <p className="mt-2 text-[15px] font-semibold text-muted leading-relaxed">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-[14px] font-semibold text-muted">
        Need a manual privacy request or correction? Reach us via <Link href="/contact" className="text-info-ink underline">Contact &amp; Support</Link>, or manage export and deletion directly in <Link href="/settings" className="text-info-ink underline">Account Settings</Link>.
      </p>
    </div>
  );
}
