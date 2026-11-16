import type { Metadata } from 'next';
import { listProjects } from '@/lib/content';
import { ProjectDetailClient } from '@/components/learn/project-detail-client';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = listProjects().find((p) => p.slug === slug);
  if (!project) return { title: 'Project · QuantFoundry' };
  return {
    title: `${project.title} · Portfolio Project · QuantFoundry`,
    description: `${project.title} (${project.language}, ${project.difficulty}) capstone project specification and milestones.`,
  };
}

export default function ProjectPage() {
  return <ProjectDetailClient />;
}
