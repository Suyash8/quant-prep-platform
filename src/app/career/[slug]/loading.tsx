/** Company profile shaped skeleton (hero + matrix + sections). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6" aria-busy="true">
      <div className="page-hero">
        <span className="icon-tile skeleton" style={{ width: '3.4rem', height: '3.4rem' }} />
        <div className="space-y-2">
          <span className="skeleton block h-7 w-64 max-w-full" />
          <span className="skeleton block h-4 w-80 max-w-full" />
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <span className="skeleton block h-32 w-full" style={{ borderRadius: 20 }} />
          <span className="skeleton block h-48 w-full" style={{ borderRadius: 20 }} />
        </div>
        <div className="space-y-3">
          <span className="skeleton block h-20 w-full" style={{ borderRadius: 20 }} />
          <span className="skeleton block h-60 w-full" style={{ borderRadius: 20 }} />
        </div>
      </div>
    </div>
  );
}
