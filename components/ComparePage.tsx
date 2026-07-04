'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Company, StockData } from '@/lib/types';
import { getValuationSignal, formatBig, formatPrice, formatRatio } from '@/lib/constants';
import { CardFront, HoloCardWrapper, CARD_W, CARD_H } from './TradingCard';
import { HamburgerButton } from './Sidebar';

type WinRule = 'lower' | 'higher' | 'none';

interface Row {
  label: string;
  rawA: number | null | undefined;
  rawB: number | null | undefined;
  displayA: string;
  displayB: string;
  rule: WinRule;
  badgeA?: string;
  badgeB?: string;
  badgeClassA?: string;
  badgeClassB?: string;
}

function winSide(a: number | null | undefined, b: number | null | undefined, rule: WinRule): 'A' | 'B' | null {
  if (rule === 'none' || a == null || b == null || a === b) return null;
  return (rule === 'lower' ? a < b : a > b) ? 'A' : 'B';
}

function pct(v: number | null | undefined): string {
  return v != null ? `${(v * 100).toFixed(1)}%` : 'N/A';
}
function dollar2(v: number | null | undefined): string {
  return v != null ? `$${v.toFixed(2)}` : 'N/A';
}
function ratio2(v: number | null | undefined): string {
  return v != null ? v.toFixed(2) : 'N/A';
}

function buyPct(d: StockData | null): number | null {
  if (!d?.analystRatings) return null;
  const r = d.analystRatings;
  const total = r.buy + r.hold + r.sell;
  return total > 0 ? Math.round((r.buy / total) * 100) : null;
}

function buildRows(a: StockData | null, b: StockData | null): Row[] {
  const sigA = getValuationSignal(a?.forwardPE ?? null);
  const sigB = getValuationSignal(b?.forwardPE ?? null);
  const sigClass = (s: string) =>
    s === 'CHEAP' ? 'badge-cheap' : s === 'FAIR' ? 'badge-fair' : s === 'RICH' ? 'badge-rich' : 'badge-na';
  const sigLabel = (s: string) =>
    s === 'CHEAP' ? 'CHEAP' : s === 'FAIR' ? 'FAIR' : s === 'RICH' ? 'RICH' : '';

  const bpA = buyPct(a);
  const bpB = buyPct(b);

  return [
    {
      label: 'Price', rule: 'none',
      rawA: a?.price, rawB: b?.price,
      displayA: formatPrice(a?.price ?? null), displayB: formatPrice(b?.price ?? null),
    },
    {
      label: 'Market Cap', rule: 'none',
      rawA: a?.marketCap, rawB: b?.marketCap,
      displayA: formatBig(a?.marketCap ?? null), displayB: formatBig(b?.marketCap ?? null),
    },
    {
      label: 'P/E (Trailing)', rule: 'lower',
      rawA: a?.peRatio, rawB: b?.peRatio,
      displayA: formatRatio(a?.peRatio ?? null), displayB: formatRatio(b?.peRatio ?? null),
    },
    {
      label: 'Forward P/E', rule: 'lower',
      rawA: a?.forwardPE, rawB: b?.forwardPE,
      displayA: formatRatio(a?.forwardPE ?? null), displayB: formatRatio(b?.forwardPE ?? null),
      badgeA: sigLabel(sigA), badgeB: sigLabel(sigB),
      badgeClassA: sigClass(sigA), badgeClassB: sigClass(sigB),
    },
    {
      label: 'EPS (TTM)', rule: 'higher',
      rawA: a?.eps, rawB: b?.eps,
      displayA: dollar2(a?.eps), displayB: dollar2(b?.eps),
    },
    {
      label: 'Revenue Growth', rule: 'higher',
      rawA: a?.revenueGrowth, rawB: b?.revenueGrowth,
      displayA: pct(a?.revenueGrowth), displayB: pct(b?.revenueGrowth),
    },
    {
      label: 'Profit Margin', rule: 'higher',
      rawA: a?.profitMargin, rawB: b?.profitMargin,
      displayA: pct(a?.profitMargin), displayB: pct(b?.profitMargin),
    },
    {
      label: 'Return on Equity', rule: 'higher',
      rawA: a?.returnOnEquity, rawB: b?.returnOnEquity,
      displayA: pct(a?.returnOnEquity), displayB: pct(b?.returnOnEquity),
    },
    {
      label: 'Debt / Equity', rule: 'lower',
      rawA: a?.debtToEquity, rawB: b?.debtToEquity,
      displayA: ratio2(a?.debtToEquity), displayB: ratio2(b?.debtToEquity),
    },
    {
      label: 'Free Cash Flow', rule: 'higher',
      rawA: a?.freeCashFlow, rawB: b?.freeCashFlow,
      displayA: formatBig(a?.freeCashFlow ?? null), displayB: formatBig(b?.freeCashFlow ?? null),
    },
    {
      label: 'Analyst % Buy', rule: 'higher',
      rawA: bpA, rawB: bpB,
      displayA: bpA != null ? `${bpA}%` : 'N/A',
      displayB: bpB != null ? `${bpB}%` : 'N/A',
    },
  ];
}

