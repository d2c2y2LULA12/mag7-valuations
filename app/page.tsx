'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TradingCard, { CARD_W, CARD_H } from '@/components/TradingCard';
import StockDetail from '@/components/StockDetail';
import { COMPANIES } from '@/lib/constants';
import { Company } from '@/lib/types';

type Phase = 'grid' | 'flipping' | 'detail';

function FlipCard({
  company,
  onDone,
}: {
  company: Company;
  onDone: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const called = useRef(false);

  useEffect(() => {
    // Start flip after a tick
    const t1 = setTimeout(() => setFlipped(true), 60);
    // Navigate to detail after flip completes
    const t2 = setTimeout(() => {
      if (!called.current) {
        called.current = true;
        onDone();
      }
    }, 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const cardW = CARD_W;
  const cardH = CARD_H;

  return (
    <div
      className="card-flip-container"
      style={{ width: cardW, height: cardH }}
    >
      <div className={`card-flip-inner w-full h-full ${flipped ? 'flipped' : ''}`}>
        {/* Front */}
        <div
          className="card-face"
          style={{
            background: 'linear-gradient(145deg, #0d0d1a, #111127)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            border: '1px solid #1e1e3a',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: company.cardTint, borderRadius: 12 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://cdn.simpleicons.org/${company.iconSlug}/${company.brandColor.replace('#', '')}`}
            alt={company.shortName}
            width={80}
            height={80}
            style={{ objectFit: 'contain', position: 'relative', zIndex: 1 }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <p style={{ position: 'relative', zIndex: 1, marginTop: 10, fontSize: 10, letterSpacing: '0.2em', opacity: 0.4, textTransform: 'uppercase' }}>
            {company.ticker}
          </p>
        </div>

        {/* Back (loading state shown during flip) */}
        <div
          className="card-face card-face-back"
          style={{
            background: 'linear-gradient(145deg, #0d0d1a, #111127)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #1e1e3a',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: company.cardTint, borderRadius: 12 }} />
          <div
            className="animate-spin rounded-full border-2 border-t-transparent"
            style={{ width: 28, height: 28, borderColor: `${company.brandColor} transparent transparent transparent` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [phase, setPhase] = useState<Phase>('grid');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const handleCardClick = useCallback((company: Company) => {
    setSelectedCompany(company);
    setPhase('flipping');
  }, []);

  const handleFlipDone = useCallback(() => {
    setPhase('detail');
  }, []);

  const handleBack = useCallback(() => {
    setPhase('grid');
    setSelectedCompany(null);
  }, []);

  const handleRefresh = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  const formattedTime = lastUpdated.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <AnimatePresence mode="wait">
        {/* ── GRID VIEW ──────────────────────────────────────────── */}
        {(phase === 'grid' || phase === 'flipping') && (
          <motion.div
            key="grid-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            {/* Dark overlay during flip */}
            <AnimatePresence>
              {phase === 'flipping' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-40 flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.88)' }}
                >
                  {selectedCompany && (
                    <FlipCard company={selectedCompany} onDone={handleFlipDone} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Full-height centered layout */}
            <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-10"
              >
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3 text-white">
                  Mag 7 <span style={{ color: '#4FD1E8' }}>Valuations</span>
                </h1>
                <p className="text-gray-500 text-sm">
                  Live financials for the Magnificent Seven. Click a card to dive in.
                </p>
              </motion.div>

              {/* Single row — scrollable on small screens */}
              <motion.div
                className="w-full overflow-x-auto pb-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <div
                  className="flex justify-center gap-5 mx-auto"
                  style={{ minWidth: COMPANIES.length * (CARD_W + 20) }}
                >
                  {COMPANIES.map((company) => (
                    <TradingCard
                      key={company.ticker}
                      company={company}
                      onClick={() => handleCardClick(company)}
                      isSelected={selectedCompany?.ticker === company.ticker}
                      isOtherSelected={
                        phase === 'flipping' && selectedCompany?.ticker !== company.ticker
                      }
                    />
                  ))}
                </div>
              </motion.div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-10 flex items-center gap-4 text-xs text-gray-600"
              >
                <span>Updated {formattedTime}</span>
                <span>&middot;</span>
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1.5 hover:text-[#4FD1E8] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.5 2.5A4.5 4.5 0 1 0 11 6" />
                    <path d="M9 1l2 1.5-1.5 2" />
                  </svg>
                  Refresh
                </button>
                <span>&middot;</span>
                <span>Data: Yahoo Finance</span>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ── DETAIL VIEW ────────────────────────────────────────── */}
        {phase === 'detail' && selectedCompany && (
          <motion.div
            key={`detail-${selectedCompany.ticker}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StockDetail company={selectedCompany} onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
