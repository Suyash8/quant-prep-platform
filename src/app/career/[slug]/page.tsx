import { CompanyDetailClient } from '@/components/learn/company-detail-client';

export const metadata = { title: 'Career Profile · QuantFoundry' };

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CompanyDetailClient initialSlug={slug} />;
}
