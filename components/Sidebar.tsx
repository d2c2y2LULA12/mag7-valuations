'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { COMPANIES } from '@/lib/constants';
import { Company } from '@/lib/types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateHome: () => void;
  onNavigateToCompany: (company: Company) => void;
  onReopenPack?: () => void;
}

// Simple inline logo dots for sidebar (brand colored)
function SidebarLogo({ company }: { company: Company }) {
  if (company.ticker === 'MSFT') {
    return (
      <svg width="18" height="18" viewBox="0 0 88 88" fill="none">
        <rect x="0"  y="0"  width="40" height="40" fill="#F25022"/>
        <rect x="48" y="0"  width="40" height="40" fill="#7FBA00"/>
        <rect x="0"  y="48" width="40" height="40" fill="#00A4EF"/>
        <rect x="48" y="48" width="40" height="40" fill="#FFB900"/>
      </svg>
    );
  }
  if (company.ticker === 'GOOGL') {
    return (
      <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
    );
  }
  if (company.ticker === 'AMZN') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/Amazon_icon.svg.png" alt="Amazon" width={18} height={18} style={{ objectFit: 'contain' }} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.simpleicons.org/${company.iconSlug}/${company.brandColor.replace('#', '')}`}
      alt={company.shortName}
      width={18}
      height={18}
      style={{ objectFit: 'contain' }}
    />
  );
}

export default function Sidebar({ isOpen, onClose, onNavigateHome, onNavigateToCompany, onReopenPack }: SidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed left-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width: 260,
              background: '#0b0d1a',
              borderRight: '1px solid rgba(79, 209, 232, 0.15)',
              boxShadow: '4px 0 40px rgba(0,0,0,0.6)',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'rgba(79, 209, 232, 0.12)' }}
            >
              <span className="font-bold text-sm tracking-wider">
                <span className="text-white">Mag </span>
                <span style={{ color: '#4FD1E8' }}>7</span>
              </span>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-200 transition-colors p-1 rounded"
                aria-label="Close menu"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="3" y1="3" x2="15" y2="15"/>
                  <line x1="15" y1="3" x2="3" y2="15"/>
                </svg>
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3">
              {/* Home */}
              <button
                onClick={() => { onNavigateHome(); onClose(); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 6L8 1L14 6V14H10V10H6V14H2V6Z"/>
                </svg>
                Home
              </button>

              {onReopenPack && (
                <button
                  onClick={() => { onReopenPack(); onClose(); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="2" width="10" height="12" rx="1.5"/>
                    <line x1="6" y1="5" x2="10" y2="5"/>
                    <line x1="6" y1="8" x2="10" y2="8"/>
                  </svg>
                  Reopen Pack
                </button>
              )}

              <div
                className="mx-5 my-2 border-t"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}
              />
              <p className="px-5 py-1.5 text-[10px] uppercase tracking-widest text-gray-600">Companies</p>

              {COMPANIES.map((company) => (
                <button
                  key={company.ticker}
                  onClick={() => { onNavigateToCompany(company); onClose(); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors group"
                >
                  <span className="flex-shrink-0 w-5 flex items-center justify-center">
                    <SidebarLogo company={company} />
                  </span>
                  <span className="flex-1 text-left">{company.name}</span>
                  <span
                    className="text-xs opacity-0 group-hover:opacity-100 transition-opacity font-mono"
                    style={{ color: company.brandColor }}
                  >
                    {company.ticker}
                  </span>
                </button>
              ))}
            </nav>

            {/* Footer */}
            <div
              className="px-5 py-4 border-t text-xs text-gray-700 space-y-1"
              style={{ borderColor: 'rgba(79, 209, 232, 0.1)' }}
            >
              <div>Data: Yahoo Finance via yfinance</div>
              <div>Built by Donovan Young</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Hamburger button ──────────────────────────────────────────────────────────

export function HamburgerButton({
  onClick,
  className = '',
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label="Open menu"
      className={`flex flex-col gap-1.5 p-2 rounded-lg transition-colors hover:bg-white/8 ${className}`}
    >
      <span className="block w-5 h-0.5 bg-gray-400" />
      <span className="block w-5 h-0.5 bg-gray-400" />
      <span className="block w-5 h-0.5 bg-gray-400" />
    </button>
  );
}
