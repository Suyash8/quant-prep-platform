import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getGamificationSummary } from '@/lib/gamification';
import { db } from '@/lib/db';
import { assertSameOrigin } from '@/lib/origin';
import { z } from 'zod';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const summary = await getGamificationSummary(user.id);
  return NextResponse.json(summary);
}

const goalSchema = z.object({
  dailyGoalXp: z.number().int().min(10).max(400).optional(),
  targetTrack: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  onboardingDone: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid preferences.' }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.dailyGoalXp !== undefined) data.dailyGoalXp = parsed.data.dailyGoalXp;
  if (parsed.data.targetTrack !== undefined) data.targetTrack = parsed.data.targetTrack;
  if (parsed.data.timezone !== undefined) data.timezone = parsed.data.timezone;
  if (parsed.data.onboardingDone !== undefined) data.onboardingDone = parsed.data.onboardingDone;

  if (Object.keys(data).length > 0) {
    await db.user.update({ where: { id: user.id }, data });
  }
  return NextResponse.json({
    ok: true,
    dailyGoalXp: parsed.data.dailyGoalXp ?? user.dailyGoalXp,
    onboardingDone: parsed.data.onboardingDone ?? user.onboardingDone,
    targetTrack: parsed.data.targetTrack ?? user.targetTrack,
  });
}
