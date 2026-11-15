import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getCurriculumGraph, getRegistry } from '@/lib/content';
import { buildStudyPlan, type PlannerLessonNode } from '@/lib/planner-core';

const schema = z.object({
  hoursPerWeek: z.number().min(1).max(80),
  daysPerWeek: z.number().int().min(1).max(7),
  track: z.enum(['A', 'B', 'C', 'D', 'E', 'any']),
  mode: z.enum(['intensive', 'balanced', 'flexible']),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const latest = await db.studyPlan.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
  if (!latest) return NextResponse.json({ plan: null, config: null });
  try {
    return NextResponse.json({
      plan: JSON.parse(latest.tasks),
      config: JSON.parse(latest.config),
      updatedAt: latest.createdAt,
    });
  } catch {
    return NextResponse.json({ plan: null, config: null });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid plan configuration.' }, { status: 400 });
  const { hoursPerWeek, daysPerWeek, track, mode, targetDate } = parsed.data;

  const graph = getCurriculumGraph();
  const reg = getRegistry();
  const publishedIds = new Set(reg.lessons.map((l) => l.id));
  const orderedLessons = graph.order
    .filter((id) => publishedIds.has(id))
    .map((id) => graph.byId.get(id))
    .filter((n): n is NonNullable<typeof n> => !!n) as PlannerLessonNode[];

  const result = buildStudyPlan(orderedLessons, {
    hoursPerWeek,
    daysPerWeek,
    track,
    mode,
    targetDate: targetDate ?? null,
  });

  const plan = await db.studyPlan.create({
    data: {
      userId: user.id,
      config: JSON.stringify({ hoursPerWeek, daysPerWeek, track, mode, targetDate: targetDate ?? null }),
      tasks: JSON.stringify(result),
    },
  });
  return NextResponse.json({ ok: true, plan: JSON.parse(plan.tasks), id: plan.id });
}
