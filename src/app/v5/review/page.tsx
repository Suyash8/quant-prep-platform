'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RetiredReviews } from '@/components/v5/retired-reviews';
import type { V5ContentStore } from '@/lib/v5/idb-store';
import { V5Provider, useV5 } from '@/components/v5/v5-provider';
import { LearningWorkspace } from '@/components/v5/learning-workspace';
import { ReviewSession } from '@/components/v5/review-session';
import type { ReviewEntry, ReviewCard } from '@/lib/v5/types';
import { UnavailableReviews } from '@/components/v5/unavailable-reviews';
function Inner() {
  const { store } = useV5(); const [entries, setEntries] = useState<ReviewEntry[] | null>(null); const [unavailable, setUnavailable] = useState<{ card: ReviewCard; reason: 'version-unavailable' }[]>([]); const missing = unavailable.length; const [n, setN] = useState(0); const router = useRouter();
  useEffect(() => { void store.getDueReviews(Date.now()).then(setEntries); void store.getUnavailableReviews(Date.now()).then(setUnavailable); }, [store, n]);
  return <LearningWorkspace store={store} active="review" eyebrow="Review" title="Due reviews" subtitle="Cards come from questions you missed or flagged. Ratings here schedule the next review and never count as mastery.">
    <UnavailableReviews entries={unavailable} />
    {!entries ? <p role="status">Loading…</p> : entries.length === 0 ? <p>{missing > 0 ? 'No other cards are due.' : 'Nothing is due. Answer lesson checks to build your review queue.'}</p> : <ReviewSession key={n} entries={entries} store={store} onComplete={() => router.push('/v5/learn')} />}
    {'getRetiredReviews' in store && <RetiredReviews store={store as V5ContentStore} onRestored={() => setN((x) => x + 1)} />}
  </LearningWorkspace>;
}
export default function ReviewPage() { return <V5Provider>{() => <Inner />}</V5Provider>; }
