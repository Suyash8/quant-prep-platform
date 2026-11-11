'use client';

import { RefreshCw } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', fontFamily: 'system-ui, sans-serif' }}>
        <div role="alert" style={{ textAlign: 'center', padding: '2rem', maxWidth: 420 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: '#ffe9ea', color: '#b02a30', marginBottom: 12 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-9-9" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px' }}>QuantFoundry could not start</h1>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#5b6b7d', margin: '0 0 16px' }}>
            The app hit an error it could not recover from. Your saved progress stays on your device.
            {error.digest ? ` Reference: ${error.digest}.` : ''}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ fontWeight: 800, fontSize: 15, padding: '12px 28px', borderRadius: 16, border: 0, background: '#2aa64a', color: '#fff', boxShadow: '0 5px 0 #1d8a3e', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
