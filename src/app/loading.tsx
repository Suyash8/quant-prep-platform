/** Route-level loading: shell-shaped skeleton blocks, never a spinner page. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8" aria-busy="true">
      <div className="page-hero">
        <span className="icon-tile skeleton" style={{ width: '3.4rem', height: '3.4rem' }} />
        <div className="space-y-2">
          <span className="skeleton block h-7 w-64" />
          <span className="skeleton block h-4 w-96 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className="stat-tile">
            <span className="skeleton block h-6 w-16 mb-2" style={{ marginRight: '3rem' }} />
            <span className="skeleton block h-4 w-20" />
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <span key={i} className="skeleton block h-16 w-full" style={{ borderRadius: 16 }} />
        ))}
      </div>
    </div>
  );
}
