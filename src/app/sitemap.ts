import type { MetadataRoute } from 'next';
import { getRegistry, listCompanies, listProjects } from '@/lib/content';
import { getSiteUrl } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const reg = getRegistry();
  const companies = listCompanies();
  const projects = listProjects();

  const staticRoutes = [
    { path: '', priority: 1.0, freq: 'weekly' as const },
    { path: '/curriculum', priority: 0.9, freq: 'weekly' as const },
    { path: '/pricing', priority: 0.9, freq: 'weekly' as const },
    { path: '/projects', priority: 0.8, freq: 'weekly' as const },
    { path: '/career', priority: 0.8, freq: 'weekly' as const },
    { path: '/lab', priority: 0.8, freq: 'weekly' as const },
    { path: '/methodology', priority: 0.7, freq: 'monthly' as const },
    { path: '/diagnostic', priority: 0.8, freq: 'monthly' as const },
    { path: '/about', priority: 0.6, freq: 'monthly' as const },
    { path: '/contact', priority: 0.6, freq: 'monthly' as const },
    { path: '/privacy', priority: 0.4, freq: 'yearly' as const },
    { path: '/terms', priority: 0.4, freq: 'yearly' as const },
    { path: '/login', priority: 0.5, freq: 'monthly' as const },
    { path: '/register', priority: 0.6, freq: 'monthly' as const },
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${siteUrl}${r.path || '/'}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));

  for (const company of companies) {
    entries.push({
      url: `${siteUrl}/career/${company.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  for (const project of projects) {
    entries.push({
      url: `${siteUrl}/projects/${project.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  for (const lesson of reg.lessons) {
    entries.push({
      url: `${siteUrl}/learn/${lesson.id}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  return entries;
}
