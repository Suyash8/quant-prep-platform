import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  getCurrentUser,
  createEmailVerifyToken,
  verifyEmailVerifyToken,
  rateLimitShared,
} from '@/lib/auth';
import { clientIp } from '@/lib/client-ip';
import { sendEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const data = verifyEmailVerifyToken(token);
  if (!data) {
    return NextResponse.json({ error: 'Verification link is invalid or expired.' }, { status: 400 });
  }
  const user = await db.user.findUnique({ where: { id: data.uid } });
  if (!user || user.email !== data.email) {
    return NextResponse.json({ error: 'Account does not match verification token.' }, { status: 400 });
  }
  if (!user.emailVerifiedAt) {
    await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
  }
  return NextResponse.json({ ok: true, email: user.email, verified: true });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  if (body?.token) {
    const parsed = z.object({ token: z.string().min(10) }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid verification token.' }, { status: 400 });
    }
    const data = verifyEmailVerifyToken(parsed.data.token);
    if (!data) {
      return NextResponse.json({ error: 'Verification link is invalid or expired.' }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { id: data.uid } });
    if (!user || user.email !== data.email) {
      return NextResponse.json({ error: 'Account does not match verification token.' }, { status: 400 });
    }
    if (!user.emailVerifiedAt) {
      await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    }
    return NextResponse.json({ ok: true, verified: true });
  }

  // Resend verification link for signed-in user
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (user.emailVerifiedAt) return NextResponse.json({ ok: true, verified: true });

  const ip = clientIp(req);
  if (!(await rateLimitShared(`verify-resend:${user.id}:${ip}`, 3, 0.02))) {
    return NextResponse.json({ error: 'Please wait before requesting another verification email.' }, { status: 429 });
  }

  const token = createEmailVerifyToken({ id: user.id, email: user.email });
  const verifyPath = `/verify-email?token=${encodeURIComponent(token)}`;
  const origin = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '');
  await db.user.update({ where: { id: user.id }, data: { emailVerifySentAt: new Date() } });
  await sendEmail({
    to: user.email,
    subject: 'Verify your QuantFoundry email',
    text: `Verify your QuantFoundry email address (expires in 24 hours):\n${origin}${verifyPath}`,
  });

  return NextResponse.json({
    ok: true,
    message: 'Verification link sent.',
    ...(process.env.NODE_ENV !== 'production' ? { devVerifyPath: verifyPath } : {}),
  });
}
