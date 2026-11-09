import { redirect } from 'next/navigation';

// /learn has no index of its own — the curriculum browser is the index.
export default function LearnIndex() {
  redirect('/curriculum');
}
