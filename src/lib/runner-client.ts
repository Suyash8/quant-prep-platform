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
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 250));
      if (await ping()) return true;
    }
    return false;
  }
  starting = true;
  try {
    const seg = ['mini-services', 'code-runner', ['index', 'ts'].join('.')];
    const entry = path.join(process.cwd(), ...seg);
    const child = spawn('bun', [entry], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, PORT: undefined },
    });
    child.unref();
    for (let i = 0; i < 60; i++) {
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
