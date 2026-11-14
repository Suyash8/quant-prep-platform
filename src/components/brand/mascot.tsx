import * as React from 'react';

export type MascotPose = 'wave' | 'think' | 'cheer' | 'sleep' | 'lost' | 'offline' | 'celebrate';

/**
 * QuantFoundry Brand Emblem:
 * A sleek, modern mathematical medallion featuring a precision-crafted
 * Sigma symbol, jewel gradients, and subtle institutional finish.
 */
export function Mascot({
  pose = 'wave',
  size = 96,
  className,
  label,
}: {
  pose?: MascotPose;
  size?: number;
  className?: string;
  label?: string;
}) {
  const w = size;
  const h = size;
  const title = label ?? 'QuantFoundry Signature Emblem';

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="qf-emblem-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent-strong, #10b981)" />
          <stop offset="100%" stopColor="var(--accent-deep, #047857)" />
        </linearGradient>
        <linearGradient id="qf-emblem-sheen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="qf-emblem-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="var(--accent-deep, #047857)" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Outer Glow Shield */}
      <rect
        x="8"
        y="8"
        width="84"
        height="84"
        rx="26"
        fill="url(#qf-emblem-bg)"
        filter="url(#qf-emblem-shadow)"
      />

      {/* Inner Bevel Border */}
      <rect
        x="10"
        y="10"
        width="80"
        height="80"
        rx="24"
        fill="none"
        stroke="rgba(255, 255, 255, 0.45)"
        strokeWidth="2.5"
      />

      {/* Top Glass Sheen */}
      <path
        d="M 10 34 C 10 20.7 20.7 10 34 10 L 66 10 C 79.3 10 90 20.7 90 34 L 90 42 C 60 52 40 40 10 48 Z"
        fill="url(#qf-emblem-sheen)"
        opacity="0.75"
      />

      {/* Bold Mathematical Sigma Mark */}
      <path
        d="M 33 28 L 67 28 C 68.5 28 69.5 29.5 69 31 L 64 40 L 49 40 L 59 50 L 49 60 L 64 60 L 69 69 C 69.5 70.5 68.5 72 67 72 L 33 72 C 31.5 72 30.5 70.5 31.5 69 L 47 50 L 31.5 31 C 30.5 29.5 31.5 28 33 28 Z"
        fill="#ffffff"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
      />

      {/* Pose Special Accents */}
      {pose === 'celebrate' && (
        <g stroke="#ffd700" strokeWidth="2.5" strokeLinecap="round" fill="none">
          <circle cx="88" cy="18" r="3" fill="#ffd700" stroke="none" />
          <circle cx="12" cy="20" r="2.5" fill="#ffd700" stroke="none" />
          <path d="M 85 30 L 92 24 M 82 12 L 87 6" />
        </g>
      )}

      {pose === 'think' && (
        <circle cx="82" cy="22" r="4.5" fill="var(--info, #38bdf8)" stroke="#ffffff" strokeWidth="2" />
      )}
    </svg>
  );
}

export default Mascot;
