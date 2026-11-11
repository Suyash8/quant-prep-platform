import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { PublicHeader } from '@/components/app-shell';
import { AuthForm } from '@/components/auth-form';
import { getRegistry, listProblems } from '@/lib/content';

export const metadata = { title: 'Sign in. QuantFoundry' };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <AuthForm mode="login" stats={{ lessons: getRegistry().lessons.length, labs: 33, problems: listProblems().length }} />
    </div>
  );
}
