import { getRegistry, listAssessments, listProblems, listProjects } from '@/lib/content';
import { getCurrentUser } from '@/lib/auth';
import { PricingClient } from '@/components/pricing-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pricing · QuantFoundry',
  description: 'Simple plans for individuals and quantitative engineering cohorts. Start free with diagnostic placement and Phase 0–1 foundations.',
};

export default async function PricingPage() {
  const [user, reg, problems, projects, assessments] = await Promise.all([
    getCurrentUser().catch(() => null),
    Promise.resolve(getRegistry()),
    Promise.resolve(listProblems()),
    Promise.resolve(listProjects()),
    Promise.resolve(listAssessments()),
  ]);

  const stripeEnabled = Boolean(
    process.env.STRIPE_SECRET_KEY &&
    (process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID_ANNUAL),
  );

  return (
    <PricingClient
      user={user ? { name: user.name, email: user.email, plan: user.plan } : null}
      lessonCount={reg.lessons.length}
      problemCount={problems.length}
      projectCount={projects.length}
      assessmentCount={assessments.length}
      stripeEnabled={stripeEnabled}
    />
  );
}
