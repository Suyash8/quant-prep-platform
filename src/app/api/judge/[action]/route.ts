import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimitShared } from '@/lib/auth';
import { getProblem } from '@/lib/content';
import { runnerPost, judgeRuntimeStatus } from '@/lib/runner-client';
import { db } from '@/lib/db';
import { awardXp, XP_TABLE } from '@/lib/gamification';
import { can } from '@/lib/entitlements';
import { assertSameOrigin } from '@/lib/origin';

export const maxDuration = 60;

const submitSchema = z.object({
  slug: z.string().min(1).max(120),
  language: z.enum(['cpp17', 'cpp20', 'python', 'sql']),
  code: z.string().min(1).max(131072),
});

const runSchema = submitSchema.extend({ stdin: z.string().max(65536).default('') });

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const { action } = await ctx.params;
  if (!['submit', 'run'].includes(action)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to run code.' }, { status: 401 });
  if (!(await rateLimitShared(`judge:${user.id}`, 12, 0.25))) {
    return NextResponse.json({ error: 'Rate limit: you are submitting too fast. Wait a moment.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = (action === 'submit' ? submitSchema : runSchema).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { slug, language, code } = parsed.data;

  const problem = getProblem(slug);
  if (!problem) return NextResponse.json({ error: 'Unknown problem.' }, { status: 404 });

  if (!can(user, 'runner', { slug: problem.slug })) {
    return NextResponse.json(
      { error: 'Upgrade to Pro to run code on all 78 problems (Free includes 10 starter challenges).' },
      { status: 403 },
    );
  }

  if (language === 'sql') {
    return NextResponse.json(
      { error: 'SQL execution is not enabled — C++17, C++20 and Python 3 are supported.' },
      { status: 400 },
    );
  }

  // Fail-closed gate: nothing runs unless the runner is isolated on a supported toolchain.
  {
    const rt = await judgeRuntimeStatus();
    if (!rt.ok) {
      return NextResponse.json(
        {
          state: 'runtime-unavailable',
          error: 'Code execution is not available right now. Nothing was run or judged and this is not counted as incorrect.',
          reason: rt.reason,
        },
        { status: 503 },
      );
    }
  }

  try {
    if (action === 'run') {
      const { stdin } = parsed.data as z.infer<typeof runSchema>;
      const out = await runnerPost<Record<string, unknown>>('/run', {
        language,
        code,
        stdin,
        timeLimitMs: Math.max(problem.timeLimitMs, 4000),
        memoryLimitMb: problem.memoryLimitMb,
      });
      return NextResponse.json(out);
    }

    // If runner mounts problem tests (QF_PROBLEMS_DIR), avoid serializing multi-MB test payloads over HTTP (F2)
    const runnerHasTests = process.env.CODE_RUNNER_HAS_TESTS === '1';
    const out = await runnerPost<Record<string, unknown>>('/submit', {
      slug: problem.slug,
      language,
      code,
      ...(runnerHasTests
        ? {}
        : { tests: problem.tests.map((t) => ({ input: t.input, expected: t.expected, hidden: !!t.hidden })) }),
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
    });

    const verdict = (out as { verdict?: string }).verdict;
    const runtimeMs = (out as { totalMs?: number }).totalMs ?? 0;
    const status =
      verdict === 'passed'
        ? 'passed'
        : verdict === 'compile_error'
          ? 'compile_error'
          : verdict === 'timeout'
            ? 'timeout'
            : verdict === 'output_limit'
              ? 'output_limit'
              : verdict === 'runtime_error'
                ? 'runtime_error'
                : 'failed';

    await db.problemAttempt.create({
      data: {
        userId: user.id,
        problemSlug: problem.slug,
        language,
        status,
        passedTests: (out as { passed?: number }).passed ?? 0,
        totalTests: problem.tests.length,
        runtimeMs: Math.round(runtimeMs),
      },
    });

    let xpAwarded = 0;
    if (verdict === 'passed') {
      const award = await awardXp(
        user.id,
        XP_TABLE.problemPass,
        'problem',
        problem.title,
        undefined,
        problem.slug,
      ).catch(() => null);
      xpAwarded = award?.amount ?? 0;
    }
    return NextResponse.json({ ...out, xpAwarded });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (!msg.startsWith('RUNNER_UNAVAILABLE')) console.error('[judge] runner failure:', msg);
    if (msg.startsWith('RUNNER_UNAVAILABLE')) {
      return NextResponse.json(
        { error: 'The code runner service is unavailable right now. Draft saved locally.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Runner failure. If this persists, try again shortly.' }, { status: 500 });
  }
}
