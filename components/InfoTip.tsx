'use client';

import { useState, useRef, useEffect } from 'react';

export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center" style={{ verticalAlign: 'middle' }}>
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        aria-label="Learn more"
        className="inline-flex items-center justify-center rounded-full text-[10px] font-bold leading-none transition-colors flex-shrink-0"
        style={{
          width: 14,
          height: 14,
          background: 'rgba(79,209,232,0.12)',
          color: '#4FD1E8',
          border: '1px solid rgba(79,209,232,0.3)',
          marginLeft: 5,
          cursor: 'default',
        }}
      >
        ?
      </button>

      {open && (
        <div
          className="absolute z-50 text-left"
          style={{
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 220,
            background: '#0e1120',
            border: '1px solid rgba(79,209,232,0.2)',
            borderRadius: 10,
            padding: '10px 12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(79,209,232,0.08)',
            pointerEvents: 'none',
          }}
        >
          <p className="text-xs text-gray-300 leading-relaxed normal-case" style={{ fontWeight: 400, letterSpacing: 'normal' }}>{text}</p>
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              bottom: -5,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 8,
              height: 8,
              background: '#0e1120',
              borderRight: '1px solid rgba(79,209,232,0.2)',
              borderBottom: '1px solid rgba(79,209,232,0.2)',
            }}
          />
        </div>
      )}
    </div>
  );
}
