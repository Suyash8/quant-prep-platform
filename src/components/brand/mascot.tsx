import * as React from 'react';

/**
 * QuantFoundry mascot: an original "sigma creature".
 * Built only from SVG primitives and design tokens (no copied brand shapes):
 * a rounded green body, a darker belly edge, a small sigma mark, big eyes,
 * stubby limbs. Geometric on purpose so it scales and themes cleanly.
 */
export type MascotPose = 'wave' | 'think' | 'cheer' | 'sleep' | 'lost' | 'offline' | 'celebrate';

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
  const h = size * 1.05;
  const eyeClosed = pose === 'sleep';
  const title = label ?? (pose === 'lost' ? 'The mascot looks lost' : 'QuantFoundry mascot');

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 105"
      fill="none"
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : true}
      className={className}
    >
      <title>{title}</title>

      {/* soft ground shadow */}
      <ellipse cx="50" cy="97" rx="26" ry="5" fill="var(--shadow-hard)" opacity="0.35" />

      {/* legs */}
      <rect x="34" y="80" width="10" height="12" rx="5" fill="var(--accent-deep)" />
      <rect x="56" y="80" width="10" height="12" rx="5" fill="var(--accent-deep)" />

      {/* arms: pose-dependent */}
      {pose === 'cheer' || pose === 'celebrate' ? (
        <>
          <rect x="8" y="42" width="9" height="22" rx="4.5" fill="var(--accent-strong)" transform="rotate(-24 12 52)" />
          <rect x="83" y="42" width="9" height="22" rx="4.5" fill="var(--accent-strong)" transform="rotate(24 88 52)" />
        </>
      ) : pose === 'wave' ? (
        <>
          <rect x="9" y="46" width="9" height="20" rx="4.5" fill="var(--accent-strong)" transform="rotate(32 13 56)" />
          <rect x="83" y="52" width="9" height="16" rx="4.5" fill="var(--accent-strong)" />
        </>
      ) : pose === 'think' ? (
        <>
          <rect x="10" y="54" width="9" height="16" rx="4.5" fill="var(--accent-strong)" transform="rotate(14 14 62)" />
          <rect x="82" y="54" width="9" height="16" rx="4.5" fill="var(--accent-strong)" />
        </>
      ) : pose === 'offline' ? (
        <>
          <rect x="10" y="58" width="9" height="14" rx="4.5" fill="var(--accent-strong)" />
          <rect x="82" y="58" width="9" height="14" rx="4.5" fill="var(--accent-strong)" />
        </>
      ) : (
        <>
          <rect x="10" y="54" width="9" height="16" rx="4.5" fill="var(--accent-strong)" />
          <rect x="82" y="54" width="9" height="16" rx="4.5" fill="var(--accent-strong)" />
        </>
      )}

      {/* body: rounded blob with darker belly edge */}
      <path
        d="M50 12c22 0 34 14 34 34 0 20-12 34-34 34S16 66 16 46c0-20 12-34 34-34z"
        fill="var(--accent)"
        stroke="var(--accent-deep)"
        strokeWidth="3"
      />
      {/* belly */}
      <path d="M50 34c13 0 20 8 20 18 0 10-7 18-20 18s-20-8-20-18c0-10 7-18 20-18z" fill="var(--accent-soft)" opacity="0.9" />

      {/* sigma mark on the belly (the brand shape) */}
      <path
        d="M57 42v4l-9 8 9 8v4h-13v-4l8-8-8-8v-4h13z"
        fill="var(--accent-deep)"
      />

      {/* eyes */}
      {eyeClosed ? (
        <>
          <path d="M36 48c2 3 6 3 8 0" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" />
          <path d="M56 48c2 3 6 3 8 0" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="39" cy="47" r="6.5" fill="#ffffff" />
          <circle cx="61" cy="47" r="6.5" fill="#ffffff" />
          <circle cx={pose === 'think' ? 41 : 39} cy={pose === 'think' ? 49 : 48} r="3" fill="var(--foreground)" />
          <circle cx={pose === 'think' ? 63 : 61} cy={pose === 'think' ? 49 : 48} r="3" fill="var(--foreground)" />
        </>
      )}

      {/* mouth */}
      {pose === 'celebrate' || pose === 'cheer' ? (
        <path d="M43 58c3 5 11 5 14 0" stroke="var(--accent-deep)" strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : pose === 'lost' ? (
        <path d="M45 59c2 2 8 2 10 0" stroke="var(--accent-deep)" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path d="M44 57c3 4 9 4 12 0" stroke="var(--accent-deep)" strokeWidth="3" strokeLinecap="round" />
      )}

      {/* pose accessories */}
      {pose === 'think' && (
        <>
          <circle cx="82" cy="26" r="3" fill="var(--info)" />
          <circle cx="89" cy="17" r="4" fill="var(--info)" opacity="0.75" />
          <circle cx="95" cy="7" r="5" fill="var(--info)" opacity="0.5" />
        </>
      )}
      {pose === 'sleep' && (
        <text x="72" y="22" fontSize="12" fontWeight="900" fill="var(--info)" fontFamily="var(--font-sans)">z</text>
      )}
      {pose === 'lost' && (
        <text x="78" y="24" fontSize="16" fontWeight="900" fill="var(--warning)" fontFamily="var(--font-sans)">?</text>
      )}
      {pose === 'offline' && (
        <g stroke="var(--info)" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M74 20c6 0 10 4 10 9 0 5-4 9-9 9H60" />
          <path d="M66 31l-6 7 6 7" strokeLinejoin="round" />
          <path d="M70 45l6 6" />
        </g>
      )}
      {pose === 'celebrate' && (
        <g stroke="var(--gold)" strokeWidth="3" strokeLinecap="round">
          <path d="M12 26l3-6 3 6" />
          <path d="M82 24l3-6 3 6" />
          <path d="M50 4v6" stroke="var(--violet)" />
          <circle cx="20" cy="12" r="2.5" fill="var(--flame)" stroke="none" />
          <circle cx="80" cy="10" r="2.5" fill="var(--flame)" stroke="none" />
        </g>
      )}
      {pose === 'wave' && (
        <g stroke="var(--info)" strokeWidth="3" strokeLinecap="round">
          <path d="M4 30c1-3 3-5 6-6" />
          <path d="M2 38c2-2 4-3 6-3" opacity="0.6" />
        </g>
      )}
    </svg>
  );
}

export default Mascot;
