import type { Metadata } from 'next';
import { getProblem } from '@/lib/content';
import { PracticeProblemClient } from '@/components/learn/practice-problem-client';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProblem(slug);
  if (!p) return { title: 'Problem · Code Practice · QuantFoundry' };
  return {
    title: `${p.title} (${p.difficulty}) · QuantFoundry`,
    description: `Solve ${p.title} in C++17, C++20, or Python 3 on QuantFoundry.`,
  };
}

export default function ProblemPage() {
  return <PracticeProblemClient />;
}
