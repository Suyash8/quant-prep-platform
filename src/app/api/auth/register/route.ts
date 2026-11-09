import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, createSession, rateLimit } from '@/lib/auth';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  if (!rateLimit(`register:${ip}`, 5, 0.05)) {
    return NextResponse.json({ error: 'Too many attempts. Wait a minute and try again.' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { name, email, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists. Try signing in.' }, { status: 409 });
  }
  const count = await db.user.count();
  const user = await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      role: count === 0 ? 'admin' : 'learner',
    },
  });
  await createSession(user.id);
  return NextResponse.json({ ok: true, name: user.name, email: user.email, role: user.role });
}
