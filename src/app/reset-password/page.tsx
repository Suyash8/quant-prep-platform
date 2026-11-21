import type { Metadata } from 'next';
import { ResetPasswordClient } from './reset-password-client';

export const metadata: Metadata = {
  title: 'Choose New Password',
  description: 'Set a new password for your QuantFoundry account.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
