'use client';
/** Device-only saved code for one practice problem, bound to account + problem pack revision + language + starter (see store.saveCodeDraft).
 *  - Exact draft is loaded before the editor mounts; an older-version draft is OFFERED, never applied silently, and applying it is SAVED FIRST (or the editor stays dirty).
 *  - `savedSource` is the exact value last confirmed written on this device (null-safe baseline): the leave guard compares the editor value with it.
 *  - Saves are serialised; a completed save only marks the exact value it wrote, so a later edit is never reported as saved.
 *  - The language is owned here: switching flushes the old language, then loads that language's own draft. Failures are shown, never hidden. */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { V5ContentStore } from '@/lib/v5/idb-store';
import s from './learning.module.css';
type Lang = 'python' | 'cpp';
type Failure = string | null;
const reasonText: Record<string, string> = { identity: 'Your account could not be confirmed, so this code was not saved on this device. Keep a copy.', quota: 'Device storage is full. This code was not saved. Keep a copy.', unavailable: 'Device storage is unavailable. This code was not saved. Keep a copy.', 'too-large': 'This code is too large to save. Keep a copy.', 'unknown-problem': 'This problem is not stored on this device, so the code was not saved. Keep a copy.' };
type Loaded = { language: Lang; source: string; baseline: string; restoredAt: number | null; older: { source: string; savedAt: number }[]; epoch: number };
export function CodeDraftPanel({ store, problemId, packSha, languages, initialLanguage, starters, children }: { store: V5ContentStore; problemId: string; packSha: string; languages: Lang[]; initialLanguage: Lang; starters: Record<Lang, string>; children: (a: { language: Lang; languages: Lang[]; initialSource: string; editorKey: string; savedSource: string; storedOnDevice: boolean; onSourceChange: (source: string, language: Lang) => void; onLanguageChange: (language: Lang) => void }) => ReactNode }) {
  const [language, setLanguage] = useState<Lang>(initialLanguage);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [savedSource, setSavedSource] = useState('');          // exact value last confirmed saved (starter when nothing was ever saved)
  const [current, setCurrent] = useState('');                  // exact value currently in the editor
  const [failure, setFailure] = useState<Failure>(null); const [savedAt, setSavedAt] = useState<number | null>(null);
  const [offerOpen, setOfferOpen] = useState(false); const [epoch, setEpoch] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const [stored, setStored] = useState(false);                 // a real write (or a loaded saved draft) exists on this device for this key
  const [blocked, setBlocked] = useState<Lang | null>(null);   // a language switch refused because the current code is not saved
  const currentRef = useRef(''); const savedRef = useRef('');
  /* store: the account's store the text was TYPED under. A pending edit is only ever written through that store, never through whichever store is current when the timer fires or the panel tears down (an account change swaps the store: the old account's text must not land in the new account's database). const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const chain = useRef<Promise<void>>(Promise.resolve()); */
  const pending = useRef<{ source: string; language: Lang; store: V5ContentStore } | null>(null); const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const chain = useRef<Promise<void>>(Promise.resolve());
  const [held, setHeld] = useState(false); const alive = useRef(true); const ctx = useRef({ store, problemId, starters }); ctx.current = { store, problemId, starters };
  const bound = useRef(packSha);   // the pack revision the editor content was loaded against; saves go to THIS revision's key even if content refreshes underneath
  const save = useCallback((source: string, lang: Lang, via?: V5ContentStore): Promise<boolean> => {
    const st = via ?? ctx.current.store;   // chosen NOW, not when the queued write runs
    const run = chain.current.then(async () => {
      const c = ctx.current; const r = await st.saveCodeDraft(c.problemId, lang, c.starters[lang], source, Date.now(), bound.current);
      if (!alive.current || st !== ctx.current.store) return r.ok;   // a write through a replaced store is the old account's: it must not change what this account's editor shows
      if (r.ok) { setHeld(r.held); savedRef.current = source; setSavedSource(source); setStored(true); setSavedAt(Date.now()); setFailure(null); } else setFailure(reasonText[r.reason] ?? 'This code was not saved. Keep a copy.');
      return r.ok;
    });
    chain.current = run.then(() => undefined, () => undefined); return run.catch(() => false);
  }, []);
  const flush = useCallback(async (opts?: { skipIfHidden?: boolean }) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const p = pending.current; if (!p) return true; if (opts?.skipIfHidden && wrap.current?.closest('[hidden],[inert]')) return false;
    pending.current = null; return save(p.source, p.language, p.store);
  }, [save]);
  // load the exact draft (and discover older ones) for the active language
  useEffect(() => { alive.current = true; let dead = false; bound.current = packSha; const boundAtRun = packSha; setLoaded(null); setOfferOpen(false); setFailure(null); setSavedAt(null);
    (async () => { const st = starters[language]; const [exact, older] = await Promise.all([store.getCodeDraft(problemId, language, st, packSha), store.findOlderCodeDrafts(problemId, language, st, packSha)]);
      if (dead) return; const src = exact?.source ?? st; setLoaded({ language, source: src, baseline: src, restoredAt: exact?.savedAt ?? null, older, epoch }); savedRef.current = src; currentRef.current = src; setSavedSource(src); setCurrent(src); setStored(!!exact); setHeld(!!exact?.held); setBlocked(null); })();
    return () => { dead = true; const p = pending.current; if (p) { pending.current = null; if (timer.current) clearTimeout(timer.current); void p.store.saveCodeDraft(problemId, p.language, starters[p.language], p.source, Date.now(), boundAtRun); } }; }, [store, problemId, packSha, language, starters.python, starters.cpp, epoch]);   // primitives only: a content refresh must never reload (and wipe) the editor
  // unmount (route change, account teardown): flush best effort. The store itself refuses and removes the write unless the signed-in account is still confirmed.
  useEffect(() => () => { alive.current = false; const p = pending.current; pending.current = null; if (timer.current) clearTimeout(timer.current); if (p) void p.store.saveCodeDraft(ctx.current.problemId, p.language, ctx.current.starters[p.language], p.source, Date.now(), bound.current); }, []);
  const onSourceChange = useCallback((source: string, lang: Lang) => { currentRef.current = source; setCurrent(source); pending.current = { source, language: lang, store: ctx.current.store }; if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void flush({ skipIfHidden: true }), 600); }, [flush]);
  const onLanguageChange = useCallback(async (next: Lang) => { await flush(); if (currentRef.current !== savedRef.current) { setBlocked(next); return; } setBlocked(null); setLanguage(next); }, [flush]);
  const retrySwitch = useCallback(async () => { if (!blocked) return; const ok = await save(currentRef.current, language); if (ok && currentRef.current === savedRef.current) { const n = blocked; setBlocked(null); setLanguage(n); } }, [blocked, save, language]);
  const discardSwitch = useCallback(() => { if (!blocked) return; if (!window.confirm('Discard the code that was not saved and switch language?')) return; const n = blocked; pending.current = null; setBlocked(null); setFailure(null); setLanguage(n); }, [blocked]);
  const applyOlder = useCallback(async (src: string) => { if (!window.confirm('Replace the code in the editor with this older saved code?')) return; if (timer.current) clearTimeout(timer.current); pending.current = null; await save(src, language); setCurrent(src); setLoaded((l) => (l ? { ...l, source: src, restoredAt: null, older: [], epoch: l.epoch + 1 } : l)); }, [save, language]);
  if (!loaded) return <p role="status">Loading your saved code…</p>;
  const unsaved = current !== savedSource;
  return <div ref={wrap}>
    {loaded.restoredAt && <p className={s.receipt} role="note">Restored your code saved on this device.</p>}
    {held && <p className={s.helper} role="note">Saved on this device while your account could not be checked (offline). It stays here, is not uploaded, and is not tied to a verified account until you edit and save it while online.</p>}
    {loaded.older.length > 0 && <section className={s.explain} aria-label="Older saved code"><p>You have code saved for an earlier version of this problem on this device. It was not applied.</p>{!offerOpen ? <button className={s.secondary} onClick={() => setOfferOpen(true)}>Review older saved code</button> : loaded.older.slice(0, 3).map((o, i) => <details key={i} open={i === 0}><summary>Saved {new Date(o.savedAt).toLocaleString()}</summary><pre className="whitespace-pre-wrap break-all">{o.source}</pre><button className={s.secondary} onClick={() => void applyOlder(o.source)}>Use this code in the editor</button></details>)}</section>}
    {blocked && <section className={s.error} role="alert"><p>Your code could not be saved on this device, so the language was not changed. Your code is still in the editor.</p><button className={s.secondary} onClick={() => void retrySwitch()}>Retry saving and switch</button> <button className={s.secondary} onClick={discardSwitch}>Discard unsaved code and switch</button></section>}
    {children({ language, languages, initialSource: loaded.source, editorKey: `${problemId}:${language}:${loaded.epoch}`, savedSource, storedOnDevice: stored, onSourceChange, onLanguageChange })}
    <p className={failure ? s.error : s.helper} role={failure ? 'alert' : 'status'} aria-live="polite">{failure ? failure : unsaved ? 'Saving on this device…' : stored && savedAt ? `Saved on this device at ${new Date(savedAt).toLocaleTimeString()}. Not checked by the server.` : 'Your edits are saved on this device as you type.'}</p>
  </div>;
}
