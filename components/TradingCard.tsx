'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Company, StockData, ValuationSignal } from '@/lib/types';
import { getValuationSignal, formatBig, formatPercent, formatPrice } from '@/lib/constants';

export const CARD_W = 186;
export const CARD_H = 254;

// ── Inline SVG logos ──────────────────────────────────────────────────────────

function MsftLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect x="0"  y="0"  width="40" height="40" fill="#F25022"/>
      <rect x="48" y="0"  width="40" height="40" fill="#7FBA00"/>
      <rect x="0"  y="48" width="40" height="40" fill="#00A4EF"/>
      <rect x="48" y="48" width="40" height="40" fill="#FFB900"/>
    </svg>
  );
}

function GooglLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function MetaLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0866FF">
      <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"/>
    </svg>
  );
}

function AaplLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#A2AAAD">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
    </svg>
  );
}

function NvdaLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#76B900">
      <path d="M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z"/>
    </svg>
  );
}

function TslaLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#E31937">
      <path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362l-.004.002H12v-.002zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46v.003z"/>
    </svg>
  );
}

export function CompanyLogo({ company, size }: { company: Company; size: number }) {
  if (company.ticker === 'MSFT')  return <MsftLogo size={size} />;
  if (company.ticker === 'GOOGL') return <GooglLogo size={size} />;
  if (company.ticker === 'META')  return <MetaLogo size={size} />;
  if (company.ticker === 'AAPL')  return <AaplLogo size={size} />;
  if (company.ticker === 'NVDA')  return <NvdaLogo size={size} />;
  if (company.ticker === 'TSLA')  return <TslaLogo size={size} />;
  if (company.ticker === 'AMZN') return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/Amazon_icon.svg.png" alt="Amazon" width={size} height={size} style={{ objectFit: 'contain' }} />
  );
  return null;
}

// ── Card faces ────────────────────────────────────────────────────────────────

export function CardFront({ company, cardW }: { company: Company; cardW: number }) {
  const logoSize = Math.round(cardW * 0.5);
  return (
    <div className="card-navy-base relative w-full h-full rounded-xl overflow-hidden flex flex-col items-center justify-center">
      <div className="card-glass-sheen" />
      <div className="card-shimmer" />
      <div className="relative z-10 flex items-center justify-center">
        <CompanyLogo company={company} size={logoSize} />
      </div>
      <p className="relative z-10 mt-4 text-sm font-black tracking-widest uppercase"
        style={{ color: 'rgba(255, 255, 255, 0.12)' }}>
        {company.ticker}
      </p>
      <div className="card-emboss" />
    </div>
  );
}

function StatRow({ label, value, badge }: { label: string; value: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-gray-500 text-xs">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-gray-200 text-xs font-medium tabular-nums">{value}</span>
        {badge}
      </div>
    </div>
  );
}

