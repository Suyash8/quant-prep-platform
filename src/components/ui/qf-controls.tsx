'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Styled native select that keeps the system look in both themes.
 * The real <select> stays in the DOM (keyboard + mobile pickers work);
 * it is visually replaced by the .qf-select system class.
 */
export function QfSelect({
  className,
  children,
  small = false,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { small?: boolean }) {
  return (
    <select className={cn(small ? 'qf-select-sm' : 'qf-select', className)} {...rest}>
      {children}
    </select>
  );
}

/** A .qf-range slider that keeps its --fill variable in sync with the value. */
export function QfSlider({
  className,
  min = 0,
  max = 100,
  step = 1,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { min?: number; max?: number; step?: number }) {
  const fill = ((Number(rest.value ?? 0) - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      className={cn('qf-range', className)}
      min={min}
      max={max}
      step={step}
      style={{ '--fill': `${Math.max(0, Math.min(100, fill))}%` } as React.CSSProperties}
      {...rest}
    />
  );
}

/** A big styled checkbox with an optional label row. */
export function QfCheck({
  label,
  id,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode }) {
  const input = (
    <input type="checkbox" id={id} className={cn('qf-check', className)} style={{ width: '1.45rem', height: '1.45rem' }} {...rest} />
  );
  if (label === undefined) return input;
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 cursor-pointer select-none">
      {input}
      <span className="text-sm font-bold">{label}</span>
    </label>
  );
}

/** Label + control + hint + error, one source of truth for form rows. */
export function QfField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-extrabold">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs font-semibold text-muted">{hint}</p> : null}
      {error ? <p className="text-xs font-bold text-danger">{error}</p> : null}
    </div>
  );
}

/**
 * 3D selectable answer tile (quiz, diagnostic, onboarding).
 * Real label + sr-only radio/checkbox input, so keyboard and screen readers
 * behave exactly like native controls while the visuals stay chunky.
 */
export function AnswerTile({
  letter,
  selected,
  correct,
  wrong,
  disabled,
  type = 'radio',
  name,
  value,
  onChange,
  children,
  className,
}: {
  letter?: string;
  selected?: boolean;
  correct?: boolean;
  wrong?: boolean;
  disabled?: boolean;
  type?: 'radio' | 'checkbox';
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'qf-answer-tile',
        selected && 'qf-selected',
        correct && 'qf-correct',
        wrong && 'qf-wrong',
        disabled && 'opacity-60 pointer-events-none',
        className,
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={selected}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
        aria-label={typeof children === 'string' ? children : undefined}
      />
      {letter ? <span className="qf-answer-badge" aria-hidden>{letter}</span> : null}
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronDown className="h-4 w-4 flex-none opacity-40" aria-hidden />
    </label>
  );
}

/** Segmented control built from buttons (works for filters and period pickers). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn('qf-segmented', className)} role="group" aria-label={ariaLabel}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className="qf-seg-item"
          aria-pressed={opt.value === value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Styled file dropzone: click opens the picker, drag and drop works. */
export function QfDropzone({
  onFiles,
  accept,
  children,
  className,
}: {
  onFiles: (files: FileList) => void;
  accept?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);
  return (
    <div
      className={cn('qf-dropzone', drag && 'border-accent bg-accent-soft', className)}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={e => { if (e.target.files?.length) onFiles(e.target.files); }}
      />
    </div>
  );
}
