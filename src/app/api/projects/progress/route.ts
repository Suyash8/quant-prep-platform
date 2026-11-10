import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

const schema = z.object({
  projectSlug: z.string().min(1),
  milestonesDone: z.number().int().min(0).max(50).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  notes: z.string().max(10000).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid.' }, { status: 400 });
  const { projectSlug, milestonesDone, status, notes } = parsed.data;

  const existing = await db.projectProgress.findUnique({
    where: { userId_projectSlug: { userId: user.id, projectSlug } },
  });

  const data: Record<string, unknown> = {};
  if (milestonesDone !== undefined) data.milestonesDone = milestonesDone;
  if (status !== undefined) data.status = status;
  if (notes !== undefined) data.notes = notes;
  if (status === 'completed') data.milestonesDone = 999; // markers completed



  const progress = await db.projectProgress.upsert({
    where: { userId_projectSlug: { userId: user.id, projectSlug } },
    create: {
      userId: user.id, projectSlug,
      status: (status as string) ?? 'in_progress',
      milestonesDone: milestonesDone ?? 0,
      notes: notes ?? '',
    },
    update: data,
  });
  return NextResponse.json({ ok: true, progress });
}
