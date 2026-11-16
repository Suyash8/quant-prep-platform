import 'server-only';

interface SendEmailInput {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; skipped?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'QuantFoundry <onboarding@resend.dev>';
  const toList = Array.isArray(input.to) ? input.to : [input.to];

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[email:dev] To=${toList.join(',')} Subject="${input.subject}"\n${input.text}`);
      return { sent: false, skipped: 'dev-logged' };
    }
    console.warn(`[email] RESEND_API_KEY unset; skipped sending "${input.subject}"`);
    return { sent: false, skipped: 'unconfigured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: toList,
        subject: input.subject,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[email] Resend HTTP ${res.status}: ${errText.slice(0, 300)}`);
      return { sent: false, skipped: `http-${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error('[email] Network failure sending email:', err);
    return { sent: false, skipped: 'network-error' };
  }
}
