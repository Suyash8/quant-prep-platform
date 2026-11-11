export default function LessonLoading() {
  return (
    <div className="fixed inset-0 bg-dots p-4 sm:p-8 grid place-items-center" aria-busy="true" aria-label="Loading lesson">
      <div className="qf-card w-full max-w-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="skeleton h-8 w-24" />
          <div className="skeleton h-8 w-16" />
          <div className="flex-1" />
          <div className="skeleton h-8 w-12" />
        </div>
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
        <div className="flex justify-between items-center pt-2">
          <div className="skeleton h-12 w-24" />
          <div className="skeleton h-12 w-40" />
        </div>
      </div>
    </div>
  );
}
