'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TradingCard, { CARD_W, CARD_H } from '@/components/TradingCard';
import StockDetail from '@/components/StockDetail';
import Sidebar, { HamburgerButton } from '@/components/Sidebar';
import { COMPANIES } from '@/lib/constants';
import { Company } from '@/lib/types';

type Phase = 'grid' | 'flipping' | 'detail';

function FlipCard({ company, onDone }: { company: Company; onDone: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const called = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFlipped(true), 60);
    const t2 = setTimeout(() => {
      if (!called.current) { called.current = true; onDone(); }
    }, 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className="card-flip-container" style={{ width: CARD_W, height: CARD_H }}>
      <div className={`card-flip-inner w-full h-full ${flipped ? 'flipped' : ''}`}>
        <div
          className="card-face card-navy-base flex items-center justify-center flex-col"
          style={{ borderRadius: 12 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://cdn.simpleicons.org/${company.iconSlug}/${company.brandColor.replace('#', '')}`}
            alt={company.shortName}
            width={80}
            height={80}
            style={{ objectFit: 'contain', position: 'relative', zIndex: 1 }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <p style={{ position: 'relative', zIndex: 1, marginTop: 10, fontSize: 10, letterSpacing: '0.2em', opacity: 0.2, textTransform: 'uppercase', color: 'white' }}>
            {company.ticker}
          </p>
        </div>

        <div
          className="card-face card-face-back card-navy-base flex items-center justify-center"
          style={{ borderRadius: 12 }}
        >
          <div
            className="rounded-full border-2 animate-spin"
            style={{ width: 28, height: 28, borderColor: `${company.brandColor} transparent transparent transparent` }}
          />
        </div>
      </div>
    </div>
  );
}

// Renders cards for one row, shared props handled by parent
function CardRow({
  companies,
  selectedTicker,
  flipping,
  onClick,
}: {
  companies: Company[];
  selectedTicker: string | null;
  flipping: boolean;
  onClick: (c: Company) => void;
}) {
  return (
    <div className="flex gap-5 justify-center">
      {companies.map((company) => (
        <TradingCard
          key={company.ticker}
          company={company}
          onClick={() => onClick(company)}
          isSelected={selectedTicker === company.ticker}
          isOtherSelected={flipping && selectedTicker !== company.ticker}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [phase, setPhase] = useState<Phase>('grid');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const handleNavigateToCompany = useCallback((company: Company) => {
    setSelectedCompany(company);
    setPhase('detail');
  }, []);

  const handleNavigateHome = useCallback(() => {
    setPhase('grid');
    setSelectedCompany(null);
  }, []);

  const formattedTime = lastUpdated.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const flipping = phase === 'flipping';
  const selectedTicker = selectedCompany?.ticker ?? null;

  return (
    <>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigateHome={handleNavigateHome}
        onNavigateToCompany={handleNavigateToCompany}
      />

      <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
        <AnimatePresence mode="wait">
          {/* ── GRID VIEW ───────────────────────────────────────────── */}
          {(phase === 'grid' || phase === 'flipping') && (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              {/* Dark overlay + flip card during transition */}
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

              <div className="min-h-screen flex flex-col px-4 pt-4 pb-8">
                {/* Hamburger */}
                <div className="self-start">
                  <HamburgerButton onClick={() => setSidebarOpen(true)} />
                </div>

                {/* Title — minimal top padding */}
                <motion.div
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="text-center mt-3 mb-8"
                >
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 text-white">
                    Mag 7 <span style={{ color: '#4FD1E8' }}>Valuations</span>
                  </h1>
                  <p className="text-gray-500 text-sm">
                    Live financials for the Magnificent Seven. Click a card to dive in.
                  </p>
                </motion.div>

                {/* ── Desktop: single row ────────────────────────────── */}
                <motion.div
                  className="hidden md:block w-full overflow-x-auto pb-4"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.12 }}
                >
                  <div
                    className="flex gap-5 justify-center mx-auto"
                    style={{ minWidth: COMPANIES.length * (CARD_W + 20) }}
                  >
                    {COMPANIES.map((company) => (
                      <TradingCard
                        key={company.ticker}
                        company={company}
                        onClick={() => handleCardClick(company)}
                        isSelected={selectedTicker === company.ticker}
                        isOtherSelected={flipping && selectedTicker !== company.ticker}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* ── Mobile: 4 top + 3 bottom ──────────────────────── */}
                <motion.div
                  className="md:hidden flex flex-col gap-4 items-center w-full"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.12 }}
                >
                  {/* Row 1: first 4 */}
                  <div className="w-full overflow-x-auto pb-2">
                    <div
                      className="flex gap-4 justify-center"
                      style={{ minWidth: 4 * (CARD_W + 16) }}
                    >
                      {COMPANIES.slice(0, 4).map((company) => (
                        <TradingCard
                          key={company.ticker}
                          company={company}
                          onClick={() => handleCardClick(company)}
                          isSelected={selectedTicker === company.ticker}
                          isOtherSelected={flipping && selectedTicker !== company.ticker}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Row 2: last 3, centered */}
                  <div className="w-full overflow-x-auto pb-2">
                    <div
                      className="flex gap-4 justify-center"
                      style={{ minWidth: 3 * (CARD_W + 16) }}
                    >
                      {COMPANIES.slice(4).map((company) => (
                        <TradingCard
                          key={company.ticker}
                          company={company}
                          onClick={() => handleCardClick(company)}
                          isSelected={selectedTicker === company.ticker}
                          isOtherSelected={flipping && selectedTicker !== company.ticker}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Footer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8 flex items-center justify-center gap-4 text-xs text-gray-600"
                >
                  <span>Updated {formattedTime}</span>
                  <span>&middot;</span>
                  <button
                    onClick={() => setLastUpdated(new Date())}
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

          {/* ── DETAIL VIEW ─────────────────────────────────────────── */}
          {phase === 'detail' && selectedCompany && (
            <motion.div
              key={`detail-${selectedCompany.ticker}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
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
