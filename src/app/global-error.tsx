'use client';

// Root error boundary: includes its own html/body, minimal but on-brand.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: 'white',
          color: 'rgb(35 47 63)',
          padding: '2rem',
        }}
      >
        <div
          style={{
            maxWidth: '26rem',
            textAlign: 'center',
            display: 'grid',
            gap: '0.75rem',
            justifyItems: 'center',
            border: '2px solid rgb(207 215 224)',
            borderRadius: '20px',
            padding: '2rem',
          }}
        >
          <div style={{ fontSize: '2rem' }} role="img" aria-label="Siggy the mascot">Σ</div>
          <h1 style={{ fontSize: '1.15rem', margin: 0 }}>The app hit a hard error.</h1>
          <p style={{ fontSize: '0.9rem', color: 'rgb(91 107 125)', margin: 0 }}>
            Reload to recover. Nothing you studied was lost.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '0.5rem',
              background: 'rgb(42 166 74)',
              color: 'white',
              fontWeight: 800,
              border: 'none',
              borderRadius: '14px',
              padding: '0.75rem 1.5rem',
              cursor: 'pointer',
              boxShadow: '0 4px 0 rgb(26 124 56)',
            }}
          >
            Reload the app
          </button>
        </div>
      </body>
    </html>
  );
}
