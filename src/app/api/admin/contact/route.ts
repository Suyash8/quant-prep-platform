import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/origin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }
  const messages = await db.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ messages });
}

export async function PATCH(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }
  const parsed = z
    .object({ id: z.string().min(1), status: z.enum(['new', 'answered', 'spam']) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
  }
  try {
    const updated = await db.contactMessage.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status,
        repliedAt: parsed.data.status === 'answered' ? new Date() : null,
      },
    });
    return NextResponse.json({ message: updated });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Contact message not found.' }, { status: 404 });
    }
    throw err;
  }
}
