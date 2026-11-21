import { redirect } from 'next/navigation';

// /learn has no index of its own; forward optional ?q= search param to /curriculum.
export default async function LearnIndex({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  if (q && q.trim()) {
    redirect(`/curriculum?q=${encodeURIComponent(q.trim())}`);
  }
  redirect('/curriculum');
}
