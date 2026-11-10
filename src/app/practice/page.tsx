import { getCurrentUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { PracticeClient } from '@/components/learn/practice-client';
import { PracticeLoginPrompt } from '@/components/learn/practice-login-prompt';

export const metadata = { title: 'Code Practice · QuantFoundry' };

/**
 * v3 practice list: thin auth shell. Problem data renders client-side from
 * the content pack with local solve state.
 */
export default async function PracticePage() {
  const user = await getCurrentUser();
  if (!user) return <PracticeLoginPrompt />;

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <PracticeClient />
    </AppShell>
  );
}
