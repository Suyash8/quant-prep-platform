import { AuthForm } from '@/components/auth-form';
import { countLabs, getRegistry, listProblems } from '@/lib/content';

export const metadata = { title: 'Create account. QuantFoundry' };

export default function RegisterPage() {
  return (
    <AuthForm mode="register" stats={{ lessons: getRegistry().lessons.length, labs: countLabs(), problems: listProblems().length }} />
  );
}
