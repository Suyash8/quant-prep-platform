'use client';
import Link from 'next/link';
import s from '../route-bodies.module.css';
import { V5Provider } from '@/components/v5/v5-provider';
import { LearningWorkspace } from '@/components/v5/learning-workspace';
import { useCodeReadiness } from '@/lib/v5/use-code-readiness';
function List({ content }: { content: NonNullable<Parameters<Parameters<typeof V5Provider>[0]['children']>[0]['content']> }) {
  const r = useCodeReadiness();
  if (r.state === 'loading') return <p className={s.note} role="status">Checking which problems are open…</p>;
  if (r.state === 'unknown') return <p className={s.note} role="status">Practice problems open only after the app can confirm they are ready. Connect once and reopen this page.</p>;
  const open = content.problems.filter((p) => (r.ready[p.id] ?? []).length > 0).sort((a, b) => a.order - b.order);
  if (r.runtimeBlocked) return <p className={s.note} role="status">Coding practice is closed on this server: {r.runtimeBlocked} Nothing is missing from your account, and nothing is counted as incorrect.</p>;
  if (!open.length) return <p className={s.note} role="status">No practice problems are open yet. Problems appear here only once they have been checked end to end. This is not an error and nothing is missing from your account.</p>;
  return <div className={s.stack}><ol className={`${s.list} ${s.problemList}`}>{open.map((p) => <li key={p.id}><Link className={s.row} href={`/v5/practice/${p.id}`}><span className={s.rowTitle}>{p.title}<small>({r.ready[p.id].map((l) => (l === 'cpp' ? 'C++' : 'Python')).join(', ')})</small></span><span className={s.arrow} aria-hidden="true">→</span></Link></li>)}</ol>{r.devTestOnly && <p className={s.note} role="note">Development test mode is on for this server. These problems are not an approved learner list.</p>}</div>;
}
export default function PracticePage() {
  return <V5Provider>{({ store, content }) => (
    <LearningWorkspace store={store} active="learn" eyebrow="Practice" title="Practice problems" subtitle="Run your code on your own input, then check it against the server's tests. Neither awards XP or mastery.">
      {!content ? <p className={s.note}>The offline library has not finished downloading. Connect once to load it.</p> : <List content={content} />}
    </LearningWorkspace>)}</V5Provider>;
}
