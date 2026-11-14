'use client';
import Link from 'next/link';
import s from '../route-bodies.module.css';
import { V5Provider } from '@/components/v5/v5-provider';
import { LearningWorkspace } from '@/components/v5/learning-workspace';
export default function LearnPage() {
  return <V5Provider>{({ store, content, account }) => (
    <LearningWorkspace store={store} active="learn" eyebrow="Learn" title="Your curriculum" subtitle={account ? 'Lessons work offline once the library is stored on this device.' : 'You are not signed in. Progress is saved on this device only and is not checked by the server.'}>
      <div className={s.stack}><div className={s.toolbar}><div><h2>Put your learning to work</h2><p>Write code and test it on practice problems.</p></div><Link className={s.action} href="/v5/practice">Practice problems <span aria-hidden="true">→</span></Link></div>
      {!content ? <p className={s.note}>The offline library has not finished downloading. Connect once to load it.</p> : (
        <div className={s.grid}>{(content.map?.modules ?? []).slice().sort((a, b) => a.order - b.order).map((m, index) => (
          <section className={s.card} key={m.id} aria-labelledby={m.id}><p className={s.eyebrow}>Module {String(index + 1).padStart(2, '0')}</p><h2 id={m.id}>{m.title}</h2><p className={s.meta}>{m.lessonIds.filter((id) => content.lessons.some((l) => l.id === id)).length} lessons available · {m.lessonIds.length} on the route</p><ol className={s.list}>{m.lessonIds.map((id) => {
            const entry = content.map?.lessons.find((l) => l.id === id); const stored = content.lessons.find((l) => l.id === id);
            return <li key={id}>{stored ? <Link className={s.row} href={`/v5/learn/${id}`}><span className={s.rowTitle}>{stored.title}</span><span className={s.arrow} aria-hidden="true">→</span></Link> : <span className={`${s.row} ${s.planned}`}><span className={s.rowTitle}>{entry?.title ?? id} <small>Planned, not written yet</small></span></span>}</li>;
          })}</ol></section>))}</div>)}
    </div></LearningWorkspace>)}</V5Provider>;
}
