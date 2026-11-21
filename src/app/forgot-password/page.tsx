import type { Metadata } from 'next';
import { ForgotPasswordClient } from './forgot-password-client';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Request a password reset link for your QuantFoundry account.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
