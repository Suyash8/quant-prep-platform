import { getCurrentUser } from '@/lib/auth';
import { getRegistry, listAssessments, listProblems, listProjects } from '@/lib/content';
import { AppShell, PublicHeader, PublicFooter } from '@/components/app-shell';
import { PricingClient } from '@/components/pricing-client';

export const metadata = {
  title: 'Pricing · QuantFoundry',
  description: 'Simple plans for individuals and quantitative engineering cohorts. Start free with diagnostic placement and Phase 0–1 foundations.',
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  const user = await getCurrentUser();
  const reg = getRegistry();
  const problems = listProblems();
  const projects = listProjects();
  const assessments = listAssessments();

  const stripeEnabled = Boolean(
    process.env.STRIPE_SECRET_KEY &&
    (process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID_ANNUAL),
  );

  const body = (
    <PricingClient
      user={user ? { name: user.name, email: user.email, plan: user.plan } : null}
      lessonCount={reg.lessons.length}
      problemCount={problems.length}
      projectCount={projects.length}
      assessmentCount={assessments.length}
      stripeEnabled={stripeEnabled}
      initialStatus={checkout ?? null}
    />
  );

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader user={null} />
        <main className="flex-1">{body}</main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} isAdmin={user.role === 'admin'}>
      {body}
    </AppShell>
  );
}
