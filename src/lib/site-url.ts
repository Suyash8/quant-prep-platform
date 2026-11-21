/**
 * Canonical public site URL resolver.
 * Never leaks http://localhost:3000 in production Vercel deployments even if
 * NEXT_PUBLIC_APP_URL was forgotten in project settings.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) return `https://${vercelProd.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;

  return 'http://localhost:3000';
}

/**
 * Derive a trusted application origin for email links and Stripe return URLs.
 * Prefers configured site URL in production to prevent Host-header poisoning or 0.0.0.0 links.
 */
export function getAppOrigin(req?: { nextUrl?: { origin?: string } }): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (configured) {
    return getSiteUrl();
  }
  const reqOrigin = req?.nextUrl?.origin;
  if (reqOrigin && !reqOrigin.includes('0.0.0.0')) {
    return reqOrigin.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}
