import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { SettingsForm } from '@/components/settings-form';
import { SlidersHorizontal } from 'lucide-react';

export const metadata = { title: 'Settings — QuantFoundry' };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/settings');

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
        <header className="page-hero">
          <span className="icon-tile icon-tile-accent"><SlidersHorizontal className="h-7 w-7" /></span>
          <div>
            <h1>Profile &amp; settings</h1>
            <p className="page-sub">Tune your daily goal, identity and how the app looks. Everything else — progress, streaks, notes — follows you automatically.</p>
          </div>
        </header>
        <SettingsForm user={{ name: user.name, email: user.email, role: user.role, memberSince: user.createdAt }} />
      </div>
    </AppShell>
  );
}
