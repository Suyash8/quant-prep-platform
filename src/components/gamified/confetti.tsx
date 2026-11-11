'use client';

import * as React from 'react';

/**
 * Celebration confetti, pure CSS, no dependencies. Renders N pieces that
 * fall with random drift/spin/delay/colour, then unmounts itself.
 */
const COLORS = ['var(--accent)', 'var(--info)', 'var(--gold)', 'var(--flame)', 'var(--violet)', 'var(--danger)'];

export function Confetti({ pieces = 90, durationMs = 2800 }: { pieces?: number; durationMs?: number }) {
  const seeds = React.useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        drift: (Math.random() - 0.5) * 220,
        spin: 360 + Math.random() * 720,
        delay: Math.random() * 0.5,
        dur: durationMs / 1000 + Math.random() * 0.9,
        size: 7 + Math.random() * 7,
        round: Math.random() > 0.6,
        color: COLORS[i % COLORS.length],
      })),
    [pieces, durationMs],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" aria-hidden>
      {seeds.map((s, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: '-3vh',
            left: `${s.left}%`,
            width: s.size,
            height: s.size * (s.round ? 1 : 0.5),
            background: s.color,
            borderRadius: s.round ? '50%' : 2,
            ['--drift' as string]: `${s.drift}px`,
            ['--spin' as string]: `${s.spin}deg`,
            animation: `qf-confetti-fall ${s.dur}s cubic-bezier(0.3, 0.4, 0.65, 1) ${s.delay}s both`,
          }}
        />
      ))}
    </div>
  );
}
