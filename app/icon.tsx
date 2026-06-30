import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        borderRadius: '6px',
      }}
    >
      <span
        style={{
          color: '#4FD1E8',
          fontSize: '24px',
          fontWeight: 900,
          lineHeight: 1,
          filter: 'drop-shadow(0 0 5px rgba(79,209,232,0.9)) drop-shadow(0 0 12px rgba(79,209,232,0.6))',
        }}
      >
        7
      </span>
    </div>,
    { ...size }
  );
}
