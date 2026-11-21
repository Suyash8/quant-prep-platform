import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listCompanies } from '@/lib/content';
import { CompanyDetailClient } from '@/components/learn/company-detail-client';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const company = listCompanies().find((c) => c.slug === slug);
  if (!company) return { title: 'Career Profile Not Found' };
  return {
    title: `${company.name} Quant Prep Profile`,
    description: `Preparation modules, role competencies, and technical expectations for ${company.name}.`,
    alternates: { canonical: `/career/${slug}` },
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!listCompanies().some((c) => c.slug === slug)) notFound();
  return <CompanyDetailClient initialSlug={slug} />;
}
