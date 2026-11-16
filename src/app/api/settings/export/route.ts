import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const [
    profile,
    lessons,
    problems,
    assessments,
    diagnostics,
    drills,
    projects,
    cards,
    xpEvents,
    notes,
    bookmarks,
    studyPlans,
    learningSessions,
    applications,
    skillStates,
    contactMessages,
    contentReports,
    problemReveals,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        timezone: true,
        emailVerifiedAt: true,
        xp: true,
        streakCount: true,
        longestStreak: true,
        dailyGoalXp: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.lessonProgress.findMany({ where: { userId: user.id } }),
    db.problemAttempt.findMany({ where: { userId: user.id } }),
    db.assessmentAttempt.findMany({ where: { userId: user.id } }),
    db.diagnosticResult.findMany({ where: { userId: user.id } }),
    db.drillSession.findMany({ where: { userId: user.id } }),
    db.projectProgress.findMany({ where: { userId: user.id } }),
    db.cardState.findMany({ where: { userId: user.id } }),
    db.xpEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    db.note.findMany({ where: { userId: user.id } }),
    db.bookmark.findMany({ where: { userId: user.id } }),
    db.studyPlan.findMany({ where: { userId: user.id } }),
    db.learningSession.findMany({ where: { userId: user.id } }),
    db.application.findMany({ where: { userId: user.id } }),
    db.userSkill.findMany({ where: { userId: user.id } }),
    db.contactMessage.findMany({ where: { userId: user.id } }),
    db.contentReport.findMany({ where: { userId: user.id } }),
    db.problemReveal.findMany({ where: { userId: user.id } }),
  ]);

  const exportData = {
    schemaVersion: 2,
    exportDate: new Date().toISOString(),
    platform: 'QuantFoundry',
    fieldGuide: {
      user: 'Profile, plan, timezone, and aggregate streak/XP counters.',
      lessons: 'Per-lesson mastery state, knowledge check best score, exercise checklist, and placement records.',
      problems: 'Submitted C++/Python runs and test pass counts.',
      assessments: 'Timed assessment & diagnostic attempt scores and question breakdowns.',
      cards: 'SM-2 spaced repetition intervals, repetitions, and due timestamps.',
      xpHistory: 'Full append-only XP ledger entries.',
      applications: 'Personal quant career application tracker entries.',
    },
    user: profile,
    learningHistory: {
      lessons,
      problems,
      assessments,
      diagnostics,
      drills,
      projects,
      cards,
      notes,
      bookmarks,
      studyPlans,
      learningSessions,
      skillStates,
      problemReveals,
    },
    careerTracker: applications,
    support: {
      contactMessages,
      contentReports,
    },
    xpHistory: xpEvents,
  };

  const filename = `quantfoundry-data-${user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
