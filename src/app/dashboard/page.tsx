import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { DashboardClient } from '@/components/learn/dashboard-client';

export const metadata = { title: 'Home · QuantFoundry' };

/**
 * v3 dashboard: thin auth shell. Everything renders client-side from the
 * local progress store and content packs, so it opens instantly and works
 * offline. Progress syncs in the background.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <DashboardClient name={user.name} />
    </AppShell>
  );
}
