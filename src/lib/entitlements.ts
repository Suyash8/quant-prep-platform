/**
 * Tier entitlements (C1): matches the public Pricing boundaries cleanly.
 *
 * Free ("Starter"):
 * - Lessons in Phases 0 and 1 (84 foundational lessons)
 * - 10 starter coding problems
 * - Diagnostic assessment (diag-core)
 * - Read-only access to capstone project briefs
 */

export type PlanTier = 'free' | 'pro' | 'team';
export type EntitlementFeature =
  | 'lesson'
  | 'problem'
  | 'assessment'
  | 'project_write'
  | 'runner'
  | 'answers';

export const FREE_PHASES = new Set(['ph0', 'ph1']);

export const FREE_ASSESSMENTS = new Set(['diag-core']);

export const STARTER_PROBLEM_SLUGS = new Set([
  'anagram-groups',
  'balanced-brackets',
  'base-convert',
  'binary-search-price',
  'bit-count-parity',
  'coin-change-min',
  'ema-series',
  'min-stack',
  'moving-average',
  'pnl-calc',
]);

export interface EntitlementUser {
  plan?: string | null;
  role?: string | null;
}

export interface EntitlementResource {
  phaseId?: string;
  slug?: string;
  assessmentId?: string;
}

export function isPaidPlan(user: EntitlementUser | null | undefined): boolean {
  if (!user) return false;
  return user.plan === 'pro' || user.plan === 'team';
}

export function can(
  user: EntitlementUser | null | undefined,
  feature: EntitlementFeature,
  resource?: EntitlementResource,
): boolean {
  if (isPaidPlan(user)) return true;

  switch (feature) {
    case 'lesson':
      return Boolean(resource?.phaseId && FREE_PHASES.has(resource.phaseId));
    case 'problem':
    case 'runner':
      return Boolean(resource?.slug && STARTER_PROBLEM_SLUGS.has(resource.slug));
    case 'assessment':
      return Boolean(resource?.assessmentId && FREE_ASSESSMENTS.has(resource.assessmentId));
    case 'project_write':
      return false;
    case 'answers':
      if (resource?.phaseId) return FREE_PHASES.has(resource.phaseId);
      if (resource?.slug) return STARTER_PROBLEM_SLUGS.has(resource.slug);
      return false;
    default:
      return false;
  }
}
