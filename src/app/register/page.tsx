import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { PublicHeader } from '@/components/app-shell';
import { AuthForm } from '@/components/auth-form';
import { CloudOff } from 'lucide-react';

export const metadata = { title: 'Create your account. QuantFoundry' };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <AuthForm mode="register" />
      <footer className="mt-auto border-t-2 border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-faint">
          <span className="flex items-center gap-1.5"><CloudOff className="h-3.5 w-3.5" aria-hidden="true" /> No card needed, works offline.</span>
          <span className="flex items-center gap-3">
            <Link href="/about" className="hover:text-muted">About</Link>
            <Link href="/methodology" className="hover:text-muted">Methodology</Link>
            <Link href="/curriculum" className="hover:text-muted">Curriculum</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
