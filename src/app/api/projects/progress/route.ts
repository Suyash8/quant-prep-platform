import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { can } from '@/lib/entitlements';
import { getProject } from '@/lib/content';
import { assertSameOrigin } from '@/lib/origin';

const schema = z.object({
  projectSlug: z.string().min(1).max(120),
  milestonesDone: z.number().int().min(0).max(50).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  notes: z.string().max(10000).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ progress: [] }, { status: 401 });
  const progress = await db.projectProgress.findMany({ where: { userId: user.id } });
  return NextResponse.json({ progress });
}

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!can(user, 'project_write')) {
    return NextResponse.json(
      { error: 'Upgrade to Pro to save capstone project milestones and notes.' },
      { status: 403 },
    );
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid.' }, { status: 400 });
  const { projectSlug, milestonesDone, status, notes } = parsed.data;

  const project = getProject(projectSlug);
  if (!project) return NextResponse.json({ error: 'Unknown project.' }, { status: 404 });

  const totalMilestones = project.milestones.length;
  const data: Record<string, unknown> = {};
  if (milestonesDone !== undefined) data.milestonesDone = Math.min(milestonesDone, totalMilestones);
  if (status !== undefined) data.status = status;
  if (notes !== undefined) data.notes = notes;
  if (status === 'completed') data.milestonesDone = totalMilestones;

  const progress = await db.projectProgress.upsert({
    where: { userId_projectSlug: { userId: user.id, projectSlug } },
    create: {
      userId: user.id,
      projectSlug,
      status: status ?? 'in_progress',
      milestonesDone: status === 'completed' ? totalMilestones : Math.min(milestonesDone ?? 0, totalMilestones),
      notes: notes ?? '',
    },
    update: data,
  });
  return NextResponse.json({ ok: true, progress });
}
