/** Problem workspace shaped skeleton (two columns: statement + editor). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6" aria-busy="true">
      <div className="page-hero">
        <span className="icon-tile skeleton" style={{ width: '3.4rem', height: '3.4rem' }} />
        <div className="space-y-2">
          <span className="skeleton block h-7 w-72 max-w-full" />
          <span className="skeleton block h-4 w-48" />
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <span className="skeleton block h-24 w-full" style={{ borderRadius: 20 }} />
          <span className="skeleton block h-40 w-full" style={{ borderRadius: 20 }} />
          <span className="skeleton block h-20 w-full" style={{ borderRadius: 20 }} />
        </div>
        <div className="space-y-3">
          <span className="skeleton block h-12 w-full" style={{ borderRadius: 14 }} />
          <span className="skeleton block h-64 w-full" style={{ borderRadius: 18 }} />
          <span className="skeleton block h-20 w-full" style={{ borderRadius: 18 }} />
        </div>
      </div>
    </div>
  );
}
