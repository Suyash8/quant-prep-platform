import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  createSession,
  decodeResetTokenUserId,
  hashPasswordAsync,
  rateLimitShared,
  verifyPasswordResetToken,
} from '@/lib/auth';
import { clientIp } from '@/lib/client-ip';
import { assertSameOrigin } from '@/lib/origin';

const schema = z.object({
  token: z.string().min(10, 'Invalid or missing reset token.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const ip = clientIp(req);
  if (!(await rateLimitShared(`reset:${ip}`, 8, 0.1))) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a moment.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const uid = decodeResetTokenUserId(token);
  if (!uid) {
    return NextResponse.json({ error: 'This reset link is invalid or expired.' }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: uid } });
  if (!user || !verifyPasswordResetToken(token, user)) {
    return NextResponse.json({ error: 'This reset link has expired or already been used.' }, { status: 400 });
  }

  const newHash = await hashPasswordAsync(password);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);

  await createSession(user.id, req.headers.get('user-agent'));
  return NextResponse.json({
    ok: true,
    message: 'Password updated. Signing you in.',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      emailVerified: Boolean(user.emailVerifiedAt),
      onboardingDone: user.onboardingDone,
    },
  });
}
