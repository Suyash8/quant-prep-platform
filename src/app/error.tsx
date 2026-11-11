'use client';

import Link from 'next/link';
import { RefreshCw, Home } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="qf-card bg-dots qf-closing">
        <div className="flex flex-col items-center gap-3">
          <span className="icon-tile icon-tile-danger">
            <RefreshCw aria-hidden />
          </span>
          <h1 className="text-xl font-black tracking-tight">That did not load</h1>
          <p className="max-w-md text-sm font-semibold text-muted">
            Something on our side failed while building this page. Your progress is safe on your device. Try again in a moment.
          </p>
          {error.digest ? <p className="text-xs font-bold text-faint">Reference: {error.digest}</p> : null}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
            <button type="button" className="btn3d" onClick={reset}>Try again</button>
            <Link href="/" className="btn3d btn3d-ghost">Go home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
