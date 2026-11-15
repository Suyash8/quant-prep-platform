import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function verifyStripeSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(',').map(segment => {
      const idx = segment.indexOf('=');
      return idx === -1 ? [segment, ''] : [segment.slice(0, idx).trim(), segment.slice(idx + 1).trim()];
    }),
  );
  const timestamp = Number(parts.t);
  const sig = parts.v1;
  if (!Number.isFinite(timestamp) || !sig) return false;
  // Reject stale replay signatures older than 5 minutes
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(sig, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Stripe webhook secret not configured.' }, { status: 503 });
  }

  const rawBody = await req.text();
  if (!verifyStripeSignature(rawBody, req.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    type?: string;
    data?: {
      object?: {
        id?: string;
        client_reference_id?: string | null;
        metadata?: { userId?: string };
        customer?: string | null;
        subscription?: string | null;
        status?: string;
      };
    };
  };

  const obj = event.data?.object;
  if (!obj) {
    return NextResponse.json({ received: true });
  }

  if (event.type === 'checkout.session.completed') {
    const userId = obj.metadata?.userId || obj.client_reference_id;
    if (userId) {
      await db.user.update({
        where: { id: userId },
        data: {
          plan: 'pro',
          stripeCustomerId: typeof obj.customer === 'string' ? obj.customer : undefined,
          subscriptionId: typeof obj.subscription === 'string' ? obj.subscription : undefined,
          planUpdatedAt: new Date(),
        },
      }).catch(() => undefined);
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const subId = obj.id;
    if (subId) {
      await db.user.updateMany({
        where: { subscriptionId: subId },
        data: { plan: 'free', planUpdatedAt: new Date() },
      });
    }
  } else if (event.type === 'customer.subscription.updated') {
    const subId = obj.id;
    const active = obj.status === 'active' || obj.status === 'trialing';
    if (subId) {
      await db.user.updateMany({
        where: { subscriptionId: subId },
        data: { plan: active ? 'pro' : 'free', planUpdatedAt: new Date() },
      });
    }
  }

  return NextResponse.json({ received: true });
}
