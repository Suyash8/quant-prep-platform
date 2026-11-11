export default function Loading() {
  // Skeleton shaped like the standard feature page: hero, stat row, rows.
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8" aria-busy="true" aria-label="Loading page">
      <div className="page-hero">
        <div className="skeleton w-14 h-14" />
        <div className="space-y-2">
          <div className="skeleton h-6 w-64" />
          <div className="skeleton h-4 w-44" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="stat-tile">
            <div className="skeleton h-8 w-20 mb-2" />
            <div className="skeleton h-3.5 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
