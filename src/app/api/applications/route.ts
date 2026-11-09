import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

const upsertSchema = z.object({
  company: z.string().min(1).max(80),
  role: z.string().min(1).max(120),
  status: z.string().min(1).max(20),
  note: z.string().max(2000).optional(),
});
const patchSchema = z.object({
  id: z.string().min(1),
  status: z.string().max(20).optional(),
  note: z.string().max(2000).optional(),
  delete: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const raw = await req.json().catch(() => null);

  if (raw && typeof raw === 'object' && 'id' in raw) {
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid.' }, { status: 400 });
    const { id, delete: del, ...patch } = parsed.data;
    if (del) {
      await db.application.deleteMany({ where: { id, userId: user.id } });
      return NextResponse.json({ ok: true });
    }
    const existing = await db.application.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    await db.application.update({ where: { id }, data: patch });
    return NextResponse.json({ ok: true });
  }

  const parsed = upsertSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Company and role are required.' }, { status: 400 });
  const application = await db.application.create({
    data: { userId: user.id, company: parsed.data.company, role: parsed.data.role, status: parsed.data.status, note: parsed.data.note ?? '' },
  });
  return NextResponse.json({ ok: true, application });
}
