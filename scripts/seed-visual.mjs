// Seed visual@test.dev with realistic 3-weeks-in learner data so all pages render rich states.
// Postgres/Prisma version. Usage: DATABASE_URL=... node scripts/seed-visual.mjs
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const EMAIL = 'visual@test.dev';
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const daysAgo = (d, h = 0) => new Date(now - d * 864e5 - h * 36e5);

const user = await db.user.findUnique({ where: { email: EMAIL } });
if (!user) { console.error('user not found, register it first'); process.exit(1); }
const uid = user.id;

// wipe old seed data
await db.xpEvent.deleteMany({ where: { userId: uid } });
await db.session.deleteMany({ where: { userId: uid } });
await db.diagnosticResult.deleteMany({ where: { userId: uid } });
await db.lessonProgress.deleteMany({ where: { userId: uid } });
await db.assessmentAttempt.deleteMany({ where: { userId: uid } });
await db.problemAttempt.deleteMany({ where: { userId: uid } });
await db.cardState.deleteMany({ where: { userId: uid } });
await db.drillSession.deleteMany({ where: { userId: uid } });
await db.projectProgress.deleteMany({ where: { userId: uid } });
await db.note.deleteMany({ where: { userId: uid } });
await db.bookmark.deleteMany({ where: { userId: uid } });
await db.studyPlan.deleteMany({ where: { userId: uid } });
await db.learningSession.deleteMany({ where: { userId: uid } });
await db.application.deleteMany({ where: { userId: uid } });
await db.userSkill.deleteMany({ where: { userId: uid } });

// ---- user gamification state
await db.user.update({ where: { id: uid }, data: { xp: 1480, streakCount: 7, longestStreak: 9, lastStudyDate: daysAgo(0, 3), dailyGoalXp: 50 } });

// ---- lesson progress: phase-0 mastered/passed + first 5 arithmetic lessons
const p0 = ['orient-what-is-quant-finance', 'orient-quant-developer-role', 'orient-role-comparison',
  'orient-institution-landscape', 'orient-office-structure', 'orient-team-and-production'];
const p1 = ['arith-numbers-and-operations', 'arith-fractions-decimals', 'arith-percentages',
  'arith-powers-roots-logs', 'arith-estimation-mental-math'];
for (const [i, lid] of p0.entries()) {
  const mastered = i < 4;
  await db.lessonProgress.create({ data: {
    userId: uid, lessonId: lid, status: mastered ? 'mastered' : 'passed',
    kcBestPct: mastered ? 92.5 : 78.0, kcAttempts: mastered ? 2 : 1, exerciseDone: true, retrievalDone: true,
    secondsSpent: 900 + i * 120, updatedAt: daysAgo(21 - i), createdAt: daysAgo(21 - i),
  } });
}
for (const [i, lid] of p1.entries()) {
  const st = i < 3 ? 'passed' : i === 3 ? 'in_progress' : 'not_started';
  await db.lessonProgress.create({ data: {
    userId: uid, lessonId: lid, status: st,
    kcBestPct: i < 3 ? 85.0 : i === 3 ? 42.0 : 0, kcAttempts: i < 3 ? 2 : i === 3 ? 1 : 0,
    exerciseDone: i < 3, retrievalDone: i < 3, secondsSpent: 720 + i * 90,
    updatedAt: daysAgo(14 - i), createdAt: daysAgo(14 - i),
  } });
}

// ---- XP ledger (varied sources over 3 weeks)
const xp = [
  [18, 'lesson_pass', 'Orientation module lessons', 20], [18, 'lesson_pass', 'Orientation module lessons', 20],
  [17, 'lesson_pass', 'Orientation module lessons', 20], [17, 'lesson_pass', 'Orientation module lessons', 20],
  [16, 'lesson_master', 'Mastered orientation lessons', 15], [16, 'lesson_master', 'Mastered orientation lessons', 15],
  [15, 'drill', 'Multiplication drill L2', 30], [14, 'lesson_pass', 'Arithmetic lessons', 20],
  [14, 'exercise', 'Arithmetic exercises', 35], [13, 'drill', 'Percentages drill L1', 30],
  [12, 'lesson_pass', 'Arithmetic lessons', 20], [12, 'revision', 'Review session', 25],
  [11, 'problem', 'anagram-groups solved', 40], [10, 'lesson_master', 'Mastered arithmetic', 15],
  [10, 'drill', 'Mixed drill L3', 30], [9, 'assessment', 'Financial math assessment', 50],
  [8, 'lesson_pass', 'Fractions & decimals', 20], [7, 'streak_bonus', '7-day streak', 35],
  [6, 'drill', 'Squares drill L2', 30], [5, 'exercise', 'Percentage exercises', 35],
  [4, 'revision', 'Review session', 25], [3, 'lesson_pass', 'Powers, roots & logs', 20],
  [2, 'problem', 'fizz-buzz solved', 40], [1, 'drill', 'Estimation drill L2', 30],
  [0, 'lesson_pass', 'Estimation & mental math', 20], [0, 'streak_bonus', 'Daily streak', 10],
];
let total = 0;
for (const [d, src, detail, amt] of xp) {
  total += amt;
  await db.xpEvent.create({ data: { userId: uid, amount: amt, source: src, detail, createdAt: daysAgo(d, 2) } });
}
const diff = 1480 - total;
if (diff > 0) await db.xpEvent.create({ data: { userId: uid, amount: diff, source: 'backfill', detail: 'Earlier activity', createdAt: daysAgo(22) } });

