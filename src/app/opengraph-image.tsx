import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'QuantFoundry — Zero to Quantitative Developer';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          background: 'linear-gradient(135deg, #0b101b 0%, #131c2e 60%, #112a24 100%)',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              background: '#58cc02',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#071a03',
              fontSize: '34px',
              fontWeight: 900,
            }}
          >
            Σ
          </div>
          <span style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.02em' }}>
            QuantFoundry
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '940px' }}>
          <div style={{ fontSize: '60px', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em' }}>
            Zero to Quantitative Software Engineer
          </div>
          <div style={{ fontSize: '28px', color: '#cbd5e1', lineHeight: 1.35, fontWeight: 600 }}>
            Prerequisite-sequenced math, modern C++, Python numerical pipelines, systems, and real firm interview preparation.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '18px', fontSize: '22px', fontWeight: 800, color: '#86efac' }}>
          <span style={{ padding: '10px 20px', borderRadius: '999px', background: 'rgba(88,204,2,0.16)' }}>
            394 Lessons
          </span>
          <span style={{ padding: '10px 20px', borderRadius: '999px', background: 'rgba(56,189,248,0.16)', color: '#7dd3fc' }}>
            78 Judged Problems
          </span>
          <span style={{ padding: '10px 20px', borderRadius: '999px', background: 'rgba(250,204,21,0.16)', color: '#fde047' }}>
            11 Seamless Phases
          </span>
        </div>
      </div>
    ),
    size,
  );
}
