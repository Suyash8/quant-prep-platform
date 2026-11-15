import { SettingsForm } from '@/components/settings-form';
import { Settings } from 'lucide-react';

export const metadata = { title: 'Settings · QuantFoundry' };

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero">
        <span className="icon-tile icon-tile-neutral"><Settings className="h-7 w-7" /></span>
        <div>
          <h1>Account settings</h1>
          <p className="page-sub">Manage your profile details, daily XP target, offline cache, and account controls.</p>
        </div>
      </header>
      <div className="mt-6">
        <SettingsForm />
      </div>
    </div>
  );
}
