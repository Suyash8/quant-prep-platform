import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/auth';
import { clientIp } from '@/lib/client-ip';

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`csp:${ip}`, 10, 0.2)) {
    return new NextResponse(null, { status: 204 });
  }
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > 16_384) {
    return new NextResponse(null, { status: 204 });
  }
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
