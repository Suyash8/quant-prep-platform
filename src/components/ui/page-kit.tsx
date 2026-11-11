// Shared page primitives so every feature page is built from the same pieces
// and cannot drift (Part 5.4). Reuse these before writing new markup.
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Mascot } from '@/components/brand/mascot';

type Tone = 'accent' | 'info' | 'warning' | 'danger' | 'gold' | 'violet' | 'blue';

export function PageHero({
  icon: Icon,
  tone = 'accent',
  title,
  sub,
  action,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="page-hero">
      <span className={`icon-tile icon-tile-${tone}`}>
        <Icon aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h1>{title}</h1>
        {sub ? <p className="page-sub">{sub}</p> : null}
      </div>
      {action ? <div className="hidden sm:flex items-center gap-3">{action}</div> : null}
    </header>
  );
}

export function SectionHead({
  icon: Icon,
  tone = 'info',
  title,
  right,
  sub,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  right?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="section-head">
      <span className={`icon-tile-sm icon-tile-${tone}`}>
        <Icon aria-hidden="true" />
      </span>
      <h2 className="flex-1 min-w-0">{title}</h2>
      {right}
    </div>
  );
}

export function StatTile({
  icon: Icon,
  tone = 'accent',
  value,
  label,
  sub,
}: {
  icon: LucideIcon;
  tone?: Tone;
  value: ReactNode;
  label: string;
  sub?: ReactNode;
}) {
  return (
    <div className="stat-tile">
      <span className={`icon-tile-sm icon-tile-${tone}`}>
        <Icon aria-hidden="true" />
      </span>
      <div className="stat-value tnum anim-pop-in">{value}</div>
      <div className="stat-label">{label}</div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
  );
}

// The anti-dead-zone block. ALWAYS last on a page. Message is page-specific.
export function ClosingCta({
  icon,
  tone = 'accent',
  title,
  line,
  cta,
  ghost,
  pose = 'cheer',
  className,
}: {
  icon?: LucideIcon;
  tone?: Tone;
  title: string;
  line: string;
  cta?: ReactNode;
  ghost?: ReactNode;
  pose?: 'wave' | 'think' | 'cheer' | 'sleep' | 'lost' | 'offline' | 'celebrate';
  className?: string;
}) {
  const Icon = icon;
  return (
    <div className={`qf-card bg-dots p-8 flex flex-col items-center gap-3 text-center ${className ?? ''}`}>
      <Mascot pose={pose} size={88} />
      {Icon ? (
        <span className={`icon-tile-sm icon-tile-${tone}`} aria-hidden="true">
          <Icon />
        </span>
      ) : null}
      <h2 className="text-lg font-black tracking-tight max-w-md">{title}</h2>
      <p className="text-sm font-semibold text-muted max-w-md">{line}</p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
        {cta}
        {ghost}
      </div>
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  line,
  cta,
  pose,
  className,
}: {
  emoji?: string;
  title: string;
  line?: string;
  cta?: ReactNode;
  pose?: 'wave' | 'think' | 'cheer' | 'sleep' | 'lost' | 'offline' | 'celebrate';
  className?: string;
}) {
  return (
    <div className={`qf-empty ${className ?? ''}`}>
      {pose ? <Mascot pose={pose} size={80} /> : null}
      {emoji ? <span className="empty-emoji" role="img" aria-label={title}>{emoji}</span> : null}
      <p className="font-black text-base">{title}</p>
      {line ? <p className="text-sm font-semibold text-muted mt-1">{line}</p> : null}
      {cta ? <div className="mt-4 flex justify-center">{cta}</div> : null}
    </div>
  );
}

// Simple SVG progress ring with a centered label.
export function ProgressRing({
  value,
  size = 64,
  stroke = 8,
  tone = 'var(--accent)',
  children,
  label,
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  tone?: string;
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span className="qf-ring" role="img" aria-label={label ?? `${Math.round(pct)} percent`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * pct) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <span className="qf-ring-label text-sm">{children}</span>
    </span>
  );
}

// A simple link styled as the row-card right-side action.
export function RowAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="btn3d btn3d-ghost btn3d-sm">
      {children}
    </Link>
  );
}
