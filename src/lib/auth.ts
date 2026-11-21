import 'server-only';
import { randomBytes, scrypt, scryptSync, timingSafeEqual, createHmac, createHash } from 'crypto';
import { promisify } from 'util';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

const scryptAsync = promisify(scrypt);
const SESSION_COOKIE = 'qf_session';
const SESSION_DAYS = 30;

// Fixed precomputed salt+hash used to equalize login timing when an email is not found
const DUMMY_PASSWORD_HASH =
  '0123456789abcdef0123456789abcdef:' +
  scryptSync('quantfoundry-timing-dummy-secret', '0123456789abcdef0123456789abcdef', 64).toString('hex');

// ---------- password hashing (scrypt, async non-blocking + sync helper for CLI/tests) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export async function hashPasswordAsync(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function verifyPasswordAsync(password: string, stored: string | null | undefined): Promise<boolean> {
  const target = stored && stored.includes(':') ? stored : DUMMY_PASSWORD_HASH;
  const [salt, hash] = target.split(':');
  if (!salt || !hash) return false;
  const candidate = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  const matched = candidate.length === expected.length && timingSafeEqual(candidate, expected);
  return Boolean(stored && matched);
}

// ---------- sessions ----------

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }
  return 'quantfoundry-local-dev-secret';
}

function signSession(id: string): string {
  return createHmac('sha256', sessionSecret()).update(id).digest('hex').slice(0, 32);
}

export function sessionIdToCookie(id: string): string {
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

export async function createSession(userId: string, userAgent?: string | null): Promise<string> {
  const id = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({
    data: { id, userId, expiresAt, userAgent: userAgent ? userAgent.slice(0, 240) : null, lastUsedAt: new Date() },
  });
  // Opportunistic background pruning of expired sessions
  db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionIdToCookie(id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
  return id;
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

export async function currentSessionId(): Promise<string | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  return raw ? cookieToSessionId(raw) : null;
}

export async function revokeOtherSessions(userId: string, keepSessionId?: string | null): Promise<number> {
  const res = await db.session.deleteMany({
    where: keepSessionId ? { userId, id: { not: keepSessionId } } : { userId },
  });
  return res.count;
}

/** Non-secret, one-way tag of a session id. */
export const sessionTag = (id: string) =>
  createHash('sha256').update('qf-sess-tag:' + id).digest('hex').slice(0, 16);

export async function currentSessionTag(): Promise<string | null> {
  const id = await currentSessionId();
  return id ? sessionTag(id) : null;
}

export async function destroySessionFor(opts: { tag?: string; confirmCurrent?: boolean }): Promise<'ended' | 'skipped' | 'none'> {
  const id = await currentSessionId();
  if (!id) return 'none';
  if (opts.tag !== undefined) {
    if (sessionTag(id) !== opts.tag) return 'skipped';
  } else if (opts.confirmCurrent !== true) {
    return 'skipped';
  }
  await db.session.deleteMany({ where: { id } });
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return 'ended';
}

export async function getCurrentUser() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const id = cookieToSessionId(raw);
  if (!id) return null;
  const session = await db.session.findUnique({ where: { id }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  // Opportunistic sliding touch (throttled to at most once every 10 min)
  if (Date.now() - session.lastUsedAt.getTime() > 10 * 60_000) {
    db.session.update({ where: { id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

// ---------- bounded in-memory + shared DB token-bucket rate limiter ----------

const MAX_RATE_LIMIT_BUCKETS = 5000;
const buckets = new Map<string, { tokens: number; last: number }>();

function pruneBuckets(now: number) {
  for (const [k, v] of buckets.entries()) {
    if (now - v.last > 15 * 60 * 1000) buckets.delete(k);
  }
  if (buckets.size > MAX_RATE_LIMIT_BUCKETS) {
    const toDelete = buckets.size - MAX_RATE_LIMIT_BUCKETS;
    let count = 0;
    for (const k of buckets.keys()) {
      buckets.delete(k);
      if (++count >= toDelete) break;
    }
  }
}

let lastPrune = 0;

export function rateLimit(key: string, capacity = 10, refillPerSec = 0.2): boolean {
  const now = Date.now();
  if (now - lastPrune > 60_000 || buckets.size > MAX_RATE_LIMIT_BUCKETS) {
    pruneBuckets(now);
    lastPrune = now;
  }
  const b = buckets.get(key) ?? { tokens: capacity, last: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.last) / 1000) * refillPerSec);
  b.last = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

/** Multi-instance atomic token bucket via Postgres RateLimitBucket, with graceful local fallback. */
export async function rateLimitShared(key: string, capacity = 10, refillPerSec = 0.2): Promise<boolean> {
  try {
    const res = await db.$queryRaw<Array<{ key: string }>>`
      INSERT INTO "RateLimitBucket" ("key", "tokens", "updatedAt")
      VALUES (${key}, ${Math.max(0, capacity - 1)}, NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "tokens" = LEAST(${capacity}::double precision, "RateLimitBucket"."tokens" + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - "RateLimitBucket"."updatedAt"))) * ${refillPerSec}::double precision) - 1,
        "updatedAt" = NOW()
      WHERE LEAST(${capacity}::double precision, "RateLimitBucket"."tokens" + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - "RateLimitBucket"."updatedAt"))) * ${refillPerSec}::double precision) >= 1
      RETURNING "key"
    `;
    return res.length > 0;
  } catch {
    return rateLimit(key, capacity, refillPerSec);
  }
}

// ---------- password reset & email verification HMAC tokens ----------

const RESET_TTL_MS = 30 * 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export function createPasswordResetToken(user: { id: string; email: string; passwordHash: string }): string {
  const exp = Date.now() + RESET_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ uid: user.id, email: user.email, exp }), 'utf8').toString('base64url');
  const sig = createHmac('sha256', `${sessionSecret()}:${user.passwordHash}`).update(payload).digest('hex').slice(0, 32);
  return `${payload}.${sig}`;
}

export function decodeResetTokenUserId(token: string): string | null {
  const [payload] = token.split('.');
  if (!payload) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { uid?: unknown };
    return typeof data.uid === 'string' && data.uid ? data.uid : null;
  } catch {
    return null;
  }
}

export function verifyPasswordResetToken(
  token: string,
  user: { id: string; email: string; passwordHash: string },
): boolean {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { uid?: unknown; email?: unknown; exp?: unknown };
    if (data.uid !== user.id || data.email !== user.email) return false;
    if (typeof data.exp !== 'number' || Date.now() > data.exp) return false;
    const expect = createHmac('sha256', `${sessionSecret()}:${user.passwordHash}`).update(payload).digest('hex').slice(0, 32);
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function createEmailVerifyToken(user: { id: string; email: string }): string {
  const exp = Date.now() + VERIFY_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ uid: user.id, email: user.email, exp }), 'utf8').toString('base64url');
  const sig = createHmac('sha256', `verify:${sessionSecret()}`).update(payload).digest('hex').slice(0, 32);
  return `${payload}.${sig}`;
}

export function verifyEmailVerifyToken(token: string): { uid: string; email: string } | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { uid?: unknown; email?: unknown; exp?: unknown };
    if (typeof data.uid !== 'string' || typeof data.email !== 'string') return null;
    if (typeof data.exp !== 'number' || Date.now() > data.exp) return null;
    const expect = createHmac('sha256', `verify:${sessionSecret()}`).update(payload).digest('hex').slice(0, 32);
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    return a.length === b.length && timingSafeEqual(a, b) ? { uid: data.uid, email: data.email } : null;
  } catch {
    return null;
  }
}
