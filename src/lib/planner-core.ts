export interface PlannerLessonNode {
  id: string;
  title: string;
  estMinutes: number;
  phaseId: string;
  moduleId: string;
  prereqs?: string[];
}

export interface PlanTask {
  week: number;
  day: number;
  kind: string;
  title: string;
  ref?: string;
  minutes: number;
}

export interface GeneratedPlan {
  tasks: PlanTask[];
  totalHours: number;
  weeks: number;
  note: string;
  feasibility: string;
}

const TRACK_PHASES: Record<string, string[]> = {
  A: ['ph7-portfolio', 'ph7-backtesting', 'ph8-time-series', 'ph8-statistics', 'ph10-data-infrastructure', 'ph2-databases', 'ph3-scientific-python'],
  B: ['ph7-fixed-income', 'ph7-options', 'ph9-pricing', 'ph1-stochastic-calculus', 'ph1-pde', 'ph7-risk'],
  C: ['ph4-cpp-l7', 'ph4-cpp-l8', 'ph10-low-latency', 'ph7-microstructure', 'ph2-computer-architecture'],
  D: ['ph8-statistics', 'ph8-time-series', 'ph8-ml', 'ph3-advanced-python', 'ph3-scientific-python', 'ph5-quant-algorithms'],
  E: ['ph2-distributed-systems', 'ph10-data-infrastructure', 'ph10-production-engineering', 'ph2-databases', 'ph2-networking'],
};

/** Topological ordering for client registry packs when server graph isn't loaded */
export function topoOrderLessons<T extends PlannerLessonNode>(items: T[]): T[] {
  const byId = new Map(items.map((l) => [l.id, l]));
  const visited = new Set<string>();
  const out: T[] = [];
  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const item = byId.get(id);
    if (!item) return;
    for (const p of item.prereqs ?? []) visit(p);
    out.push(item);
  };
  for (const item of items) visit(item.id);
  return out;
}

export function buildStudyPlan(
  orderedLessons: PlannerLessonNode[],
  opts: {
    hoursPerWeek: number;
    daysPerWeek: number;
    track: string;
    mode: string;
    targetDate?: string | null;
  },
): GeneratedPlan {
  const { hoursPerWeek, daysPerWeek, track, mode, targetDate } = opts;
  const priority = track === 'any' ? [] : (TRACK_PHASES[track] ?? []);

  const lessons = orderedLessons.filter(
    (n) =>
      priority.length === 0 ||
      n.phaseId.startsWith('ph1') ||
      n.phaseId.startsWith('ph0') ||
      n.phaseId.startsWith('ph2') ||
      n.phaseId.startsWith('ph3') ||
      n.phaseId.startsWith('ph4') ||
      n.phaseId.startsWith('ph5') ||
      priority.includes(n.moduleId),
  );

  const minutesByMode = mode === 'intensive' ? 75 : mode === 'balanced' ? 50 : 35;
  const minutesPerWeek = hoursPerWeek * 60;
  const sessionsPerWeek = Math.max(1, Math.min(daysPerWeek * 3, Math.round(minutesPerWeek / minutesByMode)));
  const practiceMinutes = sessionsPerWeek * minutesByMode * 0.25;
  const revisionMinutes = sessionsPerWeek * minutesByMode * 0.20;

  const tasks: PlanTask[] = [];
  let week = 1;
  const lessonQueue = [...lessons];
  let weekMinutes = 0;
  let day = 1;
  const bufferEvery = mode === 'flexible' ? 3 : mode === 'balanced' ? 4 : 6;

  const pushTask = (kind: string, title: string, ref: string | undefined, minutes: number) => {
    tasks.push({ week, day, kind, title, ref, minutes });
    weekMinutes += minutes;
    if (weekMinutes >= minutesPerWeek) {
      week++;
      weekMinutes = 0;
      day = 1;
    } else if (day % bufferEvery === 0 && kind !== 'buffer') {
      day++;
    } else {
      day++;
    }
  };

  let weeklyRotation = 0;
  while (lessonQueue.length > 0 && week <= 200) {
    const l = lessonQueue.shift()!;
    pushTask('lesson', l.title, l.id, l.estMinutes);
    weeklyRotation++;
    if (weeklyRotation % 2 === 0) {
      pushTask(
        'practice',
        'Problem practice (topic of the week)',
        undefined,
        Math.round(practiceMinutes / Math.max(1, sessionsPerWeek / 2)),
      );
    }
    if (weeklyRotation % 3 === 0) {
      pushTask('revision', 'Spaced revision session', undefined, Math.round(revisionMinutes));
    }
    if (weeklyRotation % 8 === 0) {
      pushTask('assessment', 'Weekly self-assessment', undefined, 30);
    }
  }

  const totalHours = Math.round(lessons.reduce((n, l) => n + l.estMinutes, 0) / 60);
  const weeks = week;
  const note =
    mode === 'intensive'
      ? 'Intensive mode front-loads lessons; expect to need the buffer days, consistency beats cramming.'
      : mode === 'balanced'
        ? 'Balanced mode interleaves lessons, practice and revision at a sustainable rate.'
        : 'Flexible mode keeps sessions short; the plan will take longer but survives busy weeks.';

  let feasibility = '';
  if (targetDate) {
    const days = Math.max(1, Math.round((new Date(targetDate).getTime() - Date.now()) / 86400_000));
    const weeksAvailable = days / 7;
    feasibility =
      weeksAvailable >= weeks
        ? `At ${hoursPerWeek}h/week the published curriculum needs about ${weeks} weeks, your ${days}-day window (${Math.round(weeksAvailable)} weeks) is feasible with margin.`
        : `Honest estimate: the published curriculum needs about ${weeks} weeks at ${hoursPerWeek}h/week; your ${days}-day window is not enough without cutting depth. Prefer extending the date or increasing hours.`;
  } else {
    feasibility = `At ${hoursPerWeek}h/week the published lessons alone need roughly ${weeks} weeks (${totalHours}h of lesson time, before practice and projects).`;
  }

  return { tasks, totalHours, weeks, note, feasibility };
}
