import { DashboardClient } from '@/components/learn/dashboard-client';

export const metadata = { title: 'Dashboard · QuantFoundry' };

/**
 * Dashboard shell renders immediately from client local state & content packs,
 * keeping navigation instant and offline-ready inside the persistent ChromeShell.
 */
export default function DashboardPage() {
  return <DashboardClient />;
}
