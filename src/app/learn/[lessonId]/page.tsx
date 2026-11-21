import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLessonById } from '@/lib/content';
import { LearnClient } from '@/components/learn/learn-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}): Promise<Metadata> {
  const { lessonId } = await params;
  const hit = getLessonById(lessonId);
  if (!hit) return { title: 'Lesson Not Found' };
  const desc = (hit.lesson.motivation || hit.lesson.objectives?.[0] || `Interactive quantitative developer lesson on ${hit.lesson.title}.`)
    .replace(/\s+/g, ' ')
    .slice(0, 160);
  return {
    title: hit.lesson.title,
    description: desc,
    alternates: { canonical: `/learn/${lessonId}` },
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  if (!getLessonById(lessonId)) notFound();
  return (
    <Suspense fallback={null}>
      <LearnClient />
    </Suspense>
  );
}
