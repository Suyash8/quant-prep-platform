import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimitShared } from '@/lib/auth';
import { db } from '@/lib/db';
import { awardXp, XP_TABLE } from '@/lib/gamification';
import { dayKey } from '@/lib/gamification-core';
import { getAssessment, getMap } from '@/lib/content';
import { gradeAnswer } from '@/lib/grading';
import { can } from '@/lib/entitlements';
import { assertSameOrigin } from '@/lib/origin';

const schema = z.object({
  assessmentId: z.string().min(1).max(120),
  answers: z.record(z.string(), z.unknown()),
  timeSpentS: z.number().int().min(0).max(86400).optional(),
});

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!(await rateLimitShared(`assess:${user.id}`, 6, 0.1))) {
    return NextResponse.json({ error: 'Too many submissions, slow down.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 });
  const { assessmentId, answers, timeSpentS } = parsed.data;

  const assessment = getAssessment(assessmentId);
  if (!assessment) return NextResponse.json({ error: 'Unknown assessment.' }, { status: 404 });
  if (!can(user, 'assessment', { assessmentId: assessment.id })) {
    return NextResponse.json({ error: 'Upgrade to Pro to unlock firm assessments.' }, { status: 403 });
  }

  const sectionResults: { title: string; correct: number; total: number; pct: number; covers?: string[] }[] = [];
  const perQuestion: Record<string, { correct: boolean; explanation: string }> = {};
  const areaTotals: Record<string, { correct: number; total: number }> = {};
  const areaIndex = assessment.areas ?? [];
  let allCorrect = 0;
  let allTotal = 0;

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
    sectionResults.push({
      title: section.title,
      correct,
      total: section.questions.length,
      pct: section.questions.length ? Math.round((correct / section.questions.length) * 100) : 0,
      covers: section.covers,
    });
  });

  const pct = allTotal ? Math.round((allCorrect / allTotal) * 100) : 0;
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

  // Retrieval mastery applies ONLY to lessons explicitly covered by this assessment (A4)
  if (!isDiagnostic && pct >= (assessment.passMarkPercent ?? 70)) {
    const map = getMap();
    const coveredModuleIds = new Set(assessment.sections.flatMap((s) => s.covers ?? []));
    const bandLessonIds = new Set(
      (assessment.scoreBands ?? [])
        .filter((b) => pct >= b.minPercent && pct <= b.maxPercent)
        .flatMap((b) => b.lessonIds ?? []),
    );
    const eligibleLessons = new Set<string>(bandLessonIds);
    for (const ph of map.phases) {
      for (const m of ph.modules) {
        if (coveredModuleIds.has(m.id)) {
          for (const l of m.lessons) eligibleLessons.add(l.id);
        }
      }
    }
    if (eligibleLessons.size > 0) {
      await db.lessonProgress.updateMany({
        where: { userId: user.id, status: 'passed', lessonId: { in: [...eligibleLessons] } },
        data: { retrievalDone: true, status: 'mastered' },
      });
    }
  }

  let xpAwarded = 0;
  if (allTotal >= 5 && pct >= 30) {
    const amount = Math.min(Math.floor(pct / 10) * XP_TABLE.assessmentPer10pct, XP_TABLE.assessmentCap);
    const today = dayKey(new Date(), user.timezone || 'UTC');
    const award = await awardXp(
      user.id,
      amount,
      isDiagnostic ? 'diagnostic' : 'assessment',
      assessment.title,
      undefined,
      `${assessment.id}:${today}`,
    ).catch(() => null);
    xpAwarded = award?.amount ?? 0;
  }

  const placedOutModules = isDiagnostic
    ? sectionResults.filter((s) => s.pct >= 80 && s.covers?.length).flatMap((s) => s.covers!)
    : [];

  if (isDiagnostic) {
    await db.diagnosticResult.create({
      data: {
        userId: user.id,
        assessmentId: assessment.id,
        areaScores: JSON.stringify(areaTotals),
        totalPct: pct,
      },
    }).catch(() => {});
  }

  return NextResponse.json({
    pct,
    correct: allCorrect,
    total: allTotal,
    xpAwarded,
    sectionResults,
    perQuestion,
    areaTotals: isDiagnostic ? areaTotals : undefined,
    placedOutModules: isDiagnostic ? placedOutModules : undefined,
  });
}
