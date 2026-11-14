import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, verifyPassword, hashPassword, destroySession } from '@/lib/auth';
import { db } from '@/lib/db';

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || 'Invalid input.';
    return NextResponse.json({ error: issue }, { status: 400 });
  }

  const { name, currentPassword, newPassword } = parsed.data;

  // Handle password update if requested
  if (newPassword || currentPassword) {
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both current password and new password are required to change password.' }, { status: 400 });
    }
    const fullUser = await db.user.findUnique({ where: { id: user.id } });
    if (!fullUser || !verifyPassword(currentPassword, fullUser.passwordHash)) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }
    const newHash = hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        ...(name ? { name } : {}),
      },
    });
    return NextResponse.json({ ok: true, message: 'Password updated successfully.' });
  }

  // Handle name update
  if (name) {
    await db.user.update({ where: { id: user.id }, data: { name } });
    return NextResponse.json({ ok: true, message: 'Profile updated successfully.' });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  // Cascading delete deletes all related records (sessions, attempts, progress, xp)
  await db.user.delete({ where: { id: user.id } });
  await destroySession();

  return NextResponse.json({ ok: true, message: 'Account permanently deleted.' });
}
