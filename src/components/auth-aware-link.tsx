'use client';

import * as React from 'react';
import Link from 'next/link';
import { onBroadcast } from '@/lib/client/broadcast';

/**
 * Renders a CTA link that adapts between guest and signed-in learners using
 * cached client auth state, keeping marketing pages 100% free of SSR DB calls.
 */
export function AuthAwareLink({
  guestHref,
  authedHref,
  guestContent,
  authedContent,
  className,
}: {
  guestHref: string;
  authedHref: string;
  guestContent: React.ReactNode;
  authedContent: React.ReactNode;
  className?: string;
}) {
  const [signedIn, setSignedIn] = React.useState(false);

  React.useEffect(() => {
    const sync = () => {
      try {
        setSignedIn(Boolean(window.localStorage.getItem('qf-chrome-user')));
      } catch {
        setSignedIn(false);
      }
    };
    sync();
    window.addEventListener('qf:auth-refresh', sync);
    const unsub = onBroadcast((pkt) => {
      if (pkt.topic === 'auth-changed') sync();
    });
    return () => {
      window.removeEventListener('qf:auth-refresh', sync);
      unsub();
    };
  }, []);

  return (
    <Link href={signedIn ? authedHref : guestHref} className={className}>
      {signedIn ? authedContent : guestContent}
    </Link>
  );
}
