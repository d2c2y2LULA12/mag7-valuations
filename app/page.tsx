'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CARD_W, CARD_H, CardFront, HoloCardWrapper } from '@/components/TradingCard';
import StockDetail from '@/components/StockDetail';
import Sidebar, { HamburgerButton } from '@/components/Sidebar';
import { COMPANIES } from '@/lib/constants';
import { Company } from '@/lib/types';

type Phase = 'pack' | 'rolodex' | 'detail';

// ── Pack ──────────────────────────────────────────────────────────────────────

function buildTearPath(tearX: number, h: number): string {
  const segs = 14;
  let d = `M ${tearX} 0`;
  for (let i = 1; i <= segs; i++) {
    const y = (i / segs) * h;
    const jag = i % 2 === 0 ? 6 : -6;
    d += ` L ${tearX + jag} ${y}`;
  }
  return d;
}

function PackFace() {
  return (
    <div
      className="pack-face w-full h-full relative overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 24% 18%, rgba(79,209,232,0.12), transparent 28%), radial-gradient(circle at 78% 68%, rgba(255,54,168,0.09), transparent 30%), linear-gradient(180deg, #191e33 0%, #080a14 56%, #03040a 100%)',
        border: '1px solid rgba(79,209,232,0.34)',
        boxShadow:
          '0 28px 90px rgba(0,0,0,0.76), 0 0 46px rgba(79,209,232,0.2), inset 0 0 34px rgba(79,209,232,0.05), inset 0 0 1px rgba(79,209,232,0.22)',
      }}
    >
      <style jsx>{`
        @keyframes packHoloDrift {
          0% {
            transform: translate3d(-16%, -8%, 0) rotate(-6deg) scale(1.08);
            opacity: 0.42;
          }
          33% {
            transform: translate3d(3%, 2%, 0) rotate(3deg) scale(1.12);
            opacity: 0.52;
          }
          66% {
            transform: translate3d(-7%, 9%, 0) rotate(7deg) scale(1.1);
            opacity: 0.46;
          }
          100% {
            transform: translate3d(-16%, -8%, 0) rotate(-6deg) scale(1.08);
            opacity: 0.42;
          }
        }
        @keyframes packPrismSweep {
          0% { transform: translateX(-92%) skewX(-18deg); opacity: 0.06; }
          48% { opacity: 0.34; }
          100% { transform: translateX(128%) skewX(-18deg); opacity: 0.08; }
        }
        @keyframes packIridescentGlide {
          0%, 100% {
            transform: translate3d(-10%, -6%, 0) rotate(-9deg) scale(1.06);
            opacity: 0.28;
          }
          45% {
            transform: translate3d(8%, 4%, 0) rotate(-9deg) scale(1.1);
            opacity: 0.44;
          }
          70% {
            transform: translate3d(3%, 9%, 0) rotate(-9deg) scale(1.08);
            opacity: 0.34;
          }
        }
        @keyframes packPulse {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(79, 209, 232, 0.36));
            opacity: 0.34;
          }
          50% {
            filter: drop-shadow(0 0 24px rgba(79, 209, 232, 0.78));
            opacity: 0.5;
          }
        }
        @keyframes stripeGlow {
          0%, 100% {
            box-shadow:
              0 0 14px rgba(79, 209, 232, 0.28),
              0 0 30px rgba(79, 209, 232, 0.12);
            filter: brightness(1);
          }
          50% {
            box-shadow:
              0 0 22px rgba(79, 209, 232, 0.58),
              0 0 46px rgba(79, 209, 232, 0.22);
            filter: brightness(1.08);
          }
        }
        .pack-face {
          clip-path: polygon(
            0 6px,
            2.5% 0,
            5% 6px,
            7.5% 0,
            10% 6px,
            12.5% 0,
            15% 6px,
            17.5% 0,
            20% 6px,
            22.5% 0,
            25% 6px,
            27.5% 0,
            30% 6px,
            32.5% 0,
            35% 6px,
            37.5% 0,
            40% 6px,
            42.5% 0,
            45% 6px,
            47.5% 0,
            50% 6px,
            52.5% 0,
            55% 6px,
            57.5% 0,
            60% 6px,
            62.5% 0,
            65% 6px,
            67.5% 0,
            70% 6px,
            72.5% 0,
            75% 6px,
            77.5% 0,
            80% 6px,
            82.5% 0,
            85% 6px,
            87.5% 0,
            90% 6px,
            92.5% 0,
            95% 6px,
            97.5% 0,
            100% 6px,
            100% calc(100% - 6px),
            97.5% 100%,
            95% calc(100% - 6px),
            92.5% 100%,
            90% calc(100% - 6px),
            87.5% 100%,
            85% calc(100% - 6px),
            82.5% 100%,
            80% calc(100% - 6px),
            77.5% 100%,
            75% calc(100% - 6px),
            72.5% 100%,
            70% calc(100% - 6px),
            67.5% 100%,
            65% calc(100% - 6px),
            62.5% 100%,
            60% calc(100% - 6px),
            57.5% 100%,
            55% calc(100% - 6px),
            52.5% 100%,
            50% calc(100% - 6px),
            47.5% 100%,
            45% calc(100% - 6px),
            42.5% 100%,
            40% calc(100% - 6px),
            37.5% 100%,
            35% calc(100% - 6px),
            32.5% 100%,
            30% calc(100% - 6px),
            27.5% 100%,
            25% calc(100% - 6px),
            22.5% 100%,
            20% calc(100% - 6px),
            17.5% 100%,
            15% calc(100% - 6px),
            12.5% 100%,
            10% calc(100% - 6px),
            7.5% 100%,
            5% calc(100% - 6px),
            2.5% 100%,
            0 calc(100% - 6px)
          );
        }
      `}</style>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.07), transparent 18%, transparent 82%, rgba(255,255,255,0.06)), linear-gradient(90deg, rgba(255,255,255,0.035), transparent 30%, transparent 72%, rgba(255,255,255,0.04))',
        }}
      />

      <div
        className="absolute -inset-20 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 24% 18%, rgba(79,209,232,0.38), transparent 24%), radial-gradient(circle at 72% 36%, rgba(217,58,164,0.26), transparent 25%), radial-gradient(circle at 58% 82%, rgba(54,211,153,0.22), transparent 28%), linear-gradient(112deg, rgba(79,209,232,0.17), rgba(255,255,255,0.05) 42%, rgba(217,58,164,0.15) 60%, rgba(54,211,153,0.12))',
          mixBlendMode: 'screen',
          animation: 'packHoloDrift 6.4s ease-in-out infinite',
        }}
      />

      <div
        className="absolute -inset-12 pointer-events-none"
        style={{
          background:
            'linear-gradient(118deg, transparent 16%, rgba(79,209,232,0.2) 28%, rgba(96,165,250,0.12) 37%, transparent 48%), linear-gradient(132deg, transparent 42%, rgba(217,58,164,0.16) 52%, rgba(54,211,153,0.12) 61%, transparent 72%)',
          mixBlendMode: 'screen',
          animation: 'packIridescentGlide 7.8s ease-in-out infinite',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'repeating-linear-gradient(118deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 9px), repeating-linear-gradient(28deg, rgba(79,209,232,0.12) 0 1px, transparent 1px 12px), repeating-linear-gradient(64deg, rgba(217,58,164,0.06) 0 1px, transparent 1px 15px)',
          mixBlendMode: 'overlay',
          opacity: 0.5,
        }}
      />

      <div
        className="absolute -inset-y-10 -left-32 w-28 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), rgba(79,209,232,0.24), rgba(217,58,164,0.12), transparent)',
          mixBlendMode: 'screen',
          animation: 'packPrismSweep 5.6s ease-in-out infinite',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(132deg, transparent 12%, rgba(255,255,255,0.18) 13%, transparent 16%), linear-gradient(116deg, transparent 51%, rgba(79,209,232,0.2) 52%, rgba(255,255,255,0.2) 53%, transparent 56%), linear-gradient(154deg, transparent 70%, rgba(54,211,153,0.12) 71%, rgba(255,255,255,0.12) 72%, transparent 75%)',
          mixBlendMode: 'screen',
          opacity: 0.78,
        }}
      />

      <div
        className="absolute left-0 right-0 top-0 h-8 z-20 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.12), transparent 36%), repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0 1px, rgba(79,209,232,0.1) 1px 2px, transparent 2px 8px)',
          mixBlendMode: 'screen',
          opacity: 0.42,
        }}
      />
      <div
        className="absolute left-3 right-3 top-6 h-[3px] z-20 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(79,209,232,0.22) 45%, rgba(0,0,0,0.34))',
          boxShadow: '0 1px 0 rgba(255,255,255,0.08), 0 0 12px rgba(79,209,232,0.18)',
        }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 h-8 z-20 pointer-events-none"
        style={{
          background:
            'linear-gradient(0deg, rgba(255,255,255,0.1), transparent 36%), repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 1px, rgba(79,209,232,0.09) 1px 2px, transparent 2px 8px)',
          mixBlendMode: 'screen',
          opacity: 0.38,
        }}
      />
      <div
        className="absolute left-3 right-3 bottom-6 h-[3px] z-20 pointer-events-none"
        style={{
          background:
            'linear-gradient(0deg, rgba(255,255,255,0.14), rgba(79,209,232,0.2) 45%, rgba(0,0,0,0.36))',
          boxShadow: '0 -1px 0 rgba(255,255,255,0.07), 0 0 12px rgba(79,209,232,0.16)',
        }}
      />

      <div
        className="absolute left-4 right-4 top-12 bottom-11 pointer-events-none z-0"
        style={{
          border: '1px solid rgba(79,209,232,0.2)',
          boxShadow:
            'inset 0 0 28px rgba(79,209,232,0.1), 0 0 18px rgba(79,209,232,0.08)',
          background:
            'radial-gradient(ellipse at center, rgba(79,209,232,0.08), transparent 60%)',
        }}
      />

      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
        style={{
          color: 'rgba(125,231,255,0.34)',
          fontSize: 348,
          fontWeight: 950,
          lineHeight: 1,
          transform: 'translate(5px, -2px) scaleX(1.02)',
          textShadow:
            '0 0 24px rgba(125,231,255,0.56), 0 0 68px rgba(79,209,232,0.34), 0 2px 0 rgba(255,255,255,0.08), 0 -2px 0 rgba(0,0,0,0.42)',
          animation: 'packPulse 4.2s ease-in-out infinite',
        }}
      >
        7
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 22% 16%, rgba(255,255,255,0.13), transparent 20%), radial-gradient(circle at 82% 72%, rgba(79,209,232,0.14), transparent 27%), linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025) 31%, transparent 56%)',
          mixBlendMode: 'screen',
        }}
      />

      <div className="relative z-10 h-full flex flex-col items-center justify-between px-4 py-12 text-center">
        <div
          className="w-[calc(100%+8px)] mt-2 py-2 border-y"
          style={{
            background:
              'linear-gradient(90deg, rgba(79,209,232,0.02), rgba(79,209,232,0.82) 20%, rgba(170,244,255,0.96) 50%, rgba(79,209,232,0.82) 80%, rgba(79,209,232,0.02))',
            borderColor: 'rgba(79,209,232,0.42)',
            color: '#041018',
            animation: 'stripeGlow 3.2s ease-in-out infinite',
            textShadow: '0 1px 0 rgba(255,255,255,0.25)',
          }}
        >
          <p className="text-[10px] font-black tracking-[0.26em] uppercase">LARGE-CAP · BLUE CHIP</p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(79,209,232,0.58), transparent)' }} />
          <h2
            className="text-[1.62rem] font-black text-white leading-[0.88] uppercase text-center whitespace-nowrap"
            style={{
              letterSpacing: '0.02em',
              transform: 'scaleX(0.9)',
              transformOrigin: 'center',
              textShadow:
                '0 2px 0 rgba(0,0,0,0.5), 0 0 14px rgba(255,255,255,0.16), 0 0 24px rgba(79,209,232,0.34)',
            }}
          >
            MAGNIFICENT<br />
            <span style={{ color: '#ECFEFF' }}>SEVEN</span>
          </h2>
          <div className="w-20 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(79,209,232,0.58), transparent)' }} />
        </div>

        <div>
          <div className="flex justify-center gap-1 mb-3">
            {['META', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'NVDA', 'TSLA'].map(t => (
              <span key={t} className="text-[7px] font-black tracking-wider text-white/38">{t}</span>
            ))}
          </div>
          <p className="text-[9px] font-black tracking-[0.25em] uppercase text-white/62">
            7 CARDS · MAG 7 COLLECTION
          </p>
        </div>
      </div>
    </div>
  );
}

