import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimitShared } from '@/lib/auth';
import { db } from '@/lib/db';
import { getAssessment, getLesson, getMap, type QuizQuestion } from '@/lib/content';
import { gradeAnswer, sanitizedForClient } from '@/lib/grading';
import { can } from '@/lib/entitlements';
import { assertSameOrigin } from '@/lib/origin';

const applySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('diagnostic'),
    moduleIds: z.array(z.string().min(1).max(120)).min(1).max(50),
  }),
  z.object({
    mode: z.literal('test-out'),
    moduleId: z.string().min(1).max(120),
    answers: z.record(z.string(), z.unknown()),
  }),
  z.object({
    mode: z.literal('revoke'),
    lessonId: z.string().min(1).max(120),
  }),
]);

function moduleTestOutQuestions(moduleId: string) {
  const map = getMap();
  const mod = map.phases.flatMap((p) => p.modules).find((m) => m.id === moduleId);
  if (!mod) return null;
  const phase = map.phases.find((p) => p.modules.includes(mod))!;
  const pool: (QuizQuestion & { sourceLessonId: string })[] = [];
  for (const l of mod.lessons) {
    const lesson = getLesson(mod.id, l.id);
    if (!lesson) continue;
    for (const q of lesson.quiz) {
      pool.push({ ...q, id: `${l.id}::${q.id}`, sourceLessonId: l.id });
    }
  }
  return { mod, phase, pool: pool.slice(0, 10) };
}

/** GET ?moduleId=<id> returns up to 10 sanitized questions for module test-out (H5, I1). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const moduleId = req.nextUrl.searchParams.get('moduleId') ?? '';
  if (!moduleId) return NextResponse.json({ error: 'Missing moduleId.' }, { status: 400 });

  const info = moduleTestOutQuestions(moduleId);
  if (!info) return NextResponse.json({ error: 'Unknown module.' }, { status: 404 });
  if (!can(user, 'lesson', { phaseId: info.phase.id })) {
    return NextResponse.json({ error: 'Upgrade to Pro to unlock this phase.' }, { status: 403 });
  }

  return NextResponse.json({
    moduleId: info.mod.id,
    moduleTitle: info.mod.title,
    passThreshold: 85,
    questions: info.pool.map((q) => sanitizedForClient(q)),
  });
}

/** POST applies diagnostic placement, grades a module test-out (>=85%), or revokes placement on one lesson. */
export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!(await rateLimitShared(`placement:${user.id}`, 10, 0.2))) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }

  const parsed = applySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid placement payload.' }, { status: 400 });

  const body = parsed.data;
  const map = getMap();

  if (body.mode === 'revoke') {
    await db.lessonProgress.deleteMany({
      where: { userId: user.id, lessonId: body.lessonId, status: 'placed_out' },
    });
    return NextResponse.json({ ok: true, revoked: body.lessonId });
  }

  if (body.mode === 'diagnostic') {
    // Verify the user actually scored >=80% on sections covering these modules in their latest diagnostic attempt
    const latestDiag = await db.assessmentAttempt.findFirst({
      where: { userId: user.id, kind: 'diagnostic' },
      orderBy: { submittedAt: 'desc' },
    });
    const diag = getAssessment('diag-core');
    if (!latestDiag || !diag) {
      return NextResponse.json({ error: 'Complete the diagnostic assessment first.' }, { status: 400 });
    }
    let detail: { sectionResults?: { title: string; pct: number; covers?: string[] }[] } = {};
    try { detail = JSON.parse(latestDiag.detail); } catch {}
    const earnedModules = new Set(
      (detail.sectionResults ?? [])
        .filter((s) => s.pct >= 80)
        .flatMap((s) => s.covers ?? []),
    );
    const requested = body.moduleIds.filter((id) => earnedModules.has(id));
    if (requested.length === 0) {
      return NextResponse.json({ error: 'No modules reached the 80% placement threshold.' }, { status: 400 });
    }

    const lessonIds = map.phases
      .filter((ph) => can(user, 'lesson', { phaseId: ph.id }))
      .flatMap((ph) => ph.modules)
      .filter((m) => requested.includes(m.id))
      .flatMap((m) => m.lessons.map((l) => l.id));

    await db.lessonProgress.createMany({
      data: lessonIds.map((lessonId) => ({
        userId: user.id,
        lessonId,
        status: 'placed_out',
        placedOutAt: new Date(),
      })),
      skipDuplicates: true,
    });
    return NextResponse.json({ ok: true, placedOutCount: lessonIds.length, placedLessonIds: lessonIds });
  }

  // mode === 'test-out'
  const info = moduleTestOutQuestions(body.moduleId);
  if (!info || info.pool.length === 0) {
    return NextResponse.json({ error: 'Module has no test-out questions.' }, { status: 404 });
  }
  if (!can(user, 'lesson', { phaseId: info.phase.id })) {
    return NextResponse.json({ error: 'Upgrade to Pro to unlock this phase.' }, { status: 403 });
  }

  let correct = 0;
  for (const q of info.pool) {
    if (gradeAnswer(q, body.answers[q.id])) correct++;
  }
  const pct = Math.round((correct / info.pool.length) * 100);
  const passed = pct >= 85;
  const lessonIds = info.mod.lessons.map((l) => l.id);

  if (passed) {
    await db.lessonProgress.createMany({
      data: lessonIds.map((lessonId) => ({
        userId: user.id,
        lessonId,
        status: 'placed_out',
        placedOutAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({
    ok: true,
    passed,
    pct,
    correct,
    total: info.pool.length,
    placedLessonIds: passed ? lessonIds : [],
  });
}
