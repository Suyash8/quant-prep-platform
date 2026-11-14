import 'server-only';
import { randomBytes, scryptSync, timingSafeEqual, createHmac, createHash } from 'crypto';
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


function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  // Never sign cookies with a public constant in production: fail loudly instead.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }
  return 'quantfoundry-local-dev-secret';
}

function signSession(id: string): string {
  return createHmac('sha256', sessionSecret()).update(id).digest('hex').slice(0, 32);
}

export function sessionIdToCookie(id: string): string {
  // sign with a per-deployment secret so cookie tampering fails
  return `${id}.${signSession(id)}`;
}

function cookieToSessionId(v: string): string | null {
  const [id, sig] = v.split('.');
  if (!id || !sig) return null;
  const expect = signSession(id);
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
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

/** Non-secret, one-way tag of a session id. Lets the client name WHICH session a sign-out is for without ever seeing the httpOnly cookie. */
export const sessionTag = (id: string) => createHash('sha256').update('qf-sess-tag:' + id).digest('hex').slice(0, 16);
export async function currentSessionTag(): Promise<string | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value; const id = raw ? cookieToSessionId(raw) : null; return id ? sessionTag(id) : null;
}
/** Sign-out that can only end the session the learner meant. A late (queued/offline) sign-out must never end a session created by a LATER sign-in.
 *  `tag` names the session: only that session is ended. `confirmCurrent` is an explicit, user-confirmed "end whatever session this browser holds right now".
 *  Neither given: nothing is ended (fail safe). There is deliberately no client-clock fallback.
 *  Conditional paths send no cookie-delete header, since a late response could otherwise clear a newer login's cookie; the session row is gone, so a stale cookie is inert. */
export async function destroySessionFor(opts: { tag?: string; confirmCurrent?: boolean }): Promise<'ended' | 'skipped' | 'none'> {
  const jar = await cookies(); const raw = jar.get(SESSION_COOKIE)?.value; const id = raw ? cookieToSessionId(raw) : null;
  if (!id) return 'none';
  if (opts.tag !== undefined) { if (sessionTag(id) !== opts.tag) return 'skipped'; }
  else if (opts.confirmCurrent !== true) return 'skipped';
  await db.session.deleteMany({ where: { id } }); return 'ended';
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