function WinCell({
  display, isWinner, isLoser, badge, badgeClass,
}: {
  display: string; isWinner: boolean; isLoser: boolean;
  badge?: string; badgeClass?: string;
}) {
  return (
    <div className={`rounded-lg px-3 py-2 text-center min-w-[90px] transition-colors ${isWinner ? 'bg-green-500/10' : isLoser ? 'bg-red-500/5' : ''}`}>
      <p className={`text-base font-semibold tabular-nums ${isWinner ? 'text-green-400' : isLoser ? 'text-red-400/80' : 'text-gray-200'}`}>
        {display}
      </p>
      {badge && (
        <span className={`text-[8px] font-black tracking-widest mt-0.5 inline-block px-1 py-0.5 rounded ${badgeClass}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

export default function ComparePage({
  companyA,
  companyB,
  onBack,
  onOpenSidebar,
}: {
  companyA: Company;
  companyB: Company;
  onBack: () => void;
  onOpenSidebar?: () => void;
}) {
  const [dataA, setDataA] = useState<StockData | null>(null);
  const [dataB, setDataB] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/stock/${companyA.ticker}`).then((r) => r.json()),
      fetch(`/api/stock/${companyB.ticker}`).then((r) => r.json()),
    ])
      .then(([a, b]) => {
        if (a.error) throw new Error(a.error);
        if (b.error) throw new Error(b.error);
        setDataA(a as StockData);
        setDataB(b as StockData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [companyA.ticker, companyB.ticker]);

  const rows = buildRows(dataA, dataB);
  const winsA = rows.filter((r) => winSide(r.rawA, r.rawB, r.rule) === 'A').length;
  const winsB = rows.filter((r) => winSide(r.rawA, r.rawB, r.rule) === 'B').length;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-50 border-b border-[#1a1a2e] backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.9)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          {onOpenSidebar && <HamburgerButton onClick={onOpenSidebar} className="flex-shrink-0" />}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#4FD1E8] transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
          <div className="flex-1 flex items-center justify-center gap-3">
            <span className="font-bold text-sm" style={{ color: companyA.brandColor }}>{companyA.ticker}</span>
            <span className="text-gray-600 text-xs font-bold tracking-widest">VS</span>
            <span className="font-bold text-sm" style={{ color: companyB.brandColor }}>{companyB.ticker}</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Company card headers */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-end mb-8">
          <div className="flex flex-col items-center gap-3">
            <HoloCardWrapper width={CARD_W} height={CARD_H}>
              <CardFront company={companyA} cardW={CARD_W} />
            </HoloCardWrapper>
            <div className="text-center">
              <p className="text-sm font-bold text-white">{companyA.name}</p>
              <p className="text-xs text-gray-600">{companyA.ticker}</p>
              {!loading && dataA && (
                <p className="text-xl font-bold tabular-nums text-white mt-1">{formatPrice(dataA.price)}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center pb-12 px-4 gap-3">
            <p className="text-2xl font-black text-gray-700 tracking-widest">VS</p>
            {!loading && dataA && dataB && (
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-center mt-2">
                <p className="text-2xl font-black" style={{ color: companyA.brandColor }}>{winsA}</p>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">wins</p>
                <p className="text-2xl font-black" style={{ color: companyB.brandColor }}>{winsB}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-3">
            <HoloCardWrapper width={CARD_W} height={CARD_H}>
              <CardFront company={companyB} cardW={CARD_W} />
            </HoloCardWrapper>
            <div className="text-center">
              <p className="text-sm font-bold text-white">{companyB.name}</p>
              <p className="text-xs text-gray-600">{companyB.ticker}</p>
              {!loading && dataB && (
                <p className="text-xl font-bold tabular-nums text-white mt-1">{formatPrice(dataB.price)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stat table */}
        <div className="rounded-xl border border-[#1e1e3a] overflow-hidden" style={{ background: 'rgba(13,13,26,0.7)' }}>
          {loading ? (
            <div className="p-8 space-y-4">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                  <div className="skeleton rounded h-8 w-24 ml-auto" />
                  <div className="skeleton rounded h-4 w-32" />
                  <div className="skeleton rounded h-8 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-red-400 text-sm text-center">{error}</div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
              {rows.map((row) => {
                const w = winSide(row.rawA, row.rawB, row.rule);
                return (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center px-4 py-2.5 border-b border-[#1a1a2e] last:border-0"
                  >
                    <div className="flex justify-end">
                      <WinCell
                        display={row.displayA}
                        isWinner={w === 'A'}
                        isLoser={w === 'B' && row.rule !== 'none'}
                        badge={row.badgeA}
                        badgeClass={row.badgeClassA}
                      />
                    </div>
                    <div className="text-center" style={{ minWidth: 120 }}>
                      <p className="text-xs text-gray-500 font-medium">{row.label}</p>
                      {row.rule !== 'none' && (
                        <p className="text-[9px] text-gray-700 mt-0.5">
                          {row.rule === 'lower' ? 'lower wins' : 'higher wins'}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-start">
                      <WinCell
                        display={row.displayB}
                        isWinner={w === 'B'}
                        isLoser={w === 'A' && row.rule !== 'none'}
                        badge={row.badgeB}
                        badgeClass={row.badgeClassB}
                      />
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>

        <p className="text-xs text-gray-700 text-center mt-4">
          Green = better on this metric · Data via Yahoo Finance · Not investment advice
        </p>
      </div>

      <footer className="w-full text-center py-4 px-6 text-xs text-gray-600">
        Mag 7 Valuations is a research and learning tool. Not investment advice. Built by Donovan Young
      </footer>
    </div>
  );
}
