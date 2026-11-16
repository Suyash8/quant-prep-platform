import Link from 'next/link';
import { db } from '@/lib/db';
import { verifyEmailVerifyToken } from '@/lib/auth';
import { CheckCircle2, MailWarning } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Verify email · QuantFoundry' };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const decoded = token ? verifyEmailVerifyToken(token) : null;
  let verifiedEmail: string | null = null;

  if (decoded) {
    const user = await db.user.findUnique({ where: { id: decoded.uid } });
    if (user && user.email === decoded.email) {
      if (!user.emailVerifiedAt) {
        await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      }
      verifiedEmail = user.email;
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="qf-card p-8 text-center">
        {verifiedEmail ? (
          <>
            <span className="mx-auto h-14 w-14 rounded-2xl bg-accent-soft text-accent-deep flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight">Email verified</h1>
            <p className="mt-2 text-[15px] font-semibold text-muted">
              <strong className="text-foreground">{verifiedEmail}</strong> is confirmed. You now have full account recovery and billing access.
            </p>
            <Link href="/dashboard" className="btn3d mt-6 inline-flex">Continue to dashboard</Link>
          </>
        ) : (
          <>
            <span className="mx-auto h-14 w-14 rounded-2xl bg-warning-soft text-warning-strong flex items-center justify-center">
              <MailWarning className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight">Verification link expired or invalid</h1>
            <p className="mt-2 text-[15px] font-semibold text-muted">
              Open Account Settings to request a fresh verification email.
            </p>
            <Link href="/settings" className="btn3d mt-6 inline-flex">Go to settings</Link>
          </>
        )}
      </div>
    </div>
  );
}
