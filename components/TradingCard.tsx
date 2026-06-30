'use client';

import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Company, StockData, ValuationSignal } from '@/lib/types';
import { getValuationSignal, formatBig, formatPercent, formatPrice } from '@/lib/constants';

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

function AmznLogo({ size }: { size: number }) {
  // Black 'a' with orange smile — uses near-black stroke for brand correctness
  return (
    <svg width={size} height={size} viewBox="0 0 100 110" fill="none">
      {/* lowercase 'a' — dark, blends with navy card */}
      <circle cx="46" cy="44" r="26" stroke="#0d1120" strokeWidth="11" fill="none"/>
      <line x1="72" y1="19" x2="72" y2="68" stroke="#0d1120" strokeWidth="11" strokeLinecap="round"/>
      {/* orange smile arrow */}
      <path d="M10 86 Q50 106 88 86" stroke="#FF9900" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <path d="M80 80 L88 86 L80 92" stroke="#FF9900" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function CompanyLogo({ company, size }: { company: Company; size: number }) {
  if (company.ticker === 'MSFT') return <MsftLogo size={size} />;
  if (company.ticker === 'GOOGL') return <GooglLogo size={size} />;
  if (company.ticker === 'AMZN') return <AmznLogo size={size} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.simpleicons.org/${company.iconSlug}/${company.brandColor.replace('#', '')}`}
      alt={company.shortName}
      width={size}
      height={size}
      style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.12))' }}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

// ── Card front ────────────────────────────────────────────────────────────────

function CardFront({ company, cardW }: { company: Company; cardW: number }) {
  const logoSize = Math.round(cardW * 0.5);
  return (
    <div
      className="card-navy-base relative w-full h-full rounded-xl overflow-hidden flex flex-col items-center justify-center"
    >
      <div className="card-glass-sheen" />
      <div className="card-shimmer" />
      <div className="relative z-10 flex items-center justify-center">
        <CompanyLogo company={company} size={logoSize} />
      </div>
      <p
        className="relative z-10 mt-4 text-sm font-black tracking-widest uppercase"
        style={{ color: 'rgba(255, 255, 255, 0.12)' }}
      >
        {company.ticker}
      </p>
      <div className="card-emboss" />
    </div>
  );
}

// ── Card back ─────────────────────────────────────────────────────────────────

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

function CardBack({ company, data, loading }: { company: Company; data: StockData | null; loading: boolean }) {
  const signal: ValuationSignal = data ? getValuationSignal(data.forwardPE) : 'N/A';
  const signalClass =
    signal === 'CHEAP' ? 'badge-cheap' : signal === 'FAIR' ? 'badge-fair' : signal === 'RICH' ? 'badge-rich' : 'badge-na';

  const fwdPE = data?.forwardPE != null ? `${data.forwardPE.toFixed(1)}x` : 'N/A';
  const revGrowth = data?.revenueGrowth != null ? `${(data.revenueGrowth * 100).toFixed(1)}%` : 'N/A';
  const profitMgn = data?.profitMargin != null ? `${(data.profitMargin * 100).toFixed(1)}%` : 'N/A';

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
              <StatRow label="Price" value={formatPrice(data.price)} />
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

// ── Mini card (detail view) — includes static holographic effects ─────────────

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
  const w = 130;
  const h = 182;

  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 10,
        overflow: 'hidden',
        flexShrink: 0,
        border: '1px solid rgba(79, 209, 232, 0.4)',
        boxShadow: 'inset 0 0 20px rgba(79, 209, 232, 0.06), 0 0 20px rgba(79, 209, 232, 0.08)',
        position: 'relative',
      }}
    >
      {face === 'front' ? (
        <div
          className="w-full h-full flex flex-col items-center justify-center relative"
          style={{ background: 'linear-gradient(to bottom, #1a1f35 0%, #0a0a14 100%)' }}
        >
          {/* Glass sheen */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 30%, transparent 55%)',
              zIndex: 1,
            }}
          />
          {/* Static holographic foil */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: [
                'linear-gradient(135deg,',
                'hsla(0,100%,65%,0.1) 0%,',
                'hsla(60,100%,65%,0.1) 25%,',
                'hsla(180,100%,65%,0.1) 50%,',
                'hsla(270,100%,65%,0.1) 75%,',
                'hsla(360,100%,65%,0.1) 100%)',
              ].join(' '),
              mixBlendMode: 'screen' as const,
              zIndex: 2,
            }}
          />
          {/* Shimmer */}
          <div className="card-shimmer" style={{ zIndex: 1 }} />
          <div style={{ position: 'relative', zIndex: 3 }}>
            <CompanyLogo company={company} size={52} />
          </div>
          <p
            className="text-xs font-black tracking-widest mt-2 relative"
            style={{ color: 'rgba(255,255,255,0.12)', zIndex: 3 }}
          >
            {company.ticker}
          </p>
          <div className="card-emboss" style={{ zIndex: 4 }} />
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%' }}>
          <CardBack company={company} data={data} loading={loading} />
        </div>
      )}
    </div>
  );
}

// ── Main landing card ─────────────────────────────────────────────────────────

export const CARD_W = 220;
export const CARD_H = 300;

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [wiggling, setWiggling] = useState(false);

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
    setWiggling(true);
    setTimeout(() => setWiggling(false), 500);
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
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      animate={{
        opacity: isOtherSelected ? 0 : 1,
        scale: isOtherSelected ? 0.85 : 1,
        filter: isOtherSelected ? 'blur(2px)' : 'none',
      }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      style={{ display: isSelected ? 'none' : 'block' }}
    >
      <div
        ref={wrapperRef}
        className="card-holo-wrapper cursor-pointer"
        style={{ width: CARD_W, height: CARD_H }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        <motion.div
          className="card-holo-inner w-full h-full"
          animate={
            wiggling
              ? { rotate: [0, -3, 3, -2, 2, -1, 1, 0], transition: { duration: 0.45, ease: 'easeInOut' } }
              : { rotate: 0 }
          }
          whileTap={{ scale: 0.95 }}
        >
          <CardFront company={company} cardW={CARD_W} />
          <div className="card-foil" />
          <div className="card-glare" />
          {isHovered && (
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                boxShadow: '0 0 0 1px rgba(79,209,232,0.5), 0 0 40px rgba(79,209,232,0.18)',
                zIndex: 5,
              }}
            />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
