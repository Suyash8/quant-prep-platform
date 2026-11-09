import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimit } from '@/lib/auth';
import { db } from '@/lib/db';
import { awardXp, XP_TABLE } from '@/lib/gamification';

const schema = z.object({
  mode: z.string().min(1).max(30),
  level: z.number().int().min(1).max(10),
  correct: z.number().int().min(0).max(1000),
  total: z.number().int().min(1).max(1000),
  avgMs: z.number().min(0).max(600000),
  durationS: z.number().int().min(0).max(7200),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!rateLimit(`drill:${user.id}`, 10, 0.2)) {
    return NextResponse.json({ error: 'Too many sessions logged — slow down.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid session.' }, { status: 400 });

  const d = parsed.data;
  if (d.correct > d.total) return NextResponse.json({ error: 'Invalid counts.' }, { status: 400 });

  await db.drillSession.create({
    data: { userId: user.id, mode: d.mode, level: d.level, correct: d.correct, total: d.total, avgMs: d.avgMs, durationS: d.durationS },
  });
  await db.learningSession.create({
    data: { userId: user.id, kind: 'drills', seconds: d.durationS, day: new Date().toISOString().slice(0, 10) },
  });

  // Gamification: drills pay a session fee + a little per correct answer.
  let xpAwarded = 0;
  if (d.total >= 5) {
    const amount = Math.min(
      XP_TABLE.drillSession + d.correct * XP_TABLE.drillPerCorrect,
      XP_TABLE.drillSession + XP_TABLE.drillCap,
    );
    const award = await awardXp(user.id, amount, 'drill', `${d.mode} L${d.level}: ${d.correct}/${d.total}`).catch(() => null);
    xpAwarded = award?.amount ?? 0;
  }

  return NextResponse.json({ ok: true, xpAwarded });
}
