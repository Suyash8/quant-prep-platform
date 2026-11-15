import { Planner } from '@/components/planner-view';
import { CalendarDays } from 'lucide-react';

export const metadata = { title: 'Study Planner. QuantFoundry' };

export default function PlannerPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero anim-slide-up">
        <span className="icon-tile icon-tile-info"><CalendarDays /></span>
        <div>
          <h1>Study planner</h1>
          <p className="page-sub">A weekly plan that fits your life</p>
        </div>
      </header>
      <p className="-mt-2.5 mb-6 max-w-3xl text-[15px] text-muted font-semibold leading-relaxed anim-slide-up">
        A realistic schedule built from your constraints and the prerequisite graph, lessons, practice, revision,
        weekly self-assessments and buffer days. Regenerate any time; progress is never lost.
      </p>
      <Planner />
    </div>
  );
}
