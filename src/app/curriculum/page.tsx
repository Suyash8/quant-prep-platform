import { Suspense } from 'react';
import { getMap, getRegistry } from '@/lib/content';
import { CurriculumClient } from '@/components/curriculum-client';

export const metadata = { title: 'Curriculum · QuantFoundry' };

export default function CurriculumPage() {
  const map = getMap();
  const reg = getRegistry();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'QuantFoundry Quantitative Developer Curriculum',
    description: 'Prerequisite-sequenced quantitative finance, mathematics, C++, Python, and low-latency systems curriculum.',
    provider: { '@type': 'Organization', name: 'QuantFoundry' },
    numberOfCredits: reg.lessons.length,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={null}>
        <CurriculumClient
          initialMap={map}
          initialRegistry={{
            generatedAt: reg.generatedAt,
            lessons: reg.lessons.map((l) => ({
              id: l.id,
              moduleId: l.moduleId,
              phaseId: l.phaseId,
              title: l.title,
              estMinutes: l.estMinutes,
              difficulty: l.difficulty,
              skills: l.skills,
              prereqs: l.prereqs,
              hasQuiz: l.hasQuiz,
            })),
          }}
        />
      </Suspense>
    </>
  );
}
