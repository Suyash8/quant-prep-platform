/**
 * Defence-in-depth Origin check for state-changing endpoints (B8).
 * Browsers always send Origin (or Referer) on cross-site requests.
 */
export function assertSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin) {
    // Allow non-browser / same-origin fetch clients without an Origin header (e.g. curl/tests);
    // browsers always attach Origin on CORS / cross-site mutations.
    return true;
  }
  try {
    const o = new URL(origin);
    if (host && o.host === host) return true;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && o.origin === new URL(appUrl).origin) return true;
    return false;
  } catch {
    return false;
  }
}
