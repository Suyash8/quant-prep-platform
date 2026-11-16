import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function verifyStripeSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((segment) => {
      const idx = segment.indexOf('=');
      return idx === -1 ? [segment, ''] : [segment.slice(0, idx).trim(), segment.slice(idx + 1).trim()];
    }),
  );
  const timestamp = Number(parts.t);
  const sig = parts.v1;
  if (!Number.isFinite(timestamp) || !sig) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(sig, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

interface StripeEventPayload {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      client_reference_id?: string | null;
      metadata?: { userId?: string };
      customer?: string | null;
      subscription?: string | null;
      status?: string;
      payment_status?: string;
    };
  };
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

  let event: StripeEventPayload;
  try {
    event = JSON.parse(rawBody) as StripeEventPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!event.id || !event.type || !event.data?.object) {
    return NextResponse.json({ received: true });
  }

  const obj = event.data.object;

  try {
    await db.$transaction(async (tx) => {
      const seen = await tx.stripeEvent.createMany({
        data: [{ id: event.id!, type: event.type! }],
        skipDuplicates: true,
      });
      if (seen.count === 0) return;

      if (event.type === 'checkout.session.completed') {
        if (obj.payment_status && obj.payment_status !== 'paid') return;
        const userId = obj.metadata?.userId || obj.client_reference_id;
        if (!userId) return;
        await tx.user.update({
          where: { id: userId },
          data: {
            plan: 'pro',
            stripeCustomerId: typeof obj.customer === 'string' ? obj.customer : undefined,
            subscriptionId: typeof obj.subscription === 'string' ? obj.subscription : undefined,
            planUpdatedAt: new Date(),
          },
        });
      } else if (event.type === 'customer.subscription.deleted') {
        if (obj.id) {
          await tx.user.updateMany({
            where: { subscriptionId: obj.id },
            data: { plan: 'free', planUpdatedAt: new Date() },
          });
        }
      } else if (
        event.type === 'customer.subscription.updated' ||
        event.type === 'customer.subscription.created'
      ) {
        if (obj.id) {
          const keepPro = obj.status === 'active' || obj.status === 'trialing' || obj.status === 'past_due';
          await tx.user.updateMany({
            where: { subscriptionId: obj.id },
            data: { plan: keepPro ? 'pro' : 'free', planUpdatedAt: new Date() },
          });
        }
      } else if (event.type === 'invoice.paid') {
        if (typeof obj.customer === 'string') {
          await tx.user.updateMany({
            where: { stripeCustomerId: obj.customer },
            data: { plan: 'pro', planUpdatedAt: new Date() },
          });
        }
      } else if (event.type === 'invoice.payment_failed') {
        console.warn(`[stripe] Payment failed for customer=${obj.customer ?? 'unknown'}; keeping temporary grace.`);
      }
    });
  } catch (err) {
    // Return 500 so Stripe retries webhook delivery rather than dropping upgrades silently (C2)
    console.error('[stripe] Webhook processing failed:', err);
    return NextResponse.json({ error: 'Retry webhook' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
