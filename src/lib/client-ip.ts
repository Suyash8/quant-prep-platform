/**
 * Derive the client IP safely across Vercel, Fly.io, or reverse-proxy deployments (B4).
 * Only trusts platform-injected headers when actually running on that platform, preventing
 * trivial header-spoofing rate-limit bypasses on Docker/self-hosted hosts.
 */
export function clientIp(req: Request): string {
  const h = req.headers;

  if (process.env.VERCEL === '1') {
    const vercelIp = h.get('x-vercel-forwarded-for');
    if (vercelIp) return vercelIp.split(',')[0]?.trim() || 'unknown';
  }

  if (process.env.FLY_APP_NAME) {
    const flyIp = h.get('fly-client-ip');
    if (flyIp) return flyIp.trim();
  }

  if (process.env.TRUST_PROXY === '1' || process.env.VERCEL === '1' || process.env.FLY_APP_NAME) {
    const realIp = h.get('x-real-ip');
    if (realIp) return realIp.trim();
    const xff = h.get('x-forwarded-for');
    if (xff) {
      const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
      return parts.at(-1) || 'unknown';
    }
  }

  return 'local';
}
