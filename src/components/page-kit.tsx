import Link from 'next/link';
import * as React from 'react';
import { Clock, ListChecks, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Mascot, type MascotPose } from '@/components/brand/mascot';

/* ------------------------------------------------------------------ *
 * Shared page primitives: every page is built from these pieces so
 * headers, sections, stats and closing blocks cannot drift apart.
 * ------------------------------------------------------------------ */

type Tone = 'accent' | 'info' | 'warning' | 'danger' | 'gold' | 'violet';

export function PageHero({
  icon: Icon,
  tone = 'accent',
  title,
  sub,
  action,
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('page-hero anim-slide-up', className)}>
      <span className={cn('icon-tile', `icon-tile-${tone}`)}>
        <Icon aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h1>{title}</h1>
        {sub ? <p className="page-sub">{sub}</p> : null}
      </div>
      {action ? <div className="hidden sm:flex items-center gap-2 flex-none">{action}</div> : null}
    </div>
  );
}

export function SectionHead({
  icon: Icon,
  tone = 'accent',
  title,
  right,
  className,
  id,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  right?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn('section-head', className)}>
      <span className={cn('icon-tile-sm', `icon-tile-${tone}`)}>
        <Icon aria-hidden />
      </span>
      <h2 id={id}>{title}</h2>
      {right ? <div className="ml-auto flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function StatTile({
  icon: Icon,
  tone = 'accent',
  value,
  label,
  sub,
  href,
  delay = 0,
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  value: React.ReactNode;
  label: string;
  sub?: string;
  href?: string;
  delay?: number;
  className?: string;
}) {
  const inner = (
    <>
      <span className={cn('icon-tile-sm', `icon-tile-${tone}`)}>
        <Icon aria-hidden />
      </span>
      <span className="stat-body">
        <span className="stat-value tnum anim-pop-in">{value}</span>
        <span className="stat-label">{label}</span>
        {sub ? <span className="stat-sub">{sub}</span> : null}
      </span>
    </>
  );
  const cls = cn('stat-tile w-full', className);
  const style = delay ? { animationDelay: `${delay}ms` } : undefined;
  if (href) {
    return (
      <Link href={href} className={cn(cls, 'press hover:border-accent transition-colors')} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={cls} style={style}>
      {inner}
    </div>
  );
}

export function StatRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch', className)}>
      {React.Children.map(children, (child, i) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<React.ComponentProps<typeof StatTile>>, { delay: i * 60 })
          : child,
      )}
    </div>
  );
}

/** The anti dead-zone block that closes every page. */
export function ClosingCta({
  icon: Icon,
  tone = 'accent',
  title,
  sub,
  action,
  ghost,
  href,
  mascotPose,
  className,
}: {
  icon?: LucideIcon;
  tone?: Tone;
  title: string;
  sub: string;
  action: string;
  ghost?: { label: string; href: string };
  href: string;
  mascotPose?: MascotPose;
  className?: string;
}) {
  return (
    <section className={cn('qf-card bg-dots qf-closing anim-slide-up', className)} aria-label="Next step">
      <div className="flex flex-col items-center gap-3 px-2 py-2">
        {mascotPose ? (
          <Mascot pose={mascotPose} size={88} />
        ) : Icon ? (
          <span className={cn('icon-tile', `icon-tile-${tone}`)}>
            <Icon aria-hidden />
          </span>
        ) : null}
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
        <p className="max-w-xl text-sm font-semibold text-muted">{sub}</p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
          <Link href={href} className="btn3d btn3d-lg">{action}</Link>
          {ghost ? (
            <Link href={ghost.href} className="btn3d btn3d-ghost">{ghost.label}</Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function EmptyState({
  emoji,
  mascotPose,
  icon: Icon,
  tone = 'accent',
  title,
  sub,
  action,
  href,
  className,
}: {
  emoji?: string;
  mascotPose?: MascotPose;
  icon?: LucideIcon;
  tone?: Tone;
  title: string;
  sub?: string;
  action?: string;
  href?: string;
  className?: string;
}) {
  return (
    <div className={cn('qf-empty', className)}>
      {mascotPose ? (
        <Mascot pose={mascotPose} size={80} className="mx-auto mb-2 anim-bob" />
      ) : emoji ? (
        <span className="empty-emoji" aria-hidden>{emoji}</span>
      ) : Icon ? (
        <span className={cn('icon-tile', `icon-tile-${tone}`, 'mb-1')}>
          <Icon aria-hidden />
        </span>
      ) : null}
      <p className="font-extrabold">{title}</p>
      {sub ? <p className="mt-1 text-sm font-semibold text-muted">{sub}</p> : null}
      {action && href ? (
        <Link href={href} className="btn3d btn3d-sm mt-3">{action}</Link>
      ) : null}
    </div>
  );
}

/* ---------------- standard metadata chips ---------------- */

export function MetaChip({
  icon: Icon,
  tone,
  children,
  title,
  className,
}: {
  icon?: LucideIcon;
  tone?: 'accent' | 'info' | 'warning' | 'danger' | 'success' | 'gold';
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span className={cn('chip', tone ? `chip-${tone}` : undefined, className)} title={title}>
      {Icon ? <Icon aria-hidden className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

export function TimeChip({ minutes }: { minutes: number }) {
  return <MetaChip icon={Clock}>{`${minutes} min`}</MetaChip>;
}

export function CountChip({ count, noun = 'questions' }: { count: number; noun?: string }) {
  return <MetaChip icon={ListChecks}>{`${count} ${noun}`}</MetaChip>;
}

export function XpChip({ xp, earned = false }: { xp: number; earned?: boolean }) {
  return (
    <MetaChip icon={Zap} tone={earned ? 'gold' : 'warning'}>
      {earned ? `${xp} XP earned` : `+${xp} XP`}
    </MetaChip>
  );
}

const DIFF_TONES: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  foundation: 'success',
  core: 'info',
  advanced: 'warning',
  specialist: 'danger',
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
};

export function DiffChip({ level }: { level: string }) {
  return <MetaChip tone={DIFF_TONES[level] ?? 'info'}>{level}</MetaChip>;
}

/* ---------------- progress ring ---------------- */

export function Ring({
  value,
  size = 64,
  thickness = 7,
  tone = 'var(--accent)',
  track = 'var(--surface-3)',
  children,
  className,
}: {
  value: number; // 0..100
  size?: number;
  thickness?: number;
  tone?: string;
  track?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span className={cn('qf-ring', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
        />
      </svg>
      <span className="qf-ring-value">{children}</span>
    </span>
  );
}