function PackScene({ onComplete }: { onComplete: () => void }) {
  const PACK_W = 264;
  const PACK_H = 414;

  const tearRef = useRef(0);
  const [tearDisplay, setTearDisplay] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const completed = useRef(false);
  const [hint, setHint] = useState(true);

  const tearX = tearDisplay * PACK_W;

  const onDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX - tearRef.current * PACK_W;
    setHint(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const p = Math.max(0, Math.min(1, (e.clientX - startX.current) / PACK_W));
    tearRef.current = p;
    setTearDisplay(p);
    if (p >= 0.95 && !completed.current) {
      completed.current = true;
      setTimeout(onComplete, 380);
    }
  };

  const onUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (!completed.current && tearRef.current < 0.55) {
      tearRef.current = 0;
      setTearDisplay(0);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#0a0a0a' }}>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute left-0 right-0 top-12 z-10 px-4 text-center sm:top-16"
      >
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white mb-2">
          Mag 7 <span style={{ color: '#4FD1E8' }}>Valuations</span>
        </h1>
        <p className="text-gray-300 text-base font-medium tracking-wide">
          Click and drag right to tear open the pack
        </p>
      </motion.div>

      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: PACK_W, height: PACK_H, transform: 'translate(-50%, -50%)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          whileHover={{
            scale: 1.035,
            rotate: [0, -1.2, 1.2, -0.7, 0.7, 0],
            transition: { duration: 0.42, ease: 'easeInOut' },
          }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 22 }}
          className="relative select-none"
          style={{ width: PACK_W, height: PACK_H, cursor: 'ew-resize' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {/* Left half */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: `polygon(0 0, ${tearX}px 0, ${tearX}px ${PACK_H}px, 0 ${PACK_H}px)`,
              transform: `translateX(${-tearDisplay * 34}px)`,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <PackFace />
          </div>

          {/* Right half */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: `polygon(${tearX}px 0, ${PACK_W}px 0, ${PACK_W}px ${PACK_H}px, ${tearX}px ${PACK_H}px)`,
              transform: `translateX(${tearDisplay * 34}px)`,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <PackFace />
          </div>

          {/* Tear glow */}
          {tearDisplay > 0.01 && tearDisplay < 0.99 && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width={PACK_W}
              height={PACK_H}
              style={{ overflow: 'visible' }}
            >
              <defs>
                <filter id="tear-glow">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <path
                d={buildTearPath(tearX, PACK_H)}
                stroke="rgba(255,255,255,0.75)"
                strokeWidth="1.5"
                fill="none"
                filter="url(#tear-glow)"
              />
            </svg>
          )}

          {/* Drag hint */}
          {hint && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              animate={{ opacity: [0, 0.7, 0] }}
              transition={{ delay: 1.2, duration: 1.6, repeat: Infinity, repeatDelay: 0.8 }}
            >
              <span className="text-xs tracking-widest text-gray-500">← drag →</span>
            </motion.div>
          )}
        </motion.div>

        {/* Tear progress bar */}
        <div
          className="absolute left-1/2 w-28 -translate-x-1/2 overflow-hidden rounded-full h-0.5"
          style={{ top: PACK_H + 32, background: 'rgba(255,255,255,0.05)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: '#4FD1E8', width: `${tearDisplay * 100}%` }}
            transition={{ duration: 0.04 }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Rolodex ───────────────────────────────────────────────────────────────────

const ARC_SPACING = 194;
const ARC_CURVE = 28;

function getArcT(offset: number) {
  const abs = Math.abs(offset);
  return {
    x: offset * ARC_SPACING,
    y: abs * abs * ARC_CURVE,
    scale: 1 - abs * 0.075,
    rotateY: offset * 13,
    zIndex: 20 - Math.round(abs * 2),
    opacity: abs > 3.3 ? 0 : 1,
  };
}

function RolodexScene({
  onSelectCompany,
  onOpenSidebar,
}: {
  onSelectCompany: (c: Company) => void;
  onOpenSidebar: () => void;
}) {
  const n = COMPANIES.length;
  const [centerIdx, setCenterIdx] = useState(0);
  const [isIntro, setIsIntro] = useState(true);
  const touchStartX = useRef(0);

  // End intro after cards have flown in
  useEffect(() => {
    const t = setTimeout(() => setIsIntro(false), 1200);
    return () => clearTimeout(t);
  }, []);

  // Wheel rotation
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setCenterIdx(i => (i + (e.deltaY > 0 ? 1 : -1) + n) % n);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [n]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) setCenterIdx(i => (i + (delta > 0 ? 1 : -1) + n) % n);
  }, [n]);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex-shrink-0 pt-6 px-6">
        <HamburgerButton onClick={onOpenSidebar} />
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-center mt-4"
        >
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-2 text-white">
            Mag 7 <span style={{ color: '#4FD1E8' }}>Valuations</span>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg">
            Scroll or swipe to browse · Click to dive in
          </p>
        </motion.div>
      </div>

      {/* Arc */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        style={{ perspective: '1100px' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative" style={{ width: CARD_W, height: CARD_H }}>
          {COMPANIES.map((company, i) => {
            let offset = i - centerIdx;
            if (offset > n / 2) offset -= n;
            if (offset < -n / 2) offset += n;
            const t = getArcT(offset);
            const abs = Math.abs(offset);
            const isCenter = offset === 0;

            return (
              <motion.div
                key={company.ticker}
                className="absolute inset-0"
                initial={isIntro ? { x: 0, y: 60, scale: 0.15, opacity: 0, rotateY: 0 } : false}
                animate={{
                  x: t.x,
                  y: t.y,
                  scale: t.scale,
                  rotateY: t.rotateY,
                  zIndex: t.zIndex,
                  opacity: t.opacity,
                }}
                transition={{
                  type: 'spring',
                  stiffness: isIntro ? 180 : 280,
                  damping: isIntro ? 22 : 30,
                  delay: isIntro ? abs * 0.09 : 0,
                }}
              >
                <HoloCardWrapper
                  width={CARD_W}
                  height={CARD_H}
                  onClick={isCenter ? () => onSelectCompany(company) : () => setCenterIdx(i)}
                >
                  <CardFront company={company} cardW={CARD_W} />
                </HoloCardWrapper>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Current card label */}
      <motion.div
        key={centerIdx}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-center pb-3"
      >
        <p className="text-sm font-semibold text-white">{COMPANIES[centerIdx].name}</p>
        <p className="text-xs text-gray-600 mt-0.5">{COMPANIES[centerIdx].ticker} · Click to view</p>
      </motion.div>

      {/* Footer */}
      <div className="flex-shrink-0 pb-5 px-6 text-center text-xs text-gray-700">
        Data: Yahoo Finance
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [phase, setPhase] = useState<Phase>('pack');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleTearComplete = useCallback(() => setPhase('rolodex'), []);

  const handleSelectCompany = useCallback((company: Company) => {
    setSelectedCompany(company);
    setPhase('detail');
  }, []);

  const handleBack = useCallback(() => {
    setPhase('rolodex');
    setSelectedCompany(null);
  }, []);

  const handleNavigateToCompany = useCallback((company: Company) => {
    setSelectedCompany(company);
    setPhase('detail');
    setSidebarOpen(false);
  }, []);

  const handleNavigateHome = useCallback(() => {
    setPhase('rolodex');
    setSelectedCompany(null);
    setSidebarOpen(false);
  }, []);

  return (
    <>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigateHome={handleNavigateHome}
        onNavigateToCompany={handleNavigateToCompany}
      />

      <div className="relative" style={{ minHeight: '100vh', background: '#0a0a0a' }}>
        <AnimatePresence>
          {phase === 'pack' && (
            <motion.div
              key="pack"
              className="absolute inset-0"
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.35 }}
            >
              <PackScene onComplete={handleTearComplete} />
            </motion.div>
          )}

          {phase === 'rolodex' && (
            <motion.div
              key="rolodex"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <RolodexScene
                onSelectCompany={handleSelectCompany}
                onOpenSidebar={() => setSidebarOpen(true)}
              />
            </motion.div>
          )}

          {phase === 'detail' && selectedCompany && (
            <motion.div
              key={`detail-${selectedCompany.ticker}`}
              className="absolute top-0 left-0 right-0"
              style={{ minHeight: '100vh', overflowY: 'auto' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <StockDetail
                company={selectedCompany}
                onBack={handleBack}
                onOpenSidebar={() => setSidebarOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
