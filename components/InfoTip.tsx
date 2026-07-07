'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';

const TIP_WIDTH = 220;
const MARGIN = 8;

export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; arrowLeft: number; placement: 'top' | 'bottom' } | null>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    function reposition() {
      if (!btnRef.current) return;
      const btnRect = btnRef.current.getBoundingClientRect();
      let left = btnRect.left + btnRect.width / 2 - TIP_WIDTH / 2;
      left = Math.max(MARGIN, Math.min(left, window.innerWidth - TIP_WIDTH - MARGIN));

      const tipHeight = tipRef.current?.offsetHeight ?? 70;
      let placement: 'top' | 'bottom' = 'top';
      let top = btnRect.top - tipHeight - MARGIN;
      if (top < MARGIN) {
        placement = 'bottom';
        top = btnRect.bottom + MARGIN;
      }

      const arrowLeft = btnRect.left + btnRect.width / 2 - left;
      setPos({ top, left, arrowLeft, placement });
    }
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative inline-flex items-center" style={{ verticalAlign: 'middle' }}>
      <button
        ref={btnRef}
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
          ref={tipRef}
          className="fixed z-50 text-left"
          style={{
            top: pos ? pos.top : -9999,
            left: pos ? pos.left : -9999,
            visibility: pos ? 'visible' : 'hidden',
            width: TIP_WIDTH,
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
              ...(pos?.placement === 'bottom'
                ? { top: -5, borderRight: 'none', borderBottom: 'none', borderLeft: '1px solid rgba(79,209,232,0.2)', borderTop: '1px solid rgba(79,209,232,0.2)' }
                : { bottom: -5, borderRight: '1px solid rgba(79,209,232,0.2)', borderBottom: '1px solid rgba(79,209,232,0.2)' }),
              left: pos ? pos.arrowLeft : '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 8,
              height: 8,
              background: '#0e1120',
            }}
          />
        </div>
      )}
    </div>
  );
}
