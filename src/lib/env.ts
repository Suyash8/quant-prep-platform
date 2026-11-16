import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  INITIAL_ADMIN_EMAIL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  CODE_RUNNER_URL: z.string().optional(),
  CODE_RUNNER_AUTH_TOKEN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ID_ANNUAL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function validateEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  const e = parsed.data;
  const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build';
  if (e.NODE_ENV === 'production' && !isNextBuild) {
    const errors: string[] = [];
    if (!e.SESSION_SECRET || e.SESSION_SECRET.length < 32) {
      errors.push('SESSION_SECRET must be at least 32 characters in production');
    }
    if (!e.CRON_SECRET || e.CRON_SECRET.length < 24) {
      errors.push('CRON_SECRET must be at least 24 characters in production');
    }
    if (e.STRIPE_SECRET_KEY && !e.STRIPE_WEBHOOK_SECRET) {
      errors.push('STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set');
    }
    if (e.CODE_RUNNER_URL && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(e.CODE_RUNNER_URL)) {
      if (!e.CODE_RUNNER_AUTH_TOKEN || e.CODE_RUNNER_AUTH_TOKEN.length < 32) {
        errors.push('CODE_RUNNER_AUTH_TOKEN (>=32 chars) is required for remote CODE_RUNNER_URL');
      }
    }
    if (errors.length > 0 && process.env.QF_SKIP_STRICT_ENV !== '1') {
      throw new Error(`[env] Production startup validation failed:\n- ${errors.join('\n- ')}`);
    }
    if (errors.length > 0) {
      console.warn(`[env] Warnings (QF_SKIP_STRICT_ENV=1): ${errors.join('; ')}`);
    }
  }
  cachedEnv = e;
  return e;
}

export function envSummary() {
  const e = validateEnv();
  return {
    nodeEnv: e.NODE_ENV,
    hasDatabase: Boolean(e.DATABASE_URL),
    hasEmail: Boolean(e.RESEND_API_KEY),
    hasStripe: Boolean(e.STRIPE_SECRET_KEY && e.STRIPE_WEBHOOK_SECRET),
    hasRunner: Boolean(e.CODE_RUNNER_URL),
    hasSentry: Boolean(e.SENTRY_DSN),
  };
}
