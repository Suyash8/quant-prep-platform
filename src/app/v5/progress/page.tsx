'use client';
import s from '../route-bodies.module.css';
import { V5Provider } from '@/components/v5/v5-provider';
import { LearningWorkspace } from '@/components/v5/learning-workspace';
import { useLearningStore } from '@/components/v5/use-learning-store';
import type { V5Store } from '@/lib/v5/types';
function Body({ store, account }: { store: V5Store; account: string | null }) {
  const sn = useLearningStore(store); const rc = sn.receiptCounts;
  return <div className={s.stack}>
    {!account && <p className={s.note} role="note"><strong>You are not signed in.</strong> Answers made while signed out stay on this device only. They are not added to an account when you sign in later, and they are never checked by the server.</p>}
    <div className={s.grid}><section className={s.card} aria-labelledby="ver"><p className={s.eyebrow}>Server record</p><span className={s.status}>Checked evidence</span><h2 id="ver">Checked by the server</h2>{rc && rc.checked > 0 ? <p className={s.copy}>{rc.checked} response{rc.checked === 1 ? '' : 's'} checked by the server: {rc.correct} correct, {rc.incorrect} not correct. {sn.verified ? `${sn.verified.xp} XP and ${sn.verified.completedLessons.length} lessons completed (server-verified).` : ''}</p> : <p className={s.copy}>The server has not checked any of your responses yet.</p>}</section>
    <section className={s.card} aria-labelledby="prov"><p className={s.eyebrow}>Device record</p><span className={s.status}>Provisional</span><h2 id="prov">Saved on this device</h2><p className={s.copy}>{sn.provisional.xp} XP and {sn.provisional.completedLessons.length} lessons completed so far on this device. This count is provisional until the server confirms it.</p>
      <ul className={s.receipts}>
        <li>{rc?.queued ?? 0} queued: waiting to be sent for a server check.</li>
        <li>{rc?.held ?? 0} held: saved while your identity could not be checked. Not sent until you confirm they are yours.</li>
        {(rc?.disputed ?? 0) > 0 && <li>{rc?.disputed} disputed by the server.</li>}
        {(rc?.rejected ?? 0) > 0 && <li>{rc?.rejected} not accepted by the server (unrecognised, changed or unavailable version).</li>}
      </ul></section></div>
  </div>;
}
export default function ProgressPage() { return <V5Provider>{({ store, account }) => <LearningWorkspace store={store} active="progress" eyebrow="Progress" title="My progress" subtitle="Server-checked progress is kept separate from what is only saved on this device."><Body store={store} account={account} /></LearningWorkspace>}</V5Provider>; }
