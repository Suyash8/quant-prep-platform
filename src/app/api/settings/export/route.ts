import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const [
    profile,
    lessons,
    problems,
    assessments,
    drills,
    projects,
    cards,
    xpEvents,
    notes,
    bookmarks,
    studyPlans,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    }),
    db.lessonProgress.findMany({ where: { userId: user.id } }),
    db.problemAttempt.findMany({ where: { userId: user.id }, select: { problemSlug: true, language: true, status: true, passedTests: true, totalTests: true, createdAt: true } }),
    db.assessmentAttempt.findMany({ where: { userId: user.id } }),
    db.drillSession.findMany({ where: { userId: user.id } }),
    db.projectProgress.findMany({ where: { userId: user.id } }),
    db.cardState.findMany({ where: { userId: user.id } }),
    db.xpEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 500 }),
    db.note.findMany({ where: { userId: user.id } }),
    db.bookmark.findMany({ where: { userId: user.id } }),
    db.studyPlan.findMany({ where: { userId: user.id } }),
  ]);

  const exportData = {
    exportDate: new Date().toISOString(),
    platform: 'QuantFoundry',
    user: profile,
    learningHistory: {
      lessons,
      problems,
      assessments,
      drills,
      projects,
      cards,
      notes,
      bookmarks,
      studyPlans,
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
