import { getRegistry, listAssessments, listProblems, listProjects } from '@/lib/content';
import { PricingClient } from '@/components/pricing-client';

export const metadata = {
  title: 'Pricing · QuantFoundry',
  description: 'Simple plans for individuals and quantitative engineering cohorts. Start free with diagnostic placement and Phase 0–1 foundations.',
};

export default function PricingPage() {
  const reg = getRegistry();
  const problems = listProblems();
  const projects = listProjects();
  const assessments = listAssessments();

  const stripeEnabled = Boolean(
    process.env.STRIPE_SECRET_KEY &&
    (process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID_ANNUAL),
  );

  return (
    <PricingClient
      user={null}
      lessonCount={reg.lessons.length}
      problemCount={problems.length}
      projectCount={projects.length}
      assessmentCount={assessments.length}
      stripeEnabled={stripeEnabled}
    />
  );
}
