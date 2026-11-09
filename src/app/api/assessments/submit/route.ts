import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimit } from '@/lib/auth';
import { db } from '@/lib/db';
import { awardXp, XP_TABLE } from '@/lib/gamification';
import { getAssessment } from '@/lib/content';
import { gradeAnswer } from '@/lib/grading';
import { scoreQuiz } from '@/lib/mastery';

const schema = z.object({
  assessmentId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
  timeSpentS: z.number().int().min(0).max(86400).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!rateLimit(`assess:${user.id}`, 6, 0.1)) {
    return NextResponse.json({ error: 'Too many submissions — slow down.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 });
  const { assessmentId, answers, timeSpentS } = parsed.data;

  const assessment = getAssessment(assessmentId);
  if (!assessment) return NextResponse.json({ error: 'Unknown assessment.' }, { status: 404 });

  const sectionResults: { title: string; correct: number; total: number; pct: number }[] = [];
  const perQuestion: Record<string, { correct: boolean; explanation: string }> = {};
  const areaTotals: Record<string, { correct: number; total: number }> = {};
  const areaIndex = assessment.areas ?? [];
  let allCorrect = 0, allTotal = 0;

  assessment.sections.forEach((section, si) => {
    let correct = 0;
    for (const q of section.questions) {
      const isCorrect = answers[q.id] !== undefined ? gradeAnswer(q, answers[q.id]) : false;
      perQuestion[q.id] = { correct: isCorrect, explanation: q.explanation };
      if (isCorrect) correct++;
      const area = areaIndex[si] ?? section.title;
      areaTotals[area] = areaTotals[area] ?? { correct: 0, total: 0 };
      areaTotals[area].total++;
      if (isCorrect) areaTotals[area].correct++;
    }
    allCorrect += correct;
    allTotal += section.questions.length;
    sectionResults.push({ title: section.title, correct, total: section.questions.length, pct: Math.round((correct / section.questions.length) * 100) });
  });

  const pct = Math.round((allCorrect / allTotal) * 100);
  const isDiagnostic = assessment.id.startsWith('diag-');

  await db.assessmentAttempt.create({
    data: {
      userId: user.id,
      assessmentId: assessment.id,
      kind: assessment.kind,
      scorePct: pct,
      detail: JSON.stringify({ sectionResults, perQuestion, areaTotals, timeSpentS: timeSpentS ?? null }),
      submittedAt: new Date(),
    },
  });

  // Retrieval mastery: passing a later cumulative assessment marks retrievalDone on passed lessons
  if (!isDiagnostic && pct >= 70) {
    const passedLessons = await db.lessonProgress.findMany({ where: { userId: user.id, status: 'passed' } });
    for (const p of passedLessons) {
      await db.lessonProgress.update({ where: { id: p.id }, data: { retrievalDone: true } }).catch(() => {});
    }
  }

  // Gamification: assessments pay XP by score band.
  let xpAwarded = 0;
  if (allTotal >= 5 && pct >= 30) {
    const amount = Math.min(Math.floor(pct / 10) * XP_TABLE.assessmentPer10pct, XP_TABLE.assessmentCap);
    const award = await awardXp(user.id, amount, isDiagnostic ? 'diagnostic' : 'assessment', assessment.title).catch(() => null);
    xpAwarded = award?.amount ?? 0;
  }

  return NextResponse.json({
    pct, correct: allCorrect, total: allTotal, xpAwarded,
    sectionResults, perQuestion, areaTotals: isDiagnostic ? areaTotals : undefined,
  });
}
