export default function ProjectLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8" aria-busy="true" aria-label="Loading project">
      <div className="page-hero">
        <div className="skeleton w-14 h-14" />
        <div className="space-y-2">
          <div className="skeleton h-6 w-64" />
          <div className="skeleton h-4 w-44" />
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 qf-card-flat p-5 space-y-3">
          <div className="skeleton h-5 w-52" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-40 w-full" />
          <div className="skeleton h-4 w-8/12" />
        </div>
        <div className="qf-card-flat p-5 space-y-3">
          <div className="skeleton h-20 w-20 mx-auto" />
          <div className="skeleton h-4 w-32 mx-auto" />
          <div className="skeleton h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
