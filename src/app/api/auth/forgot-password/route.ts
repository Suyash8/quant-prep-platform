import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createPasswordResetToken, rateLimit } from '@/lib/auth';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`forgot:${ip}`, 5, 0.05)) {
    return NextResponse.json({ error: 'Too many requests. Wait a minute before trying again.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid email.' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({ where: { email } });

  let devResetPath: string | undefined;

  if (user) {
    const token = createPasswordResetToken(user);
    const resetPath = `/reset-password?token=${encodeURIComponent(token)}`;
    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const resetUrl = `${origin}${resetPath}`;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'QuantFoundry <onboarding@resend.dev>',
          to: [user.email],
          subject: 'Reset your QuantFoundry password',
          text: `Reset your QuantFoundry password (link expires in 30 minutes):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
        }),
      }).catch(err => console.error('[auth] forgot-password email failed:', err));
    } else if (process.env.NODE_ENV !== 'production') {
      console.info(`[auth] Local password reset link for ${user.email}: ${resetUrl}`);
      devResetPath = resetPath;
    }
  }

  return NextResponse.json({
    ok: true,
    message: 'If an account matches that email, a reset link has been sent.',
    ...(devResetPath ? { devResetPath } : {}),
  });
}
