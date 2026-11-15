'use client';

import { useEffect } from 'react';

/**
 * Protects unsaved code or form edits from accidental tab close or refresh.
 * Only activates native confirmation while `isDirty` is true.
 */
export function useBackGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty || typeof window === 'undefined') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);
}
