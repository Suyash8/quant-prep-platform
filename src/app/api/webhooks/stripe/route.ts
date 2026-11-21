import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function verifyStripeSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  let timestamp: number | null = null;
  const v1Sigs: string[] = [];

  for (const segment of header.split(',')) {
    const idx = segment.indexOf('=');
    if (idx === -1) continue;
    const key = segment.slice(0, idx).trim();
    const val = segment.slice(idx + 1).trim();
    if (key === 't') {
      const n = Number(val);
      if (Number.isFinite(n)) timestamp = n;
    } else if (key === 'v1' && val) {
      v1Sigs.push(val);
    }
  }

  if (timestamp === null || v1Sigs.length === 0) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  return v1Sigs.some((sig) => {
    try {
      const b = Buffer.from(sig, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

interface StripeEventPayload {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      client_reference_id?: string | null;
      metadata?: { userId?: string; plan?: string };
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
        // Accept both 'paid' and 'no_payment_required' (100%-off promo codes / free trials)
        if (
          obj.payment_status &&
          obj.payment_status !== 'paid' &&
          obj.payment_status !== 'no_payment_required'
        ) {
          return;
        }
        const userId = obj.metadata?.userId || obj.client_reference_id;
        if (!userId) return;
        const existing = await tx.user.findUnique({
          where: { id: userId },
          select: { plan: true },
        });
        if (!existing) return; // User deleted account before webhook arrived; avoid 500 retry storm
        const nextPlan = existing.plan === 'team' ? 'team' : 'pro';
        await tx.user.updateMany({
          where: { id: userId },
          data: {
            plan: nextPlan,
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
          const keepPaid = obj.status === 'active' || obj.status === 'trialing' || obj.status === 'past_due';
          if (keepPaid) {
            // Upgrade 'free' -> 'pro' without downgrading existing 'team' subscribers
            await tx.user.updateMany({
              where: { subscriptionId: obj.id, plan: 'free' },
              data: { plan: 'pro', planUpdatedAt: new Date() },
            });
          } else {
            await tx.user.updateMany({
              where: { subscriptionId: obj.id },
              data: { plan: 'free', planUpdatedAt: new Date() },
            });
          }
        }
      } else if (event.type === 'invoice.paid') {
        if (typeof obj.customer === 'string') {
          await tx.user.updateMany({
            where: { stripeCustomerId: obj.customer, plan: 'free' },
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
