'use client';

import * as React from 'react';
import type { OnMount } from '@monaco-editor/react';

interface MonacoCodeEditorProps {
  value: string;
  language: 'cpp' | 'python';
  onChange: (value: string) => void;
  onRunShortcut?: () => void;
  onSubmitShortcut?: () => void;
  height?: number | string;
}

export function MonacoCodeEditor({
  value,
  language,
  onChange,
  onRunShortcut,
  onSubmitShortcut,
  height = 420,
}: MonacoCodeEditorProps) {
  const [EditorComp, setEditorComp] = React.useState<React.ComponentType<any> | null>(null);
  const runRef = React.useRef(onRunShortcut);
  const submitRef = React.useRef(onSubmitShortcut);
  runRef.current = onRunShortcut;
  submitRef.current = onSubmitShortcut;

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ default: Editor, loader }, monaco] = await Promise.all([
          import('@monaco-editor/react'),
          import('monaco-editor'),
        ]);
        // Avoid cross-origin worker/CDN lookups; Monarch syntax highlighting for C++/Python runs locally.
        if (typeof window !== 'undefined' && !(window as unknown as { MonacoEnvironment?: unknown }).MonacoEnvironment) {
          (window as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
            getWorker(_workerId: string, _label: string) {
              const blob = new Blob(['self.onmessage = () => {};'], { type: 'application/javascript' });
              return new Worker(URL.createObjectURL(blob));
            },
          };
        }
        loader.config({ monaco });
        if (alive) setEditorComp(() => Editor);
      } catch {
        // Fallback handled below if dynamic load fails
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleMount: OnMount = React.useCallback((editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      runRef.current?.();
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      submitRef.current?.();
    });
  }, []);

  if (!EditorComp) {
    return (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        wrap="off"
        placeholder="// Loading Monaco editor…"
        style={{ minHeight: typeof height === 'number' ? `${height}px` : height }}
        className="qf-editor-input thin-scroll w-full flex-auto resize-none overflow-x-auto !rounded-none !border-0 !bg-transparent !p-4 !text-[14px] !leading-relaxed !text-slate-200 caret-emerald-400 !placeholder:text-slate-600"
        aria-label="Code editor"
      />
    );
  }

  return (
    <div className="w-full" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      <EditorComp
        height="100%"
        language={language}
        theme="vs-dark"
        value={value}
        onChange={(v: string | undefined) => onChange(v ?? '')}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineHeight: 22,
          fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontLigatures: true,
          tabSize: language === 'python' ? 4 : 4,
          insertSpaces: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 14, bottom: 14 },
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          renderLineHighlight: 'line',
          wordWrap: 'off',
        }}
      />
    </div>
  );
}
