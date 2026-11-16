import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Shallow liveness endpoint for load balancers (B13). */
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
