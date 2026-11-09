import 'server-only';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

const SESSION_COOKIE = 'qf_session';
const SESSION_DAYS = 30;

// ---------- password hashing (scrypt, no external deps) ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// ---------- sessions ----------
export function sessionIdToCookie(id: string): string {
  // sign with a per-deployment secret so cookie tampering fails
  const secret = process.env.SESSION_SECRET ?? 'quantfoundry-local-dev-secret';
  const sig = createHash('sha256').update(id + secret).digest('hex').slice(0, 16);
  return `${id}.${sig}`;
}

function cookieToSessionId(v: string): string | null {
  const [id, sig] = v.split('.');
  if (!id || !sig) return null;
  const secret = process.env.SESSION_SECRET ?? 'quantfoundry-local-dev-secret';
  const expect = createHash('sha256').update(id + secret).digest('hex').slice(0, 16);
  return sig === expect ? id : null;
}

export async function createSession(userId: string): Promise<void> {
  const id = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({ data: { id, userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionIdToCookie(id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    const id = cookieToSessionId(raw);
    if (id) await db.session.deleteMany({ where: { id } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const id = cookieToSessionId(raw);
  if (!id) return null;
  const session = await db.session.findUnique({ where: { id }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

// ---------- simple in-memory rate limiter ----------
const buckets = new Map<string, { tokens: number; last: number }>();

export function rateLimit(key: string, capacity = 10, refillPerSec = 0.2): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, last: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.last) / 1000) * refillPerSec);
  b.last = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}
