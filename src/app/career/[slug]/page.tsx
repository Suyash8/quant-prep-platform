import type { Metadata } from 'next';
import { listCompanies } from '@/lib/content';
import { CompanyDetailClient } from '@/components/learn/company-detail-client';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const company = listCompanies().find((c) => c.slug === slug);
  if (!company) return { title: 'Career Profile · QuantFoundry' };
  return {
    title: `${company.name} Quant Prep Profile · QuantFoundry`,
    description: `Preparation modules, role competencies, and technical expectations for ${company.name}.`,
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CompanyDetailClient initialSlug={slug} />;
}
