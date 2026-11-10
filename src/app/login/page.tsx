import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { PublicHeader } from '@/components/app-shell';
import { AuthForm } from '@/components/auth-form';

export const metadata = { title: 'Sign in. QuantFoundry' };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <AuthForm mode="login" />
    </div>
  );
}
