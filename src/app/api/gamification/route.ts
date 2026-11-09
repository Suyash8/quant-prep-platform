import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getGamificationSummary } from '@/lib/gamification';
import { db } from '@/lib/db';
import { z } from 'zod';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const summary = await getGamificationSummary(user.id);
  return NextResponse.json(summary);
}

const goalSchema = z.object({ dailyGoalXp: z.number().int().min(10).max(400) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid goal.' }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data: { dailyGoalXp: parsed.data.dailyGoalXp } });
  return NextResponse.json({ ok: true, dailyGoalXp: parsed.data.dailyGoalXp });
}
