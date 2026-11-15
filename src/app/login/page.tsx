import { AuthForm } from '@/components/auth-form';
import { countLabs, getRegistry, listProblems } from '@/lib/content';

export const metadata = { title: 'Sign in. QuantFoundry' };

export default function LoginPage() {
  return (
    <AuthForm mode="login" stats={{ lessons: getRegistry().lessons.length, labs: countLabs(), problems: listProblems().length }} />
  );
}
