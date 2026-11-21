import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimitShared } from '@/lib/auth';
import { db } from '@/lib/db';
import { awardXp, XP_TABLE } from '@/lib/gamification';
import { dayKey } from '@/lib/gamification-core';
import { assertSameOrigin } from '@/lib/origin';

const schema = z.object({
  mode: z.enum(['addition', 'multiplication', 'mixed', 'percentages', 'fractions', 'squares', 'division', 'subtraction']),
  level: z.number().int().min(1).max(10),
  correct: z.number().int().min(0).max(500),
  total: z.number().int().min(1).max(500),
  avgMs: z.number().min(0).max(600000),
  durationS: z.number().int().min(0).max(7200),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ history: [] }, { status: 401 });
  const history = await db.drillSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });
  return NextResponse.json({ history });
}

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!(await rateLimitShared(`drill:${user.id}`, 10, 0.2))) {
    return NextResponse.json({ error: 'Too many sessions logged, slow down.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid session.' }, { status: 400 });

  const d = parsed.data;
  if (d.correct > d.total) return NextResponse.json({ error: 'Invalid counts.' }, { status: 400 });

  // Server-side plausibility guard (A1): cannot answer large batches in zero or implausibly few seconds
  const minPlausibleSeconds = Math.floor(d.total * 0.25);
  if (d.total >= 5 && d.durationS < Math.max(1, minPlausibleSeconds)) {
    return NextResponse.json({ error: 'Drill session duration implausible.' }, { status: 400 });
  }

  const today = dayKey(new Date(), user.timezone || 'UTC');
  const sessionRow = await db.drillSession.create({
    data: { userId: user.id, mode: d.mode, level: d.level, correct: d.correct, total: d.total, avgMs: d.avgMs, durationS: d.durationS },
  });
  await db.learningSession.create({
    data: { userId: user.id, kind: 'drills', seconds: d.durationS, day: today },
  });

  let xpAwarded = 0;
  if (d.total >= 5) {
    const amount = Math.min(
      XP_TABLE.drillSession + d.correct * XP_TABLE.drillPerCorrect,
      XP_TABLE.drillSession + XP_TABLE.drillCap,
    );
    const award = await awardXp(
      user.id,
      amount,
      'drill',
      `${d.mode} L${d.level}: ${d.correct}/${d.total}`,
      undefined,
      sessionRow.id,
    ).catch(() => null);
    xpAwarded = award?.amount ?? 0;
  }

  return NextResponse.json({ ok: true, xpAwarded });
}
