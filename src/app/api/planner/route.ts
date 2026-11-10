import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getCurriculumGraph, getRegistry } from '@/lib/content';

const schema = z.object({
  hoursPerWeek: z.number().min(1).max(80),
  daysPerWeek: z.number().int().min(1).max(7),
  track: z.enum(['A', 'B', 'C', 'D', 'E', 'any']),
  mode: z.enum(['intensive', 'balanced', 'flexible']),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

interface PlanTask { week: number; day: number; kind: string; title: string; ref?: string; minutes: number }

function planTasks(hoursPerWeek: number, daysPerWeek: number, track: string, mode: string): { tasks: PlanTask[]; totalHours: number; weeks: number; note: string } {
  const graph = getCurriculumGraph();
  const reg = getRegistry();
  const publishedIds = new Set(reg.lessons.map(l => l.id));

  // topo order restricted to track-relevant published lessons (foundation phases always)


  const trackPhases: Record<string, string[]> = {
    A: ['ph7-portfolio', 'ph7-backtesting', 'ph8-time-series', 'ph8-statistics', 'ph10-data-infrastructure', 'ph2-databases', 'ph3-scientific-python'],
    B: ['ph7-fixed-income', 'ph7-options', 'ph9-pricing', 'ph1-stochastic-calculus', 'ph1-pde', 'ph7-risk'],
    C: ['ph4-cpp-l7', 'ph4-cpp-l8', 'ph10-low-latency', 'ph7-microstructure', 'ph2-computer-architecture'],
    D: ['ph8-statistics', 'ph8-time-series', 'ph8-ml', 'ph3-advanced-python', 'ph3-scientific-python', 'ph5-quant-algorithms'],
    E: ['ph2-distributed-systems', 'ph10-data-infrastructure', 'ph10-production-engineering', 'ph2-databases', 'ph2-networking'],
  };
  const priority = track === 'any' ? [] : (trackPhases[track] ?? []);

  const lessons = graph.order
    .filter(id => publishedIds.has(id))
    .map(id => graph.byId.get(id)!)
    .filter(n => n && (priority.length === 0 || n.phaseId.startsWith('ph1') || n.phaseId.startsWith('ph0') || n.phaseId.startsWith('ph2') || n.phaseId.startsWith('ph3') || n.phaseId.startsWith('ph4') || n.phaseId.startsWith('ph5') || priority.includes(n.moduleId)));

  const minutesByMode = mode === 'intensive' ? 75 : mode === 'balanced' ? 50 : 35;
  const minutesPerWeek = hoursPerWeek * 60;
  const minutesPerSession = minutesByMode;
  const sessionsPerWeek = Math.max(1, Math.min(daysPerWeek * 3, Math.round(minutesPerWeek / minutesPerSession)));
  const lessonMinutes = sessionsPerWeek * minutesPerSession * 0.55;
  const practiceMinutes = sessionsPerWeek * minutesPerSession * 0.25;
  const revisionMinutes = sessionsPerWeek * minutesPerSession * 0.20;

  const tasks: PlanTask[] = [];
  let week = 1, lessonQueue = [...lessons], weekMinutes = 0, day = 1;
  let bufferEvery = mode === 'flexible' ? 3 : mode === 'balanced' ? 4 : 6; // buffer day every N days



  const pushTask = (kind: string, title: string, ref: string | undefined, minutes: number) => {
    tasks.push({ week, day, kind, title, ref, minutes });
    weekMinutes += minutes;
    if (weekMinutes >= minutesPerWeek) { week++; weekMinutes = 0; day = 1; }
    else if (day % bufferEvery === 0 && kind !== 'buffer') {
      // insert buffer marker occasionally


      day++;
    } else {
      day++;
    }
  };

  let weeklyRotation = 0;
  while (lessonQueue.length > 0 && week <= 200) {
    const l = lessonQueue.shift()!;
    pushTask('lesson', l.title, l.id, l.estMinutes);
    // practice session


    weeklyRotation++;
    if (weeklyRotation % 2 === 0) pushTask('practice', 'Problem practice (topic of the week)', undefined, Math.round(practiceMinutes / (sessionsPerWeek / 2)));
    if (weeklyRotation % 3 === 0) pushTask('revision', 'Spaced revision session', undefined, Math.round(revisionMinutes));
    if (weeklyRotation % 8 === 0) pushTask('assessment', 'Weekly self-assessment', undefined, 30);
  }

  const totalHours = Math.round(lessons.reduce((n, l) => n + l.estMinutes, 0) / 60);
  const weeks = week;
  const note =
    mode === 'intensive'
      ? 'Intensive mode front-loads lessons; expect to need the buffer days, consistency beats cramming.'
      : mode === 'balanced'
        ? 'Balanced mode interleaves lessons, practice and revision at a sustainable rate.'
        : 'Flexible mode keeps sessions short; the plan will take longer but survives busy weeks.';

  return { tasks, totalHours, weeks, note };
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid plan configuration.' }, { status: 400 });
  const { hoursPerWeek, daysPerWeek, track, mode, targetDate } = parsed.data;

  const { tasks, totalHours, weeks, note } = planTasks(hoursPerWeek, daysPerWeek, track, mode);

  let feasibility = '';
  if (targetDate) {
    const days = Math.max(1, Math.round((new Date(targetDate).getTime() - Date.now()) / 86400_000));
    const weeksAvailable = days / 7;
    feasibility = weeksAvailable >= weeks
      ? `At ${hoursPerWeek}h/week the published curriculum needs about ${weeks} weeks, your ${days}-day window (${Math.round(weeksAvailable)} weeks) is feasible with margin.`
      : `Honest estimate: the published curriculum needs about ${weeks} weeks at ${hoursPerWeek}h/week; your ${days}-day window is not enough without cutting depth. Prefer extending the date or increasing hours.`;
  } else {
    feasibility = `At ${hoursPerWeek}h/week the published lessons alone need roughly ${weeks} weeks (${totalHours}h of lesson time, before practice and projects).`;
  }

  const plan = await db.studyPlan.create({
    data: {
      userId: user.id,
      config: JSON.stringify({ hoursPerWeek, daysPerWeek, track, mode, targetDate: targetDate ?? null }),
      tasks: JSON.stringify({ tasks, weeks, totalHours, note, feasibility }),
    },
  });
  return NextResponse.json({ ok: true, plan: JSON.parse(plan.tasks), id: plan.id });
}
