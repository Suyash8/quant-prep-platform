import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAssessment } from '@/lib/content';
import { AssessmentDetailClient } from '@/components/learn/assessment-detail-client';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const a = getAssessment(id);
  if (!a) return { title: 'Assessment Not Found' };
  return {
    title: `${a.title} · Assessments`,
    description: a.description.slice(0, 155),
    robots: { index: false },
  };
}

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getAssessment(id)) notFound();
  return <AssessmentDetailClient />;
}
