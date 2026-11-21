/**
 * Defence-in-depth Origin check for state-changing endpoints (B8).
 * Browsers always send Origin on CORS / cross-site mutations.
 * Enforces full scheme + host match (no http->https downgrade in production).
 */
export function assertSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) {
    // Allow non-browser / same-origin fetch clients without an Origin header (e.g. curl/tests);
    // browsers always attach Origin on CORS / cross-site mutations.
    return true;
  }
  try {
    const o = new URL(origin);
    const isLocalHost = o.hostname === 'localhost' || o.hostname === '127.0.0.1';
    if (process.env.NODE_ENV === 'production' && !isLocalHost && o.protocol !== 'https:') {
      return false;
    }

    const expectedProto =
      req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
      (process.env.NODE_ENV === 'production' && !isLocalHost ? 'https' : o.protocol.replace(':', ''));

    const host = req.headers.get('host');
    if (host && o.host === host && o.protocol === `${expectedProto}:`) {
      return true;
    }

    const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    if (forwardedHost && o.host === forwardedHost && o.protocol === `${expectedProto}:`) {
      return true;
    }

    const rawAppUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().replace(/^https?:\/\//, '')}`
        : process.env.VERCEL_URL?.trim()
          ? `https://${process.env.VERCEL_URL.trim().replace(/^https?:\/\//, '')}`
          : '');
    if (rawAppUrl && o.origin === new URL(rawAppUrl).origin) return true;

    return false;
  } catch {
    return false;
  }
}
