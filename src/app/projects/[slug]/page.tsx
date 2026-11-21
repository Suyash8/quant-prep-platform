import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listProjects } from '@/lib/content';
import { ProjectDetailClient } from '@/components/learn/project-detail-client';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = listProjects().find((p) => p.slug === slug);
  if (!project) return { title: 'Project Not Found' };
  return {
    title: `${project.title} · Portfolio Project`,
    description: `${project.title} (${project.language}, ${project.difficulty}) capstone project specification and milestones.`,
    alternates: { canonical: `/projects/${slug}` },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!listProjects().some((p) => p.slug === slug)) notFound();
  return <ProjectDetailClient />;
}
