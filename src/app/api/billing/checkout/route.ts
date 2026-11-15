import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, rateLimit } from '@/lib/auth';

const schema = z.object({
  interval: z.enum(['monthly', 'annual']).default('annual'),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in first to manage your plan.' }, { status: 401 });
  }
  if (!rateLimit(`checkout:${user.id}`, 6, 0.1)) {
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

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '');
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

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const payload = (await stripeRes.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
  if (!stripeRes.ok || !payload.url) {
    return NextResponse.json(
      { error: payload.error?.message ?? 'Unable to initialize Stripe checkout.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ configured: true, url: payload.url });
}
