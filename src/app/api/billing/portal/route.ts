import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, rateLimitShared } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/origin';

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!(await rateLimitShared(`portal:${user.id}`, 6, 0.1))) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !user.stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe customer record is active for your account.' }, { status: 400 });
  }

  const returnUrl = `${(process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '')}/pricing`;
  const form = new URLSearchParams({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  });

  const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-11-20.acacia',
    },
    body: form.toString(),
  });

  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) {
    return NextResponse.json({ error: data.error?.message ?? 'Could not open billing portal.' }, { status: 502 });
  }
  return NextResponse.json({ url: data.url });
}
