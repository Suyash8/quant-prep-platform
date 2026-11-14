'use client';
import { use } from 'react';
import { V5Provider } from '@/components/v5/v5-provider';
import { LessonExperience } from '@/components/v5/lesson-experience';
import { LessonUnavailable } from '@/components/v5/lesson-unavailable';
export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <V5Provider>{({ store, content }) => {
    const lesson = content?.lessons.find((l) => l.id === id);
    const planned = content?.map?.lessons.find((l) => l.id === id);
    if (!content) return <LessonUnavailable store={store} reason="not-stored" />;
    if (lesson) return <LessonExperience lesson={lesson} questions={content.questions} packSha={content.itemsSha} store={store} contentVersion={content.contentVersion} />;
    if (planned) return <LessonUnavailable store={store} reason={planned.status === 'authored' ? 'not-stored' : 'planned'} lessonTitle={planned.title} />;
    return <LessonUnavailable store={store} reason="unknown" />;
  }}</V5Provider>;
}
