import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { getCurrentUser, rateLimitShared } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/origin';
import { getAppOrigin } from '@/lib/site-url';
import { isPaidPlan } from '@/lib/entitlements';

const schema = z.object({
  interval: z.enum(['monthly', 'annual']).default('annual'),
});

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in first to manage your plan.' }, { status: 401 });
  }
  if (!user.emailVerifiedAt) {
    return NextResponse.json(
      { error: 'Please verify your email address in Settings before upgrading.' },
      { status: 403 },
    );
  }
  if (isPaidPlan(user) && user.subscriptionId) {
    return NextResponse.json(
      {
        error: 'You already have an active subscription. Use the Billing Portal to change or cancel your plan.',
        portalUrl: '/api/billing/portal',
      },
      { status: 409 },
    );
  }
  if (!(await rateLimitShared(`checkout:${user.id}`, 6, 0.1))) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid billing interval.' }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId =
    parsed.data.interval === 'monthly'
      ? process.env.STRIPE_PRICE_ID_MONTHLY
      : process.env.STRIPE_PRICE_ID_ANNUAL;

  if (!secretKey || !priceId) {
    return NextResponse.json({
      configured: false,
      contactUrl: '/contact?subject=Pro%20Access',
    });
  }

  const appUrl = getAppOrigin(req);
  const form = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${appUrl}/pricing?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    client_reference_id: user.id,
    customer_email: user.email,
    'metadata[userId]': user.id,
    'metadata[interval]': parsed.data.interval,
  });

  if (user.stripeCustomerId) {
    form.delete('customer_email');
    form.set('customer', user.stripeCustomerId);
  }

  const idemBucket = Math.floor(Date.now() / 30000);
  const idemKey = createHash('sha256')
    .update(`${user.id}:${parsed.data.interval}:${idemBucket}`)
    .digest('hex')
    .slice(0, 32);

  let stripeRes: Response;
  try {
    stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-11-20.acacia',
        'Idempotency-Key': idemKey,
      },
      body: form.toString(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to reach Stripe right now. Please try again in a moment.' },
      { status: 502 },
    );
  }

  const payload = (await stripeRes.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
  if (!stripeRes.ok || !payload.url) {
    return NextResponse.json(
      { error: payload.error?.message ?? 'Unable to initialize Stripe checkout.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ configured: true, url: payload.url });
}
