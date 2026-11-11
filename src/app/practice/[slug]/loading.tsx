export default function ProblemLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8" aria-busy="true" aria-label="Loading problem">
      <div className="page-hero">
        <div className="skeleton w-14 h-14" />
        <div className="space-y-2">
          <div className="skeleton h-6 w-72" />
          <div className="skeleton h-4 w-48" />
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="qf-card-flat p-5 space-y-3">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-32 w-full" />
        </div>
        <div className="qf-card-flat p-5 space-y-3">
          <div className="skeleton h-9 w-56" />
          <div className="skeleton h-56 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
