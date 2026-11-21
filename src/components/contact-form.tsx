'use client';

import * as React from 'react';
import { CheckCircle2, Send } from 'lucide-react';

interface ContactFormProps {
  defaultName?: string;
  defaultEmail?: string;
  defaultSubject?: string;
}

export function ContactForm({ defaultName = '', defaultEmail = '', defaultSubject = 'General question' }: ContactFormProps) {
  const [name, setName] = React.useState(defaultName);
  const [email, setEmail] = React.useState(defaultEmail);
  React.useEffect(() => {
    if (defaultName && defaultEmail) return;
    try {
      const raw = window.localStorage.getItem('qf-chrome-user');
      if (raw) {
        const u = JSON.parse(raw) as { name?: string; email?: string };
        setName((prev) => prev || u.name || '');
        setEmail((prev) => prev || u.email || '');
      }
    } catch { /* ignore */ }
  }, [defaultName, defaultEmail]);
  const [subject, setSubject] = React.useState(defaultSubject);
  const [message, setMessage] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sentId, setSentId] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Could not submit your message. Check the fields and try again.');
        return;
      }
      setSentId(data.id ?? 'submitted');
      setMessage('');
    } catch {
      setError('Network error while submitting your message. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (sentId) {
    return (
      <div className="qf-card p-6 sm:p-8 text-center">
        <span className="mx-auto icon-tile icon-tile-accent"><CheckCircle2 className="h-6 w-6" /></span>
        <h2 className="mt-4 text-xl font-black">Message received</h2>
        <p className="mt-2 text-[15px] font-semibold text-muted max-w-md mx-auto">
          Thank you for writing in. Your request has been logged under reference <code className="font-mono text-foreground">{sentId}</code>.
        </p>
        <button
          type="button"
          onClick={() => setSentId(null)}
          className="btn3d btn3d-ghost btn3d-sm mt-5"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="qf-card p-6 sm:p-8 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-[13px] font-black uppercase tracking-wider text-muted mb-1.5">
            Your name
          </label>
          <input
            id="contact-name"
            required
            maxLength={120}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ada Lovelace"
            className="qf-input"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-[13px] font-black uppercase tracking-wider text-muted mb-1.5">
            Email address
          </label>
          <input
            id="contact-email"
            type="email"
            required
            maxLength={160}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ada@example.com"
            className="qf-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className="block text-[13px] font-black uppercase tracking-wider text-muted mb-1.5">
          Topic
        </label>
        <input
          id="contact-subject"
          required
          maxLength={160}
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Billing, Teams licensing, bug report, or curriculum question"
          className="qf-input"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-[13px] font-black uppercase tracking-wider text-muted mb-1.5">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          minLength={10}
          maxLength={4000}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Tell us how we can help..."
          className="qf-input min-h-[140px] resize-y"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border-2 border-danger bg-danger-soft/60 px-3.5 py-2.5 text-[14px] font-bold text-danger">
          {error}
        </p>
      )}

      <div className="sr-only" aria-hidden="true">
        <label htmlFor="contact-website">Leave empty</label>
        <input id="contact-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <div className="pt-1 flex justify-end">
        <button type="submit" disabled={busy} className="btn3d">
          <Send className="h-4 w-4" />
          {busy ? 'Sending...' : 'Send message'}
        </button>
      </div>
    </form>
  );
}
