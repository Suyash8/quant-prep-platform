import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimit } from '@/lib/auth';
import { getProblem } from '@/lib/content';
import { runnerPost, judgeRuntimeStatus } from '@/lib/runner-client';
import { db } from '@/lib/db';
import { awardXp, XP_TABLE } from '@/lib/gamification';

const submitSchema = z.object({
  slug: z.string().min(1),
  language: z.enum(['cpp17', 'cpp20', 'python', 'sql']),
  code: z.string().min(1).max(131072),
});

const runSchema = submitSchema.extend({ stdin: z.string().max(65536).default('') });

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (!['submit', 'run'].includes(action)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to run code.' }, { status: 401 });
  if (!rateLimit(`judge:${user.id}`, 12, 0.25)) {
    return NextResponse.json({ error: 'Rate limit: you are submitting too fast. Wait a moment.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = (action === 'submit' ? submitSchema : runSchema).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { slug, language, code } = parsed.data;

  const problem = getProblem(slug);
  if (!problem) return NextResponse.json({ error: 'Unknown problem.' }, { status: 404 });

  // Fail-closed gate: nothing runs unless the runner is isolated on a supported toolchain.
  { const rt = await judgeRuntimeStatus(); if (!rt.ok) return NextResponse.json({ state: 'runtime-unavailable', error: 'Code execution is not available right now. Nothing was run or judged and this is not counted as incorrect.', reason: rt.reason }, { status: 503 }); }

  if (language === 'sql') {
    return NextResponse.json({ error: 'SQL execution is not enabled in this deployment - C++17, C++20 and Python 3 are fully supported.' }, { status: 400 });
  }

  try {
    if (action === 'run') {
      const { stdin } = parsed.data as z.infer<typeof runSchema>;
      const out = await runnerPost<Record<string, unknown>>('/run', {
        language, code, stdin,
        timeLimitMs: Math.max(problem.timeLimitMs, 4000),
        memoryLimitMb: problem.memoryLimitMb,
      });
      return NextResponse.json(out);
    }
    // submit: server supplies the tests - client never sends expected outputs


    const out = await runnerPost<Record<string, unknown>>('/submit', {
      language, code,
      tests: problem.tests.map(t => ({ input: t.input, expected: t.expected, hidden: !!t.hidden })),
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
    });
    const verdict = (out as { verdict?: string }).verdict;
    await db.problemAttempt.create({
      data: {
        userId: user.id,
        problemSlug: slug,
        language,
        status: verdict === 'passed' ? 'passed' : verdict === 'compile_error' ? 'compile_error' : verdict === 'timeout' ? 'timeout' : verdict === 'runtime_error' ? 'runtime_error' : 'failed',
        passedTests: (out as { passed?: number }).passed ?? 0,
        totalTests: problem.tests.length,
      },
    });
    // Gamification: full XP on the first solve of a problem only.


    let xpAwarded = 0;
    if (verdict === 'passed') {
      const passedCount = await db.problemAttempt.count({
        where: { userId: user.id, problemSlug: slug, status: 'passed' },
      });
      if (passedCount <= 1) {
        const award = await awardXp(user.id, XP_TABLE.problemPass, 'problem', problem.title).catch(() => null);
        xpAwarded = award?.amount ?? 0;
      }
    }
    return NextResponse.json({ ...out, xpAwarded });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (!msg.startsWith('RUNNER_UNAVAILABLE')) console.error('[judge] runner failure:', msg);
    if (msg.startsWith('RUNNER_UNAVAILABLE')) {
      if (process.env.VERCEL === '1') {
        return NextResponse.json({ error: 'Code execution is not available on this serverless deployment yet. Lessons, quizzes and everything else work normally, run code locally or point CODE_RUNNER_URL at a runner host.' }, { status: 503 });
      }
      return NextResponse.json({ error: 'The code runner service is starting up - try again in a few seconds.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Runner failure. If this persists, restart the application.' }, { status: 500 });
  }
}
