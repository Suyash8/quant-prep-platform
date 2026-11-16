import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  hashPasswordAsync,
  createSession,
  createEmailVerifyToken,
  rateLimitShared,
} from '@/lib/auth';
import { clientIp } from '@/lib/client-ip';
import { assertSameOrigin } from '@/lib/origin';
import { sendEmail } from '@/lib/email';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(200),
  timezone: z.string().trim().max(80).optional(),
  acceptedTerms: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const ip = clientIp(req);
  if (!(await rateLimitShared(`register:${ip}`, 5, 0.05))) {
    return NextResponse.json({ error: 'Too many attempts. Wait a minute and try again.' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { name, email, password, timezone } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const safeTz = timezone && timezone.length > 0 ? timezone : 'UTC';

  // Always compute the password hash so existing vs new emails take equal time (B5).
  const passwordHash = await hashPasswordAsync(password);
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    const origin = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '');
    await sendEmail({
      to: normalizedEmail,
      subject: 'Sign-in reminder for QuantFoundry',
      text: `Someone attempted to register with this email address. You already have a QuantFoundry account.\n\nSign in: ${origin}/login\nReset password: ${origin}/forgot-password`,
    }).catch(() => {});
    return NextResponse.json(
      {
        ok: true,
        pendingVerification: true,
        message: 'Check your email to verify or sign in to your account.',
      },
      { status: 202 },
    );
  }

  // Never auto-promote the first registered user to admin (B1).
  const initialAdmin = (process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
  const role = initialAdmin && normalizedEmail === initialAdmin ? 'admin' : 'learner';

  const user = await db.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role,
      timezone: safeTz,
      emailVerifySentAt: new Date(),
    },
  });

  await createSession(user.id, req.headers.get('user-agent'));

  const token = createEmailVerifyToken({ id: user.id, email: user.email });
  const verifyPath = `/verify-email?token=${encodeURIComponent(token)}`;
  const origin = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '');
  const verifyUrl = `${origin}${verifyPath}`;

  await sendEmail({
    to: user.email,
    subject: 'Verify your QuantFoundry email',
    text: `Welcome to QuantFoundry, ${user.name}!\n\nVerify your email address (expires in 24 hours):\n${verifyUrl}\n\nNext steps: take the 28-question diagnostic or start Phase 0 on your dashboard.`,
  }).catch(() => {});

  return NextResponse.json(
    {
      ok: true,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      emailVerified: false,
      ...(process.env.NODE_ENV !== 'production' ? { devVerifyPath: verifyPath } : {}),
    },
    { status: 201 },
  );
}
