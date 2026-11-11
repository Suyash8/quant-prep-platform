// QuantFoundry mascot: Siggy, a rounded sigma creature.
// Original character built from SVG primitives using design tokens only.
// Poses: wave | think | cheer | sleep | lost | offline | celebrate
import type { CSSProperties } from 'react';

type Pose = 'wave' | 'think' | 'cheer' | 'sleep' | 'lost' | 'offline' | 'celebrate';
const S = 96;

// Face expression per pose
function face(pose: Pose): { eyes: string; mouth: string } {
  switch (pose) {
    case 'sleep': return { eyes: 'closed', mouth: 'soft' };
    case 'lost': return { eyes: 'wide', mouth: 'flat' };
    case 'offline': return { eyes: 'closed', mouth: 'flat' };
    case 'cheer':
    case 'celebrate': return { eyes: 'happy', mouth: 'big' };
    case 'think': return { eyes: 'up', mouth: 'flat' };
    default: return { eyes: 'open', mouth: 'smile' };
  }
}

export function Mascot({
  pose = 'wave',
  size = S,
  className,
  style,
}: {
  pose?: Pose;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const f = face(pose);
  const bodyY = pose === 'sleep' ? 60 : 54;
  return (
    <svg
      viewBox="0 0 120 100"
      width={size}
      height={(size * 100) / 120}
      className={`qf-mascot ${className ?? ''}`}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {/* limbs behind body */}
      {(pose === 'wave' || pose === 'cheer' || pose === 'celebrate') && (
        <rect x="86" y="38" width="14" height="10" rx="5" fill="var(--accent-deep)" transform="rotate(-28 86 38)" />
      )}
      {(pose === 'cheer' || pose === 'celebrate') && (
        <>
          <rect x="20" y="36" width="14" height="10" rx="5" fill="var(--accent-deep)" transform="rotate(24 20 36)" />
          {/* little confetti sparkles */}
          <circle cx="14" cy="20" r="3.4" fill="var(--gold)" />
          <rect x="104" y="14" width="7" height="7" rx="2" fill="var(--info)" transform="rotate(20 104 14)" />
          <circle cx="30" cy="10" r="2.6" fill="var(--violet)" />
        </>
      )}

      {/* body: rounded sigma creature */}
      <ellipse cx="60" cy={bodyY + 14} rx="34" ry="26" fill="var(--accent)" />
      {/* belly edge */}
      <ellipse cx="60" cy={bodyY + 18} rx="22" ry="16" fill="var(--accent-deep)" opacity="0.28" />
      {/* feet */}
      <rect x="40" y={bodyY + 32} width="16" height="9" rx="4.5" fill="var(--accent-deep)" />
      <rect x="64" y={bodyY + 32} width="16" height="9" rx="4.5" fill="var(--accent-deep)" />

      {/* sigma glyph on the belly */}
      <path
        d="M52 52 l8 8 -8 8 m16 -16 l-8 8 8 8"
        stroke="var(--accent-deep)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.75"
      />

      {/* eyes */}
      {f.eyes === 'open' && (
        <>
          <circle cx="50" cy="46" r="5" fill='white' />
          <circle cx="70" cy="46" r="5" fill='white' />
          <circle cx="51.5" cy="47" r="2.5" fill="var(--foreground)" />
          <circle cx="71.5" cy="47" r="2.5" fill="var(--foreground)" />
        </>
      )}
      {f.eyes === 'happy' && (
        <>
          <path d="M44 48 q6 -8 12 0" stroke='white' strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <path d="M64 48 q6 -8 12 0" stroke='white' strokeWidth="3.4" strokeLinecap="round" fill="none" />
        </>
      )}
      {f.eyes === 'closed' && (
        <>
          <path d="M44 47 q6 4 12 0" stroke="var(--accent-deep)" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M64 47 q6 4 12 0" stroke="var(--accent-deep)" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )}
      {f.eyes === 'up' && (
        <>
          <circle cx="50" cy="44" r="5" fill='white' />
          <circle cx="70" cy="44" r="5" fill='white' />
          <circle cx="50" cy="42" r="2.5" fill="var(--foreground)" />
          <circle cx="70" cy="42" r="2.5" fill="var(--foreground)" />
        </>
      )}
      {f.eyes === 'wide' && (
        <>
          <circle cx="50" cy="46" r="6.5" fill='white' />
          <circle cx="70" cy="46" r="6.5" fill='white' />
          <circle cx="50" cy="46" r="3" fill="var(--foreground)" />
          <circle cx="70" cy="46" r="3" fill="var(--foreground)" />
        </>
      )}

      {/* mouth */}
      {f.mouth === 'smile' && (
        <path d="M54 58 q6 5 12 0" stroke="var(--accent-deep)" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      {f.mouth === 'big' && (
        <path d="M52 56 q8 10 16 0 z" fill="var(--accent-deep)" />
      )}
      {f.mouth === 'soft' && (
        <path d="M56 58 q4 3 8 0" stroke="var(--accent-deep)" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      {f.mouth === 'flat' && (
        <path d="M54 59 h12" stroke="var(--accent-deep)" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}

      {/* pose extras */}
      {pose === 'think' && (
        <>
          <circle cx="92" cy="22" r="7" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="2" />
          <circle cx="101" cy="12" r="4.5" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="2" />
          <rect x="18" y="44" width="14" height="9" rx="4.5" fill="var(--accent-deep)" transform="rotate(18 18 44)" />
        </>
      )}
      {pose === 'sleep' && (
        <>
          <text x="86" y="26" fontSize="12" fontWeight="900" fill="var(--info)">z</text>
          <text x="98" y="14" fontSize="9" fontWeight="900" fill="var(--info)">z</text>
        </>
      )}
      {pose === 'lost' && (
        <>
          <text x="88" y="20" fontSize="13" fontWeight="900" fill="var(--warning-strong)">?</text>
          <text x="22" y="20" fontSize="10" fontWeight="900" fill="var(--warning-strong)">?</text>
        </>
      )}
      {pose === 'offline' && (
        <>
          {/* unplugged cord */}
          <path d="M96 30 h10 m4 0 h4" stroke="var(--foreground-faint)" strokeWidth="3" strokeLinecap="round" />
          <path d="M110 24 l8 12 m0 -12 l-8 12" stroke="var(--danger-strong)" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
