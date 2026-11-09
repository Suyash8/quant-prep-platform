import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyPassword, createSession, rateLimit } from '@/lib/auth';

const schema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  if (!rateLimit(`login:${ip}`, 8, 0.1)) {
    return NextResponse.json({ error: 'Too many attempts. Wait a minute and try again.' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true, name: user.name, role: user.role });
}
