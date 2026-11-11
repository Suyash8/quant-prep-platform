/** Project detail shaped skeleton (stepper + sticky progress column). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6" aria-busy="true">
      <div className="page-hero">
        <span className="icon-tile skeleton" style={{ width: '3.4rem', height: '3.4rem' }} />
        <div className="space-y-2">
          <span className="skeleton block h-7 w-72 max-w-full" />
          <span className="skeleton block h-4 w-56" />
        </div>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6">
        <div className="space-y-3">
          <span className="skeleton block h-28 w-full" style={{ borderRadius: 20 }} />
          <span className="skeleton block h-52 w-full" style={{ borderRadius: 20 }} />
        </div>
        <div className="space-y-3">
          <span className="skeleton block h-24 w-full" style={{ borderRadius: 20 }} />
          <span className="skeleton block h-40 w-full" style={{ borderRadius: 20 }} />
        </div>
      </div>
    </div>
  );
}
