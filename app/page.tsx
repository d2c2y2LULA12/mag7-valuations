'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TradingCard, { CARD_W, CARD_H, CardFront, HoloCardWrapper } from '@/components/TradingCard';
import StockDetail from '@/components/StockDetail';
import Sidebar, { HamburgerButton } from '@/components/Sidebar';
import { COMPANIES } from '@/lib/constants';
import { Company } from '@/lib/types';

type Phase = 'grid' | 'flipping' | 'detail';

// Standalone flip animation — shown full-screen during card→detail transition
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
        {/* Front */}
        <div className="card-face card-navy-base rounded-xl flex items-center justify-center flex-col overflow-hidden">
          <HoloCardWrapper width={CARD_W} height={CARD_H}>
            <CardFront company={company} cardW={CARD_W} />
          </HoloCardWrapper>
        </div>
        {/* Back (loading state) */}
        <div className="card-face card-face-back card-navy-base rounded-xl flex items-center justify-center overflow-hidden">
          <div
            className="rounded-full border-2 animate-spin"
            style={{ width: 28, height: 28, borderColor: `${company.brandColor} transparent transparent transparent` }}
          />
        </div>
      </div>
    </div>
  );
}

// Grid of cards rendered on the homepage — split into rows for mobile
function CardGrid({
  companies,
  selectedTicker,
  flipping,
  onCardClick,
}: {
  companies: Company[];
  selectedTicker: string | null;
  flipping: boolean;
  onCardClick: (c: Company) => void;
}) {
  const cardProps = (company: Company) => ({
    company,
    onClick: () => onCardClick(company),
    isSelected: selectedTicker === company.ticker,
    isOtherSelected: flipping && selectedTicker !== company.ticker,
  });

  return (
    <>
      {/* Desktop: single row, horizontally scrollable if needed */}
      <div className="hidden md:flex gap-5 justify-center overflow-x-auto pb-2"
        style={{ minWidth: 0 }}>
        <div className="flex gap-5" style={{ minWidth: COMPANIES.length * (CARD_W + 20) }}>
          {companies.map((c) => <TradingCard key={c.ticker} {...cardProps(c)} />)}
        </div>
      </div>

      {/* Mobile: 4 top + 3 bottom, each row horizontally scrollable */}
      <div className="md:hidden flex flex-col gap-4 w-full">
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-4 justify-center" style={{ minWidth: 4 * (CARD_W + 16) }}>
            {companies.slice(0, 4).map((c) => <TradingCard key={c.ticker} {...cardProps(c)} />)}
          </div>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-4 justify-center" style={{ minWidth: 3 * (CARD_W + 16) }}>
            {companies.slice(4).map((c) => <TradingCard key={c.ticker} {...cardProps(c)} />)}
          </div>
        </div>
      </div>
    </>
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

  // Back to homepage — clear selection smoothly
  const handleBack = useCallback(() => {
    setPhase('grid');
    setSelectedCompany(null);
  }, []);

  // Sidebar company link → go directly to detail view
  const handleNavigateToCompany = useCallback((company: Company) => {
    setSelectedCompany(company);
    setPhase('detail');
    setSidebarOpen(false);
  }, []);

  // Sidebar home link
  const handleNavigateHome = useCallback(() => {
    setPhase('grid');
    setSelectedCompany(null);
    setSidebarOpen(false);
  }, []);

  const formattedTime = lastUpdated.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
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

      {/*
        Outer container is `relative` so absolute children can overlay each other during
        crossfade transitions. This prevents the black-screen flash that `mode="wait"` causes.
        Each view fills the viewport via `position: absolute; inset: 0`.
      */}
      <div className="relative" style={{ minHeight: '100vh', background: '#0a0a0a' }}>
        <AnimatePresence>

          {/* ── GRID VIEW ────────────────────────────────────────── */}
          {(phase === 'grid' || phase === 'flipping') && (
            <motion.div
              key="grid-view"
              className="absolute inset-0 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ minHeight: '100vh' }}
            >
              {/* Flip overlay — shown over the grid during card→detail transition */}
              <AnimatePresence>
                {phase === 'flipping' && selectedCompany && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-40 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.88)' }}
                  >
                    <FlipCard company={selectedCompany} onDone={handleFlipDone} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── TOP ZONE: hamburger + title ────────────────────── */}
              <div className="flex-shrink-0 pt-6 px-6">
                <HamburgerButton onClick={() => setSidebarOpen(true)} />
                <motion.div
                  initial={{ opacity: 0, y: -14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="text-center mt-4"
                >
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 text-white">
                    Mag 7 <span style={{ color: '#4FD1E8' }}>Valuations</span>
                  </h1>
                  <p className="text-gray-500 text-sm">
                    Live financials for the Magnificent Seven. Click a card to dive in.
                  </p>
                </motion.div>
              </div>

              {/* ── MIDDLE ZONE: cards centered in remaining space ─── */}
              <div className="flex-1 flex items-center justify-center px-4 py-6">
                <motion.div
                  className="w-full"
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <CardGrid
                    companies={COMPANIES}
                    selectedTicker={selectedTicker}
                    flipping={flipping}
                    onCardClick={handleCardClick}
                  />
                </motion.div>
              </div>

              {/* ── BOTTOM ZONE: footer anchored to bottom ───────────── */}
              <div className="flex-shrink-0 pb-6 px-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="flex items-center justify-center gap-4 text-xs text-gray-600"
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

          {/* ── DETAIL VIEW ──────────────────────────────────────── */}
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
