import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getCurrentUser,
  currentSessionId,
  verifyPasswordAsync,
  hashPasswordAsync,
  destroySession,
  revokeOtherSessions,
} from '@/lib/auth';
import { assertSameOrigin } from '@/lib/origin';
import { db } from '@/lib/db';

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  dailyGoalXp: z.number().int().min(10).max(400).optional(),
  onboardingDone: z.boolean().optional(),
  targetTrack: z.string().trim().max(10).nullable().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
});

const deleteSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password to delete your account.'),
  confirm: z.literal('DELETE', { error: 'Type DELETE to confirm account deletion.' }),
});

async function cancelStripeSubscription(subscriptionId: string): Promise<boolean> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !subscriptionId) return true;
  try {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Stripe-Version': '2024-11-20.acacia',
      },
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || 'Invalid input.';
    return NextResponse.json({ error: issue }, { status: 400 });
  }

  const { name, timezone, dailyGoalXp, onboardingDone, targetTrack, currentPassword, newPassword } = parsed.data;
  const profilePatch: Record<string, unknown> = {};
  if (name) profilePatch.name = name;
  if (timezone) profilePatch.timezone = timezone;
  if (typeof dailyGoalXp === 'number') profilePatch.dailyGoalXp = dailyGoalXp;
  if (typeof onboardingDone === 'boolean') profilePatch.onboardingDone = onboardingDone;
  if (targetTrack !== undefined) profilePatch.targetTrack = targetTrack;

  if (newPassword || currentPassword) {
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both current password and new password are required.' }, { status: 400 });
    }
    const fullUser = await db.user.findUnique({ where: { id: user.id } });
    if (!fullUser || !(await verifyPasswordAsync(currentPassword, fullUser.passwordHash))) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }
    const newHash = await hashPasswordAsync(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { ...profilePatch, passwordHash: newHash },
    });
    // Revoke all other sessions on password change (B8)
    const keepId = await currentSessionId();
    const revokedCount = await revokeOtherSessions(user.id, keepId);
    return NextResponse.json({
      ok: true,
      message: `Password updated.${revokedCount > 0 ? ` Signed out ${revokedCount} other session(s).` : ''}`,
    });
  }

  if (Object.keys(profilePatch).length > 0) {
    await db.user.update({ where: { id: user.id }, data: profilePatch });
    return NextResponse.json({ ok: true, message: 'Settings updated.' });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Confirmation required.' }, { status: 400 });
  }

  const fullUser = await db.user.findUnique({ where: { id: user.id } });
  if (!fullUser || !(await verifyPasswordAsync(parsed.data.currentPassword, fullUser.passwordHash))) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  // Cancel any active Stripe subscription before erasing the account (B9)
  if (fullUser.subscriptionId) {
    const cancelled = await cancelStripeSubscription(fullUser.subscriptionId);
    if (!cancelled) {
      return NextResponse.json(
        { error: 'Could not cancel your active subscription with Stripe. Please retry or contact support before deleting.' },
        { status: 502 },
      );
    }
  }

  await db.$transaction(async (tx) => {
    await tx.contactMessage.deleteMany({ where: { OR: [{ userId: user.id }, { email: fullUser.email }] } });
    await tx.syncEvent.deleteMany({ where: { userId: user.id } });
    await tx.user.delete({ where: { id: user.id } });
  });
  await destroySession();

  return NextResponse.json({ ok: true, message: 'Account permanently deleted.' });
}