// ---- diagnostic + assessment attempts
await db.diagnosticResult.create({ data: {
  userId: uid, assessmentId: 'apt-quantitative',
  areaScores: JSON.stringify({
    Arithmetic: { correct: 7, total: 9, pct: 78 },
    Algebra: { correct: 5, total: 8, pct: 62 },
    Probability: { correct: 4, total: 7, pct: 57 },
    Logic: { correct: 6, total: 6, pct: 100 },
  }), totalPct: 71.0, createdAt: daysAgo(16),
} });
await db.assessmentAttempt.create({ data: { userId: uid, assessmentId: 'apt-quantitative', kind: 'diagnostic', scorePct: 71.0, detail: '{}', startedAt: daysAgo(16, -1), submittedAt: daysAgo(16) } });
await db.assessmentAttempt.create({ data: { userId: uid, assessmentId: 'assess-financial-math', kind: 'assessment', scorePct: 74.0, detail: '{}', startedAt: daysAgo(9, -1), submittedAt: daysAgo(9) } });
await db.assessmentAttempt.create({ data: { userId: uid, assessmentId: 'assess-probability', kind: 'assessment', scorePct: 58.0, detail: '{}', startedAt: daysAgo(4, -1), submittedAt: daysAgo(4) } });

// ---- problem attempts
const probs = [
  ['anagram-groups', 'python', 'passed', 9, 9, 120, 11], ['fizz-buzz-sum', 'python', 'passed', 5, 5, 45, 2],
  ['two-sum', 'python', 'passed', 8, 8, 88, 6], ['moving-average', 'python', 'failed', 4, 7, 210, 4],
  ['max-drawdown', 'python', 'passed', 6, 6, 150, 7],
];
for (const [slug, lang, st, pt, tt, ms, d] of probs) {
  await db.problemAttempt.create({ data: { userId: uid, problemSlug: slug, language: lang, status: st, passedTests: pt, totalTests: tt, runtimeMs: ms, createdAt: daysAgo(d) } });
}

// ---- spaced repetition cards
const cards = [
  ['orient-what-is-quant-finance:0', 'lesson', 'What does a quantitative developer do?', 'Builds and maintains the systems that price, trade and risk financial products.', 2.5, 3, 0, 0, 3],
  ['orient-quant-developer-role:1', 'lesson', 'Front office vs middle office?', 'Front office = revenue-generating (trading); middle office = risk & control; back office = settlement.', 2.3, 2, 1, 0, 5],
  ['orient-institution-landscape:2', 'lesson', 'Name three classic quant employer categories', 'Banks, hedge funds, prop-trading firms / market makers.', 2.6, 4, 0, 0, 8],
  ['arith-numbers-and-operations:0', 'lesson', 'Operator precedence in C++ arithmetic', '*/% before +-, left-to-right within a level.', 2.1, 1, 1, 2, 0],
  ['arith-fractions-decimals:1', 'lesson', 'Converting 0.375 to a fraction', '3/8, decimal places give the denominator (10^3).', 2.4, 2, 0, 0, 2],
  ['arith-percentages:0', 'lesson', 'Percentage change vs percentage-point change', 'Relative change of a ratio vs absolute difference of percentages.', 2.0, 1, 0, 1, 0],
  ['arith-powers-roots-logs:2', 'lesson', 'log rules: log(a*b) = ?', 'log(a) + log(b), products become sums.', 2.5, 2, 0, 0, 4],
  ['arith-estimation-mental-math:0', 'lesson', 'Estimation: 49*52 = ?', '~2500, round to 50*50 then adjust.', 1.8, 0, 1, 3, 0],
  ['quiz:arith-percentages:q2', 'quiz_miss', 'If a price rises 20% then falls 20%, net change?', '-4%, multiplicative, not additive.', 2.2, 1, 0, 0, 1],
  ['quiz:orient-role-comparison:q1', 'quiz_miss', 'Which role is closest to software engineering?', 'Quant developer, systems, latency, tooling.', 2.3, 2, 0, 0, 6],
];
for (const [key, src, front, back, ease, iv, reps, lapses, dueDays] of cards) {
  await db.cardState.create({ data: {
    userId: uid, cardKey: key, source: src, front, back, cardType: 'concept', ease,
    intervalDays: iv, repetitions: reps, lapses, dueAt: dueDays > 0 ? new Date(now + dueDays * 864e5) : daysAgo(0, 1),
    lastGrade: reps ? 3 : 0, lastReviewedAt: daysAgo(Math.min(reps + 1, 6)),
  } });
}

