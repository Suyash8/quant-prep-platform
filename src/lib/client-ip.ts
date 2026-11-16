/**
 * Derive the client IP safely across Vercel, Fly.io, or reverse-proxy deployments (B4).
 * Uses the right-most proxy hop when reading x-forwarded-for to resist header spoofing.
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  const vercelIp = h.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.split(',')[0]?.trim() || 'unknown';
  const flyIp = h.get('fly-client-ip');
  if (flyIp) return flyIp.trim();
  const realIp = h.get('x-real-ip');
  if (realIp) return realIp.trim();
  const xff = h.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    return parts.at(-1) || 'unknown';
  }
  return 'local';
}
