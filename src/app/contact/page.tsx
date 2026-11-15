import { getCurrentUser } from '@/lib/auth';
import { AppShell, PublicHeader, PublicFooter } from '@/components/app-shell';
import { ContactForm } from '@/components/contact-form';
import { Mail, MessageSquare, Users } from 'lucide-react';

export const metadata = {
  title: 'Contact & Support · QuantFoundry',
  description: 'Reach QuantFoundry for support, Pro access requests, university cohorts, or bug reports.',
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams;
  const user = await getCurrentUser();

  const body = (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-10 sm:py-12">
      <header className="page-hero">
        <span className="icon-tile icon-tile-info"><Mail className="h-7 w-7" /></span>
        <div>
          <h1>Contact &amp; Support</h1>
          <p className="page-sub">Questions about Pro access, university cohorts, curriculum feedback, or account requests.</p>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.4fr] items-start">
        <div className="space-y-4">
          <div className="qf-card-flat p-5">
            <div className="flex items-center gap-2 font-black text-[15px]">
              <MessageSquare className="h-4 w-4 text-accent" /> Direct support
            </div>
            <p className="mt-1.5 text-[14px] font-semibold text-muted leading-relaxed">
              Every inquiry submitted here is recorded directly with your reference ID so nothing gets lost between inbox filters.
            </p>
          </div>
          <div className="qf-card-flat p-5">
            <div className="flex items-center gap-2 font-black text-[15px]">
              <Users className="h-4 w-4 text-info" /> Teams &amp; Academic Cohorts
            </div>
            <p className="mt-1.5 text-[14px] font-semibold text-muted leading-relaxed">
              Setting up seats for a quant society or graduate training cohort? Include your approximate seat count and timeline.
            </p>
          </div>
        </div>

        <ContactForm
          defaultName={user?.name ?? ''}
          defaultEmail={user?.email ?? ''}
          defaultSubject={subject || 'General inquiry'}
        />
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader user={null} />
        <main className="flex-1">{body}</main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      {body}
    </AppShell>
  );
}
