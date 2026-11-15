import { Suspense } from 'react';
import { LearnClient } from '@/components/learn/learn-client';

export default function LessonPage() {
  return (
    <Suspense fallback={null}>
      <LearnClient />
    </Suspense>
  );
}
