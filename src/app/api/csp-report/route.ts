import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body === 'object') {
      console.warn('[csp-report]', JSON.stringify(body).slice(0, 1000));
    }
  } catch {
    /* ignore malformed report */
  }
  return new NextResponse(null, { status: 204 });
}
