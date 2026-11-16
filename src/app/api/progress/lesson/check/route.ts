import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimitShared } from '@/lib/auth';
import { getLessonById } from '@/lib/content';
import { gradeAnswer } from '@/lib/grading';
import { can } from '@/lib/entitlements';
import { assertSameOrigin } from '@/lib/origin';

const schema = z.object({
  lessonId: z.string().min(1).max(120),
  questionId: z.string().min(1).max(80),
  answer: z.unknown(),
});

/** Immediate single-question server check for the lesson player (never leaks answer keys beforehand). */
export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to check answers.' }, { status: 401 });

  if (!(await rateLimitShared(`check:${user.id}`, 40, 2))) {
    return NextResponse.json({ error: 'Slow down a moment.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid check request.' }, { status: 400 });

  const found = getLessonById(parsed.data.lessonId);
  if (!found) return NextResponse.json({ error: 'Unknown lesson.' }, { status: 404 });
  if (!can(user, 'lesson', { phaseId: found.phaseId })) {
    return NextResponse.json({ error: 'Upgrade to Pro to access this phase.' }, { status: 403 });
  }

  const q = found.lesson.quiz.find((item) => item.id === parsed.data.questionId);
  if (!q) return NextResponse.json({ error: 'Unknown question.' }, { status: 404 });

  const correct = gradeAnswer(q, parsed.data.answer);
  return NextResponse.json({
    correct,
    explanation: q.explanation,
  });
}
