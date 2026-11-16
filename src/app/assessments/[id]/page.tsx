import type { Metadata } from 'next';
import { getAssessment } from '@/lib/content';
import { AssessmentDetailClient } from '@/components/learn/assessment-detail-client';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const a = getAssessment(id);
  if (!a) return { title: 'Assessment · QuantFoundry' };
  return {
    title: `${a.title} · Assessments · QuantFoundry`,
    description: a.description.slice(0, 155),
  };
}

export default function AssessmentPage() {
  return <AssessmentDetailClient />;
}
