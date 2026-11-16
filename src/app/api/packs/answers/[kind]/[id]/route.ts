import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getLessonById, getProblem } from '@/lib/content';
import { can } from '@/lib/entitlements';
import { assertSameOrigin } from '@/lib/origin';

/**
 * Tier-2 Authenticated Answer & Solution Delivery (A2).
 * Never serves quiz keys or problem solutions to guests or to users who haven't passed/unlocked them.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to view answer keys.' }, { status: 401 });
  }

  if (kind === 'lesson') {
    const found = getLessonById(id);
    if (!found) return NextResponse.json({ error: 'Unknown lesson.' }, { status: 404 });
    if (!can(user, 'answers', { phaseId: found.phaseId })) {
      return NextResponse.json({ error: 'Upgrade to Pro to unlock this phase.' }, { status: 403 });
    }
    const progress = await db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: id } },
      select: { status: true, firstPassedAt: true },
    });
    const cleared = Boolean(
      progress?.firstPassedAt || ['passed', 'mastered'].includes(progress?.status ?? ''),
    );
    if (!cleared) {
      return NextResponse.json(
        { error: 'Pass the knowledge check (80%+) to unlock the full answer key.' },
        { status: 403 },
      );
    }
    const answers = Object.fromEntries(
      found.lesson.quiz.map((q) => [
        q.id,
        {
          answerIndex: q.answerIndex,
          answerIndices: q.answerIndices,
          answer: q.answer,
          modelAnswer: q.modelAnswer,
          explanation: q.explanation,
        },
      ]),
    );
    return NextResponse.json({ answers });
  }

  if (kind === 'problem') {
    const problem = getProblem(id);
    if (!problem) return NextResponse.json({ error: 'Unknown problem.' }, { status: 404 });
    if (!can(user, 'answers', { slug: problem.slug })) {
      return NextResponse.json({ error: 'Upgrade to Pro to unlock all problem solutions.' }, { status: 403 });
    }
    const [solved, revealed] = await Promise.all([
      db.problemAttempt.findFirst({
        where: { userId: user.id, problemSlug: problem.slug, status: 'passed' },
        select: { id: true },
      }),
      db.problemReveal.findUnique({
        where: { userId_problemSlug: { userId: user.id, problemSlug: problem.slug } },
        select: { id: true },
      }),
    ]);
    if (!solved && !revealed) {
      return NextResponse.json(
        { locked: true, canGiveUp: true, error: 'Solve this problem or click "Reveal solution" to unlock the editorial.' },
        { status: 403 },
      );
    }
    return NextResponse.json({ editorial: problem.editorial, solutions: problem.solutions });
  }

  return NextResponse.json({ error: 'Invalid pack kind.' }, { status: 400 });
}

/** Explicit "Give up & reveal solution" unlock for coding problems. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ kind: string; id: string }> },
) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const { kind, id } = await ctx.params;
  if (kind !== 'problem') {
    return NextResponse.json({ error: 'Only problem solutions support give-up reveal.' }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const problem = getProblem(id);
  if (!problem) return NextResponse.json({ error: 'Unknown problem.' }, { status: 404 });
  if (!can(user, 'answers', { slug: problem.slug })) {
    return NextResponse.json({ error: 'Upgrade to Pro to unlock all problem solutions.' }, { status: 403 });
  }

  await db.problemReveal.upsert({
    where: { userId_problemSlug: { userId: user.id, problemSlug: problem.slug } },
    create: { userId: user.id, problemSlug: problem.slug },
    update: {},
  });

  return NextResponse.json({ unlocked: true, editorial: problem.editorial, solutions: problem.solutions });
}
