import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser, rateLimitShared } from '@/lib/auth';
import { clientIp } from '@/lib/client-ip';
import { sendEmail } from '@/lib/email';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120),
  email: z.string().trim().email('Enter a valid email address.').max(160),
  subject: z.string().trim().min(2, 'Enter a subject.').max(160),
  message: z.string().trim().min(10, 'Please include at least 10 characters in your message.').max(4000),
  website: z.string().optional(), // hidden honeypot field
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!(await rateLimitShared(`contact:${ip}`, 5, 0.05))) {
    return NextResponse.json({ error: 'Too many messages sent recently. Please wait before trying again.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? 'Invalid submission.';
    return NextResponse.json({ error: first }, { status: 400 });
  }

  // Honeypot trap for automated spam bots
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return NextResponse.json({ ok: true, id: 'accepted' }, { status: 201 });
  }

  const user = await getCurrentUser().catch(() => null);
  const senderEmail = parsed.data.email.toLowerCase();
  const created = await db.contactMessage.create({
    data: {
      userId: user?.id ?? null,
      name: parsed.data.name,
      email: senderEmail,
      subject: parsed.data.subject,
      message: parsed.data.message,
      status: 'new',
    },
    select: { id: true },
  });

  const supportInbox = process.env.SUPPORT_EMAIL || process.env.INITIAL_ADMIN_EMAIL;
  if (supportInbox) {
    await sendEmail({
      to: supportInbox,
      replyTo: senderEmail,
      subject: `[QuantFoundry Contact] ${parsed.data.subject}`,
      text: `From: ${parsed.data.name} <${senderEmail}>\nTicket ID: ${created.id}\nUser ID: ${user?.id ?? 'guest'}\n\n${parsed.data.message}`,
    }).catch(() => {});
  }

  await sendEmail({
    to: senderEmail,
    subject: `Received: ${parsed.data.subject}`,
    text: `Hi ${parsed.data.name},\n\nWe received your message (Reference ${created.id}) and typically respond within 2 business days.\n\n— QuantFoundry Support`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
