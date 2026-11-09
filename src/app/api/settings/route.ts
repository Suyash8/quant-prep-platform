import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

const schema = z.object({ name: z.string().trim().min(2).max(80) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Name must be 2-80 characters.' }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  return NextResponse.json({ ok: true });
}
