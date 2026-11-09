import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimit } from '@/lib/auth';
import { getLessonById } from '@/lib/content';
import { gradeAnswer } from '@/lib/grading';

const schema = z.object({
  lessonId: z.string().min(1),
  questionId: z.string().min(1),
  answer: z.unknown(),
});

/**
 * Per-question instant feedback for the lesson player.
 * The learner submits ONE answer and learns whether it was right, with the
 * explanation. Server-side grading stays the single source of truth; the
 * full quiz is still scored (and progress recorded) by /api/progress/lesson.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to check answers.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid check.' }, { status: 400 });
  const { lessonId, questionId, answer } = parsed.data;

  const found = getLessonById(lessonId);
  if (!found) return NextResponse.json({ error: 'Unknown lesson.' }, { status: 404 });
  const question = found.lesson.quiz.find(q => q.id === questionId);
  if (!question) return NextResponse.json({ error: 'Unknown question.' }, { status: 404 });

  if (!rateLimit(`check:${user.id}`, 120, 1)) {
    return NextResponse.json({ error: 'Too many checks, slow down.' }, { status: 429 });
  }

  const correct = gradeAnswer(question, answer);
  return NextResponse.json({ correct, explanation: question.explanation });
}
