import Link from 'next/link';
import { Search, Map } from 'lucide-react';
import { Mascot } from '@/components/brand/mascot';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="page-hero">
        <span className="icon-tile icon-tile-warning">
          <Map aria-hidden="true" />
        </span>
        <div>
          <h1>Page not found</h1>
          <p className="page-sub">This address does not match any lesson, problem or page.</p>
        </div>
      </div>
      <form action="/learn" method="get" className="qf-card bg-dots p-8 flex flex-col items-center gap-4">
        <Mascot pose="lost" size={96} />
        <h2 className="text-lg font-black">Siggy is lost too.</h2>
        <p className="text-sm font-semibold text-muted max-w-md">
          Search the lesson library, or go back to your path and keep the streak alive.
        </p>
        <div className="flex w-full max-w-md items-center gap-2 bg-surface qf-card-flat p-2">
          <Search className="size-4 text-muted ml-1" aria-hidden="true" />
          <input
            type="search"
            name="q"
            placeholder="Search 283 lessons"
            aria-label="Search lessons"
            className="qf-input border-0 shadow-none bg-transparent"
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/learn" className="btn3d">Back to my path</Link>
          <Link href="/dashboard" className="btn3d btn3d-ghost">My dashboard</Link>
        </div>
      </form>
    </div>
  );
}
