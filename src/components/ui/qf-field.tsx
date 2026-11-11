// System form controls (Part 2.2). One source of truth for selectable answer
// tiles, styled native selects, sliders with a live fill, big checkboxes and
// the file dropzone. Use these instead of bare native controls anywhere.
import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, UploadCloud, X } from 'lucide-react';

/* 3D selectable answer tile. Render as a real <label>/<input> pair or as a
   <button>. Selected state green, correct green, wrong red with shake. */
export function AnswerTile({
  letter,
  children,
  selected,
  onSelect,
  state,
  disabled,
  name,
  index,
}: {
  letter?: string;
  children: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  state?: 'correct' | 'wrong' | 'idle';
  disabled?: boolean;
  name?: string;
  index?: number;
}) {
  const cls = [
    'qf-answer-tile',
    selected ? 'qf-selected' : '',
    state === 'correct' ? 'qf-correct' : '',
    state === 'wrong' ? 'qf-wrong anim-shake' : '',
  ].filter(Boolean).join(' ');
  const l = letter ?? (index !== undefined ? String.fromCharCode(65 + index) : undefined);
  return (
    <button type="button" className={cls} onClick={onSelect} disabled={disabled} aria-pressed={selected} data-name={name}>
      {l ? <span className="qf-letter" aria-hidden="true">{l}</span> : null}
      <span className="flex-1 min-w-0">{children}</span>
      {state === 'correct' ? <Check className="size-5 text-accent-deep" aria-hidden="true" /> : null}
      {state === 'wrong' ? <X className="size-5 text-danger" aria-hidden="true" /> : null}
    </button>
  );
}

/* Styled native select with the system class (keeps native a11y, kills the chrome). */
export function QfSelect({
  value,
  onChange,
  children,
  className,
  small,
  ariaLabel,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
  small?: boolean;
  ariaLabel?: string;
  id?: string;
}) {
  const auto = useId();
  return (
    <select
      id={id ?? auto}
      className={`${small ? 'qf-select-sm' : 'qf-select'} ${className ?? ''}`}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

/* Range slider that sets the --fill CSS variable so the track shows progress. */
export function QfSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
  className,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      className={`qf-range ${className ?? ''}`}
      style={{ ['--fill' as string]: `${pct}%` }}
      value={value}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

/* Big friendly checkbox. Wrap in your own <label> row. */
export function QfCheck({
  checked,
  onChange,
  ariaLabel,
  id,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
  id?: string;
  className?: string;
}) {
  const auto = useId();
  return (
    <input
      id={id ?? auto}
      type="checkbox"
      className={`qf-check ${className ?? ''}`}
      checked={checked}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

/* Styled dropzone replacing a bare file input. Renders a hidden input + button. */
export function QfDropzone({
  accept,
  onFile,
  hint,
  label = 'Drop a JSON file here',
  className,
}: {
  accept?: string;
  onFile?: (f: File) => void;
  hint?: string;
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [name, setName] = useState<string | null>(null);
  return (
    <div
      className={`qf-dropzone ${drag ? 'qf-drag' : ''} ${className ?? ''}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => ref.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ref.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) { setName(f.name); onFile?.(f); }
      }}
    >
      <UploadCloud className="size-7" aria-hidden="true" />
      <span className="font-black text-sm">{name ?? label}</span>
      {hint ? <span className="text-xs font-bold">{hint}</span> : null}
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { setName(f.name); onFile?.(f); }
        }}
      />
    </div>
  );
}

/* label + control + hint + error row. */
export function QfField({
  label,
  icon,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <span className="qf-field-label">{icon}{label}</span>
      {children}
      {error ? <div className="qf-field-error">{error}</div> : hint ? <div className="qf-field-hint">{hint}</div> : null}
    </div>
  );
}
