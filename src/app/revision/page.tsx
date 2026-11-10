import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { RevisionClient } from '@/components/learn/revision-client';

export const metadata = { title: 'Revision · QuantFoundry' };

/**
 * v3 revision: thin auth shell. The deck, scheduling and grading all run
 * locally from the SM-2 store; reviews sync in the background.
 */
export default async function RevisionPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/revision');

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <RevisionClient />
    </AppShell>
  );
}