// ---- drill sessions
const drills = [
  ['multiplication', 2, 18, 20, 1450, 120, 5], ['percentages', 1, 16, 20, 2100, 120, 4],
  ['mixed', 3, 22, 25, 1650, 150, 3], ['squares', 2, 14, 15, 1300, 90, 2],
  ['addition', 1, 19, 20, 1800, 120, 6], ['fractions', 2, 12, 15, 2400, 120, 1],
];
for (const [mode, lvl, c, t, avg, dur, d] of drills) {
  await db.drillSession.create({ data: { userId: uid, mode, level: lvl, correct: c, total: t, avgMs: avg, durationS: dur, createdAt: daysAgo(d) } });
}

// ---- projects
await db.projectProgress.create({ data: { userId: uid, projectSlug: 'math-foundations-toolkit', status: 'in_progress', milestonesDone: 3, notes: 'CLI skeleton + fraction class done. Decimal precision tests next, watch the 1e-9 edge case.', updatedAt: daysAgo(2) } });
await db.projectProgress.create({ data: { userId: uid, projectSlug: 'log-processor', status: 'completed', milestonesDone: 5, notes: 'Shipped. Regex parser ended up 4x faster after switching to a single pass.', updatedAt: daysAgo(11) } });
await db.projectProgress.create({ data: { userId: uid, projectSlug: 'market-data-analysis', status: 'in_progress', milestonesDone: 1, notes: 'Just started, loading the CSV schema.', updatedAt: daysAgo(5) } });

// ---- notes + bookmarks
await db.note.create({ data: { userId: uid, lessonId: 'arith-powers-roots-logs', body: 'Keep forgetting log(a/b) = log a - log b. Drill this. Also: ln is natural log (base e), lg is base 2 in some texts, base 10 in others, check context.', updatedAt: daysAgo(3) } });
await db.bookmark.create({ data: { userId: uid, targetType: 'lesson', targetId: 'arith-percentages', createdAt: daysAgo(6) } });
await db.bookmark.create({ data: { userId: uid, targetType: 'problem', targetId: 'moving-average', createdAt: daysAgo(4) } });

