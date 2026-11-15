import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser, rateLimit } from '@/lib/auth';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120),
  email: z.string().trim().email('Enter a valid email address.').max(160),
  subject: z.string().trim().min(2, 'Enter a subject.').max(160),
  message: z.string().trim().min(10, 'Please include at least 10 characters in your message.').max(4000),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  if (!rateLimit(`contact:${ip}`, 5, 0.05)) {
    return NextResponse.json({ error: 'Too many messages sent recently. Please wait before trying again.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? 'Invalid submission.';
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const user = await getCurrentUser().catch(() => null);
  const created = await db.contactMessage.create({
    data: {
      userId: user?.id ?? null,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      subject: parsed.data.subject,
      message: parsed.data.message,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
