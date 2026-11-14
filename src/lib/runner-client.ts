/**
 * Runner client used by Next.js API routes.
 * Ensures the code-runner mini-service is up (spawns it if needed) and proxies jobs.
 *
 * On serverless hosts (Vercel) there is no long-lived local process to spawn, so the
 * runner is disabled unless CODE_RUNNER_URL points at an external deployment. Set
 * CODE_RUNNER_URL in the hosting provider's env vars to re-enable code execution.
 */
import 'server-only';
import { spawn } from 'node:child_process';
import path from 'node:path';

const RUNNER_URL = process.env.CODE_RUNNER_URL ?? 'http://127.0.0.1:3010';
const IS_SERVERLESS = process.env.VERCEL === '1';
let starting = false;

async function ping(): Promise<boolean> {
  try {
    const res = await fetch(`${RUNNER_URL}/health`, { signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ensureRunner(): Promise<boolean> {
  if (await ping()) return true;
  // Serverless: we cannot spawn the mini-service; only an external CODE_RUNNER_URL works.


  if (IS_SERVERLESS) return false;
  if (starting) {
    // Bounded wait: 40 iterations x a 1.2 s ping could otherwise hold a request for ~58 s against a hung runner.
    const waitDeadline = Date.now() + 12_000;
    while (Date.now() < waitDeadline) {
      await new Promise(r => setTimeout(r, 250));
      if (await ping()) return true;
    }
    return false;
  }
  starting = true;
  try {
    const seg = ['mini-services', 'code-runner', ['index', 'ts'].join('.')];
    const entry = path.join(/*turbopackIgnore: true*/ process.cwd(), ...seg);
    const child = spawn('bun', [entry], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, PORT: undefined },
    });
    child.unref();
    // Bounded wait: 60 iterations x a 1.2 s ping could otherwise hold a request for ~87 s against a hung runner. Normal warmup answers in ~1-3 s.
    const spawnDeadline = Date.now() + 12_000;
    while (Date.now() < spawnDeadline) {
      await new Promise(r => setTimeout(r, 250));
      if (await ping()) return true;
    }
    return false;
  } finally {
    starting = false;
  }
}

export async function runnerPost<T>(endpoint: '/submit' | '/run', body: unknown): Promise<T> {
  const ok = await ensureRunner();
  if (!ok) throw new Error('RUNNER_UNAVAILABLE');
  const res = await fetch(`${RUNNER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`RUNNER_ERROR:${res.status}:${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/** The judge may run learners' code only on an ISOLATED runner on a supported toolchain. FAIL CLOSED: if the runner cannot be reached or does not say so, nothing is judged.
 *  Production needs sandbox.active and Python >= 3.12 / g++ >= 12.4 (the qualification baseline). QF_V5_CODE_DEV=1 (development and tests only) waives both. Cached for 5 s. */
let rtCache: { at: number; v: { ok: boolean; reason?: string } } | null = null;
export async function judgeRuntimeStatus(): Promise<{ ok: boolean; reason?: string }> {
  if (rtCache && Date.now() - rtCache.at < 5000) return rtCache.v;
  let v: { ok: boolean; reason?: string };
  if (process.env.QF_V5_CODE_DEV === '1') v = { ok: true };
  else if (!(await ensureRunner())) v = { ok: false, reason: 'The code runner is not running.' };
  else {
    try {
      const h = (await (await fetch(`${RUNNER_URL}/health`, { signal: AbortSignal.timeout(2500) })).json()) as { sandbox?: { active?: boolean }; toolchain?: { pythonMeetsBaseline?: boolean; gppMeetsBaseline?: boolean } };
      if (h.sandbox?.active !== true) v = { ok: false, reason: 'The code runner is not isolated on this machine (bubblewrap sandbox unavailable), so code is not run.' };
      else if (h.toolchain?.pythonMeetsBaseline !== true || h.toolchain?.gppMeetsBaseline !== true) v = { ok: false, reason: 'The runner toolchain is below Python 3.12 / g++ 12.4, so code is not judged. Point PYTHON_BIN and CXX_BIN at supported versions.' };
      else v = { ok: true };
    } catch { v = { ok: false, reason: 'The code runner could not be checked.' }; }
  }
  rtCache = { at: Date.now(), v }; return v;
}
