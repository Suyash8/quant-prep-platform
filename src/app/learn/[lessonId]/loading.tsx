/** Lesson player shaped skeleton (stage, top bar segments, side rails). */
export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col bg-surface" aria-busy="true">
      <div className="h-16 border-b-2 border-border flex items-center gap-3 px-4">
        <span className="skeleton h-10 w-10" style={{ borderRadius: 12 }} />
        <span className="skeleton h-3 w-64 max-w-[40vw]" />
        <span className="ml-auto skeleton h-8 w-24" style={{ borderRadius: 999 }} />
      </div>
      <div className="flex-1 lg:grid lg:grid-cols-[240px_minmax(0,1fr)_280px] gap-6 p-4 lg:p-6 max-w-7xl mx-auto w-full">
        <div className="hidden lg:block space-y-3">
          {[0, 1, 2, 3, 4, 5].map(i => <span key={i} className="skeleton block h-10 w-full" style={{ borderRadius: 12 }} />)}
        </div>
        <div className="flex items-center justify-center">
          <span className="skeleton block h-80 w-full max-w-xl" style={{ borderRadius: 20 }} />
        </div>
        <div className="hidden xl:block space-y-4">
          <span className="skeleton block h-28 w-full" style={{ borderRadius: 20 }} />
          <span className="skeleton block h-20 w-full" style={{ borderRadius: 20 }} />
        </div>
      </div>
    </div>
  );
}
