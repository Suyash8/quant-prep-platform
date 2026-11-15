import { ProjectsClient } from '@/components/learn/projects-client';
import { getProject, listProjects } from '@/lib/content';

export const metadata = { title: 'Projects · QuantFoundry' };

export default function ProjectsPage() {
  const cards = [...listProjects()]
    .sort((a, b) => a.order - b.order)
    .map((p) => {
      const full = getProject(p.slug);
      return {
        ...p,
        hours: full?.milestones.reduce((n, m) => n + m.estHours, 0) ?? 15,
        desc: full?.problem.replace(/\*\*|\n|`/g, ' ').replace(/\s+/g, ' ').trim() ?? p.title,
        milestoneTotal: full?.milestones.length ?? 5,
      };
    });

  return <ProjectsClient initialProjects={cards} />;
}
