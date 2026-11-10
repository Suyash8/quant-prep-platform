import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { LearnClient } from '@/components/learn/learn-client';

/**
 * v3 lesson page: a thin auth shell. The lesson itself renders client-side
 * from the content pack (service-worker cached), so opening and moving
 * between lessons is instant and works fully offline. Progress is recorded
 * locally and synced in the background.
 */
export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/learn/${lessonId}`);

  return (
    <Suspense fallback={null}>
      <LearnClient initialLessonId={lessonId} />
    </Suspense>
  );
}