// ---- study plan (must match the Plan contract: {tasks:[{week,day,kind,title,ref,minutes}],weeks,totalHours,note,feasibility})
const planTaskDefs = [
  // week 1
  [1, 1, 'lesson', 'Estimation & mental math', 'arith-estimation-mental-math', 45],
  [1, 1, 'drill', 'Multiplication drill L2', 'multiplication', 10],
  [1, 2, 'lesson', 'Number properties', 'arith-number-properties', 40],
  [1, 3, 'revision', 'Review due cards', 'due-cards', 15],
  [1, 4, 'lesson', 'Variables & expressions', 'prealg-variables-expressions', 45],
  [1, 5, 'drill', 'Mixed drill L3', 'mixed', 15],
  [1, 5, 'assessment', 'Financial math check', 'assess-financial-math', 30],
  // week 2
  [2, 6, 'lesson', 'Solving linear equations', 'prealg-solving-linear', 45],
  [2, 7, 'practice', 'anagram groups', 'anagram-groups', 35],
  [2, 8, 'lesson', 'Inequalities basics', 'prealg-inequalities', 40],
  [2, 9, 'revision', 'Review due cards', 'due-cards', 15],
  [2, 10, 'drill', 'Fractions drill L2', 'fractions', 15],
  // week 3
  [3, 11, 'lesson', 'Ratios and proportions', 'prealg-ratios', 45],
  [3, 12, 'practice', 'two sum', 'two-sum', 30],
  [3, 13, 'buffer', 'Catch-up buffer', undefined, 30],
  [3, 14, 'lesson', 'Sequences intro', 'algebra-sequences', 45],
  [3, 15, 'assessment', 'Probability retake', 'assess-probability', 30],
  // week 4
  [4, 16, 'lesson', 'Functions and graphs', 'algebra-functions', 45],
  [4, 17, 'drill', 'Squares drill L2', 'squares', 15],
  [4, 18, 'revision', 'Review due cards', 'due-cards', 20],
  [4, 19, 'lesson', 'Exponentials & logs in finance', 'algebra-exponentials', 45],
  [4, 20, 'practice', 'moving average', 'moving-average', 35],
];
const planTasks = planTaskDefs.map(([week, day, kind, title, ref, minutes]) => ({ week, day, kind, title, ref, minutes }));
const totalMinutes = planTasks.reduce((n, t) => n + t.minutes, 0);
await db.studyPlan.create({ data: {
  userId: uid,
  config: JSON.stringify({ hoursPerWeek: 6, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], track: 'quant-analyst', targetDate: new Date(now + 90 * 864e5).toISOString().slice(0, 10), mode: 'structured' }),
  tasks: JSON.stringify({
    tasks: planTasks,
    weeks: 4,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    note: 'Built from the prerequisite graph with one buffer day per fortnight.',
    feasibility: 'Comfortable at 6 h/week, finish core Phase 1 in about a month.',
  }),
  createdAt: daysAgo(9), updatedAt: daysAgo(1),
} });

// ---- learning sessions (analytics charts need 2+ weeks of data)
let seed = 42;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const kinds = { lesson: 0.4, practice: 0.2, revision: 0.2, drills: 0.15, assessment: 0.05 };
const baseSecs = { lesson: 2400, practice: 1500, revision: 900, drills: 600, assessment: 1800 };
for (let d = 20; d >= 0; d--) {
  if (d > 7 && rnd() < 0.25) continue;
  const n = [1, 2, 2, 3][Math.floor(rnd() * 4)];
  for (let i = 0; i < n; i++) {
    let r = rnd(), acc = 0, kind = 'lesson';
    for (const [k, p] of Object.entries(kinds)) { acc += p; if (r <= acc) { kind = k; break; } }
    const secs = Math.floor(baseSecs[kind] * (0.5 + rnd() * 0.9));
    const day = new Date(now - d * 864e5).toISOString().slice(0, 10);
    await db.learningSession.create({ data: { userId: uid, kind, seconds: secs, day, createdAt: daysAgo(d, 1 + Math.floor(rnd() * 20)) } });
  }
}

// ---- applications
const apps = [
  ['Jane Street', 'Quantitative Developer - Internship', 'interview', 'Final round scheduled: probability + systems. Review order book basics.', 6],
  ['Citadel Securities', 'Software Engineer, Trading Systems', 'applied', 'Applied via referral. OA should arrive within 2 weeks.', 12],
  ['IMC Trading', 'Graduate Quant Developer', 'oa', 'OA done, mental math section felt strong.', 3],
  ['Bloomberg', 'Financial Software Engineer', 'planned', 'Plan to apply after finishing the C++ modules.', 1],
];
for (const [company, role, st, note, d] of apps) {
  await db.application.create({ data: { userId: uid, company, role, status: st, note, updatedAt: daysAgo(d) } });
}

// ---- skills
const skills = [['arithmetic', 0.82], ['mental-math', 0.74], ['fractions', 0.68], ['percentages', 0.61],
  ['powers-roots-logs', 0.45], ['estimation', 0.38], ['algebra', 0.22], ['probability', 0.18],
  ['python', 0.55], ['cpp', 0.12]];
for (const [skill, level] of skills) {
  await db.userSkill.create({ data: { userId: uid, skill, level, updatedAt: daysAgo(1) } });
}

const counts = {
  lessonProgress: await db.lessonProgress.count({ where: { userId: uid } }),
  xpEvent: await db.xpEvent.count({ where: { userId: uid } }),
  cardState: await db.cardState.count({ where: { userId: uid } }),
  learningSession: await db.learningSession.count({ where: { userId: uid } }),
  application: await db.application.count({ where: { userId: uid } }),
};
console.log(JSON.stringify(counts));
console.log('SEEDED OK');
await db.$disconnect();
