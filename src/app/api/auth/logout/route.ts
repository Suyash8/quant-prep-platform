import { NextResponse } from 'next/server';
import { destroySessionFor } from '@/lib/auth';

/** Body: { tag: string } ends only that session; { confirmCurrent: true } ends the session this browser holds now (explicit user action); anything else ends nothing. See destroySessionFor. */
export async function POST(req: Request) {
  let tag: string | undefined; let confirmCurrent = false;
  try { const b = (await req.json()) as { tag?: unknown; confirmCurrent?: unknown }; if (typeof b.tag === 'string' && b.tag) tag = b.tag.slice(0, 64); confirmCurrent = b.confirmCurrent === true; } catch { /* no body */ }
  const r = await destroySessionFor({ tag, confirmCurrent });
  return NextResponse.json({ ok: true, result: r });
}