export function CardBack({ company, data, loading }: { company: Company; data: StockData | null; loading: boolean }) {
  const signal: ValuationSignal = data ? getValuationSignal(data.forwardPE) : 'N/A';
  const signalClass =
    signal === 'CHEAP' ? 'badge-cheap' : signal === 'FAIR' ? 'badge-fair' : signal === 'RICH' ? 'badge-rich' : 'badge-na';

  const fwdPE     = data?.forwardPE    != null ? `${data.forwardPE.toFixed(1)}x`              : 'N/A';
  const revGrowth = data?.revenueGrowth != null ? `${(data.revenueGrowth * 100).toFixed(1)}%` : 'N/A';
  const profitMgn = data?.profitMargin  != null ? `${(data.profitMargin * 100).toFixed(1)}%`  : 'N/A';

  return (
    <div className="card-navy-base relative w-full h-full rounded-xl overflow-hidden flex flex-col p-4">
      <div className="card-glass-sheen" />
      <div className="card-emboss" />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <CompanyLogo company={company} size={16} />
          <span className="text-xs font-bold tracking-wider" style={{ color: company.brandColor }}>
            {company.ticker}
          </span>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col gap-2 justify-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-3 rounded" style={{ width: `${75 + (i % 3) * 10}%`, opacity: 0.7 }} />
            ))}
          </div>
        ) : data ? (
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <StatRow label="Price"      value={formatPrice(data.price)} />
              <StatRow
                label="Fwd P/E"
                value={fwdPE}
                badge={
                  <span className={`text-[8px] px-1 py-0.5 rounded font-black tracking-wider ${signalClass}`}>
                    {signal}
                  </span>
                }
              />
              <StatRow label="Mkt Cap"    value={formatBig(data.marketCap)} />
              <StatRow label="Rev Growth" value={revGrowth} />
              <StatRow label="Prft Mrgn"  value={profitMgn} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-600">No data</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared holographic wrapper — used by both homepage cards and pinned detail cards ──

export function HoloCardWrapper({
  children,
  width,
  height,
  onClick,
}: {
  children: React.ReactNode;
  width: number;
  height: number;
  onClick?: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const wiggleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [wiggling, setWiggling] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    return () => {
      if (wiggleTimerRef.current) clearTimeout(wiggleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setWiggling(false);
        setIsHovered(false);
        const w = wrapperRef.current;
        if (w) {
          w.style.setProperty('--rotate-x', '0deg');
          w.style.setProperty('--rotate-y', '0deg');
          w.style.setProperty('--holo-x', '50%');
          w.style.setProperty('--holo-y', '50%');
        }
        setResetKey(k => k + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    wrapper.style.setProperty('--holo-x', `${x * 100}%`);
    wrapper.style.setProperty('--holo-y', `${y * 100}%`);
    wrapper.style.setProperty('--holo-angle', `${x * 360}deg`);
    wrapper.style.setProperty('--rotate-x', `${(y - 0.5) * 18}deg`);
    wrapper.style.setProperty('--rotate-y', `${(x - 0.5) * -18}deg`);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (wiggleTimerRef.current) clearTimeout(wiggleTimerRef.current);
    setWiggling(true);
    wiggleTimerRef.current = setTimeout(() => setWiggling(false), 500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    const w = wrapperRef.current;
    if (!w) return;
    w.style.setProperty('--rotate-x', '0deg');
    w.style.setProperty('--rotate-y', '0deg');
    w.style.setProperty('--holo-x', '50%');
    w.style.setProperty('--holo-y', '50%');
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="card-holo-wrapper"
      style={{ width, height, cursor: onClick ? 'pointer' : 'default' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* whileTap intentionally omitted — it intercepts pointer events and can freeze after browser tab sleeps */}
      <motion.div
        key={resetKey}
        className="card-holo-inner w-full h-full"
        animate={
          wiggling
            ? { rotate: [0, -3, 3, -2, 2, -1, 1, 0], transition: { duration: 0.45, ease: 'easeInOut' } }
            : { rotate: 0 }
        }
      >
        {children}
        <div className="card-foil" />
        <div className="card-glare" />
        {isHovered && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ boxShadow: '0 0 0 1px rgba(79,209,232,0.5), 0 0 40px rgba(79,209,232,0.18)', zIndex: 5 }}
          />
        )}
      </motion.div>
    </div>
  );
}

// ── MiniCard — full-size holographic card used in detail view left column ─────

export function MiniCard({
  company,
  data,
  loading,
  face,
}: {
  company: Company;
  data: StockData | null;
  loading: boolean;
  face: 'front' | 'back';
}) {
  return (
    <HoloCardWrapper width={CARD_W} height={CARD_H}>
      {face === 'front' ? (
        <CardFront company={company} cardW={CARD_W} />
      ) : (
        <CardBack company={company} data={data} loading={loading} />
      )}
    </HoloCardWrapper>
  );
}

// ── Main interactive landing card ─────────────────────────────────────────────

export default function TradingCard({
  company,
  onClick,
  isSelected,
  isOtherSelected,
}: {
  company: Company;
  onClick: () => void;
  isSelected: boolean;
  isOtherSelected: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      animate={{
        opacity: isOtherSelected ? 0 : 1,
        scale:   isOtherSelected ? 0.85 : 1,
        filter:  isOtherSelected ? 'blur(2px)' : 'none',
      }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      style={{ display: isSelected ? 'none' : 'block' }}
    >
      <HoloCardWrapper width={CARD_W} height={CARD_H} onClick={onClick}>
        <CardFront company={company} cardW={CARD_W} />
      </HoloCardWrapper>
    </motion.div>
  );
}
