import Link from 'next/link';
import { Code2 } from 'lucide-react';

export function PracticeLoginPrompt() {
  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero">
        <span className="icon-tile icon-tile-info"><Code2 strokeWidth={2.5} /></span>
        <div>
          <h1>Practice problems</h1>
          <p className="page-sub">Real-execution coding challenges, scored server-side.</p>
        </div>
      </header>
      <div className="qf-empty bg-dots">
        <span className="empty-emoji" role="img" aria-label="locked">🔐</span>
        <p className="text-lg font-extrabold">Sign in to start solving</p>
        <p className="mx-auto mt-1 max-w-md text-[15px] font-semibold text-muted">
          Progress, submissions and the code editor need an account, it takes about 20 seconds.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="btn3d btn3d-sm">Sign in</Link>
          <Link href="/register" className="btn3d btn3d-ghost btn3d-sm">Create account</Link>
        </div>
      </div>
    </div>
  );
}
