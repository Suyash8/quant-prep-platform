export default function CareerLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8" aria-busy="true" aria-label="Loading profile">
      <div className="page-hero">
        <div className="skeleton w-14 h-14" />
        <div className="space-y-2">
          <div className="skeleton h-6 w-56" />
          <div className="skeleton h-4 w-36" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="qf-card-flat p-5 space-y-3">
          <div className="skeleton h-5 w-44" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-10/12" />
        </div>
        <div className="qf-card-flat p-5 space-y-3">
          <div className="skeleton h-5 w-36" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-9/12" />
        </div>
      </div>
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-16 w-full" />)}
      </div>
    </div>
  );
}
