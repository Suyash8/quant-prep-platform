import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getMap, getRegistry } from '@/lib/content';
import { AppShell } from '@/components/app-shell';
import { LearnLibrary, type LibraryModule } from '@/components/learn/learn-library';

export const metadata = { title: 'All lessons. QuantFoundry' };

// v3.1: /learn is the lesson library (previously it redirected to /curriculum,
// so two audited routes rendered the same page).

export default async function LearnIndex() {
  const user = await getCurrentUser();
  if (!user) redirect('/curriculum');

  const map = getMap();
  const reg = getRegistry();
  const published = new Set(reg.lessons.map(l => l.id));
  const progressRows = await db.lessonProgress.findMany({
    where: { userId: user.id },
    select: { lessonId: true, status: true },
  });
  const statusByLesson = new Map(progressRows.map(r => [r.lessonId, r.status]));

  const modules: LibraryModule[] = map.phases.flatMap(p =>
    p.modules.map(m => ({
      id: m.id,
      title: m.title,
      phaseTitle: p.title,
      lessons: m.lessons.map(l => ({
        id: l.id,
        title: l.title,
        moduleId: m.id,
        moduleTitle: m.title,
        phaseTitle: p.title,
        estMinutes: l.estMinutes,
        difficulty: m.difficulty,
        status: statusByLesson.get(l.id) ?? null,
        published: published.has(l.id),
      })),
    })),
  );

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      <LearnLibrary modules={modules} name={user.name} />
    </AppShell>
  );
}
