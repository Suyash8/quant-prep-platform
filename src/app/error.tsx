'use client';

import { Compass, Home, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="page-hero">
        <span className="icon-tile icon-tile-danger">
          <Compass aria-hidden="true" />
        </span>
        <div>
          <h1>That did not load.</h1>
          <p className="page-sub">Something broke while rendering this page. Your progress is safe on your device.</p>
        </div>
      </div>
      <div className="qf-card bg-dots p-8 flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-semibold text-muted max-w-md">
          Try again in a moment. If it keeps happening, go home and reopen the page from there.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
          <button type="button" className="btn3d" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden="true" /> Try again
          </button>
          <Link href="/dashboard" className="btn3d btn3d-ghost">
            <Home className="size-4" aria-hidden="true" /> Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
