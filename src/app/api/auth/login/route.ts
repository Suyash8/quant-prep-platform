import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyPasswordAsync, createSession, rateLimitShared } from '@/lib/auth';
import { clientIp } from '@/lib/client-ip';
import { assertSameOrigin } from '@/lib/origin';

const schema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const ip = clientIp(req);
  if (!(await rateLimitShared(`login:ip:${ip}`, 12, 0.15))) {
    return NextResponse.json({ error: 'Too many attempts. Wait a minute and try again.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  if (!(await rateLimitShared(`login:email:${email}`, 8, 0.05))) {
    return NextResponse.json({ error: 'Too many sign-in attempts for this account. Wait a few minutes and try again.' }, { status: 429 });
  }

  const user = await db.user.findUnique({ where: { email } });
  const passwordValid = await verifyPasswordAsync(parsed.data.password, user?.passwordHash);
  if (!user || !passwordValid) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  await createSession(user.id, req.headers.get('user-agent'));
  return NextResponse.json({
    ok: true,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    emailVerified: Boolean(user.emailVerifiedAt),
  });
}
