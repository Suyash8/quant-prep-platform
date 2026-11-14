'use client';
import { use } from 'react';
import Link from 'next/link';
import { V5Provider } from '@/components/v5/v5-provider';
import { LearningWorkspace } from '@/components/v5/learning-workspace';
import { LessonMarkdown } from '@/components/v5/lesson-markdown';
import { CodePractice } from '@/components/v5/code-practice';
import { useCodeReadiness } from '@/lib/v5/use-code-readiness';
import { CodeDraftPanel } from '@/components/v5/code-draft-panel';
import type { V5ContentStore } from '@/lib/v5/idb-store';
import type { ProblemPublic } from '@/lib/v5/types';
type Lang = 'python' | 'cpp';
function Body({ problem, account, store }: { problem: ProblemPublic; account: string | null; store: V5ContentStore }) {
  const r = useCodeReadiness();
  if (r.state === 'loading') return <p role="status">Checking whether this problem is open…</p>;
  const langs = (r.state === 'known' ? (r.ready[problem.id] ?? []) : []).filter((l): l is Lang => l === 'python' || l === 'cpp');
  if (!langs.length) return <section role="status"><h2>This problem is not open yet.</h2><p>{r.state === 'known' && r.runtimeBlocked ? `Coding practice is closed on this server: ${r.runtimeBlocked}` : r.state === 'unknown' ? 'The app could not confirm that it is ready, and nothing is shown until it can. Connect and reopen this page.' : 'It has not been checked end to end for running and judging. This is not an incorrect answer and nothing is lost.'}</p><p><Link href="/v5/practice">Back to practice</Link></p></section>;
  const initial = langs[0];
  return <>
    <section aria-labelledby="problem-statement"><h2 id="problem-statement">{problem.title}</h2>
      {(problem.statement as { md?: string }[]).map((b, i) => <LessonMarkdown key={i} markdown={b.md ?? ''} />)}
      <h3>Input</h3><LessonMarkdown markdown={problem.inputFormat} /><h3>Output</h3><LessonMarkdown markdown={problem.outputFormat} />
      <h3>Constraints</h3><ul>{problem.constraints.map((c, i) => <li key={i}><LessonMarkdown markdown={c} /></li>)}</ul>
      {problem.examples.map((e, i) => <details key={i} open={i === 0}><summary>Example {i + 1}</summary><h4>Input</h4><pre className="whitespace-pre-wrap break-all">{e.input}</pre><h4>Output</h4><pre className="whitespace-pre-wrap break-all">{e.output}</pre></details>)}
      {problem.hints.length > 0 && <details><summary>Hints</summary><ol>{problem.hints.map((h, i) => <li key={i}><LessonMarkdown markdown={h} /></li>)}</ol></details>}
    </section>
    {account ? <CodeDraftPanel store={store} problemId={problem.id} packSha={problem.packSha ?? ''} languages={langs} initialLanguage={initial} starters={problem.starter}>{({ language, initialSource, editorKey, savedSource, storedOnDevice, onSourceChange, onLanguageChange }) => <CodePractice key={`${account}:${editorKey}`} accountId={account} problemId={problem.id} publicSha={problem.packSha} initialLanguage={language} initialSource={initialSource} languages={langs} onSourceChange={onSourceChange} onLanguageChange={onLanguageChange} savedSource={savedSource} storedOnDevice={storedOnDevice} />}</CodeDraftPanel> : <CodePractice key={`anon:${problem.id}`} accountId={null} problemId={problem.id} initialLanguage={initial} initialSource={problem.starter[initial] ?? ''} languages={langs} />}
    {r.state === 'known' && r.cached && <p role="note">Using the last known readiness from this device. The server checks again on every run.</p>}
  </>;
}
export default function PracticeProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <V5Provider>{({ store, content, account }) => {
    const problem = content?.problems.find((p) => p.id === id);
    return <LearningWorkspace store={store} active="learn" eyebrow="Practice" title={problem?.title ?? 'Practice problem'} subtitle="Run is output only. Check asks the server judge. Neither awards XP or mastery.">
      {!content ? <p>The offline library has not finished downloading. Connect once to load it.</p> : !problem ? <section role="status"><h2>We could not find this problem.</h2><p><Link href="/v5/practice">Back to practice</Link></p></section> : <Body problem={problem} account={account} store={store as V5ContentStore} />}
    </LearningWorkspace>;
  }}</V5Provider>;
}
