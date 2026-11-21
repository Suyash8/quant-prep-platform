import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listProblems } from '@/lib/content';
import { PracticeProblemClient } from '@/components/learn/practice-problem-client';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = listProblems().find((item) => item.slug === slug);
  if (!p) return { title: 'Problem Not Found' };
  return {
    title: `${p.title} (${p.difficulty})`,
    description: `Solve ${p.title} in C++17, C++20, or Python 3 on QuantFoundry.`,
    robots: { index: false },
  };
}

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!listProblems().some((item) => item.slug === slug)) notFound();
  return <PracticeProblemClient />;
}
