import Link from 'next/link';
import { Search } from 'lucide-react';
import { Mascot } from '@/components/brand/mascot';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="qf-card bg-dots qf-closing">
        <div className="flex flex-col items-center gap-3">
          <Mascot pose="lost" size={104} className="anim-bob" label="The mascot cannot find this page" />
          <h1 className="text-2xl font-black tracking-tight">This page is not on the path</h1>
          <p className="max-w-md text-[15px] font-semibold text-muted">
            The address you followed does not exist. It may have moved when the curriculum was updated.
          </p>
          <form action="/learn" className="mt-1 flex w-full max-w-sm items-center gap-2" role="search">
            <label htmlFor="nf-search" className="sr-only">Search lessons</label>
            <input id="nf-search" name="q" type="search" placeholder="Search lessons" className="qf-input" autoComplete="off" />
            <span className="icon-tile-sm icon-tile-info flex-none"><Search aria-hidden /></span>
          </form>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href="/learn" className="btn3d btn3d-lg">Back to my path</Link>
            <Link href="/dashboard" className="btn3d btn3d-ghost">Go to my dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
