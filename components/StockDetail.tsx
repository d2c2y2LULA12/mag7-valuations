'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Company, StockData } from '@/lib/types';
import { MiniCard, CARD_W, CARD_H, CardFront, HoloCardWrapper, CompanyLogo, useNarrowCardSize } from './TradingCard';
import { HamburgerButton } from './Sidebar';
import FinancialTables from './FinancialTables';
import StockCharts from './StockChart';
import { formatBig, formatRatio, formatPrice, getValuationSignal, COMPANIES } from '@/lib/constants';
import InfoTip from './InfoTip';

const TIPS: Record<string, string> = {
  'Price':            'The current price one share of stock will cost you. It moves every second the market is open based on buyers and sellers.',
  'Market Cap':       'Total value of all shares combined. Think of it as the price tag the market puts on the whole company right now.',
  'P/E Ratio':        'Price divided by earnings per share. It tells you how much investors are willing to pay for every $1 the company earns. Higher means more hype, lower can mean a bargain — or a red flag.',
  'Forward P/E':      'Same idea as P/E, but uses next year\'s expected earnings instead of last year\'s. It\'s a bet on where the company is headed.',
  'EPS (TTM)':        'Earnings Per Share over the last 12 months. How much profit the company made for each share of stock. Higher is better.',
  'Revenue':          'Total money brought in from sales before any expenses are taken out. The top line of the income statement.',
  'Revenue Growth':   'How much revenue grew compared to the same period last year. 10%+ for a company this size is solid.',
  'Profit Margin':    'Percentage of revenue that ends up as actual profit after all costs. A 20% margin means they keep $0.20 of every $1 in sales.',
  'Return on Equity': 'How efficiently the company turns shareholder money into profit. 15%+ is generally considered strong.',
  'EPS (TTM) stat':   'Earnings Per Share — the profit the company earns per share over the last 12 months.',
  'Debt / Equity':    'How much debt the company carries relative to shareholder equity. Lower is safer. Very high debt can be risky if revenue slows.',
  'Free Cash Flow':   'Cash left over after paying for operations and investments. This is the money the company can use to buy back stock, pay dividends, or invest in growth.',
  'Price / Sales':    'Stock price relative to revenue. Useful when a company isn\'t profitable yet — it shows how much you\'re paying per dollar of sales.',
  'EV / EBITDA':      'Enterprise Value divided by earnings before interest, taxes, depreciation, and amortization. A way to compare companies regardless of how they\'re financed. Lower generally means cheaper.',
  'Analyst Ratings':  'Wall Street analysts who cover the stock publish Buy, Hold, or Sell recommendations. This shows the breakdown across all analysts currently covering it.',
  'Earnings Multiple Signal': 'A quick read based on Forward P/E only. Under 20x is CHEAP by Mag 7 standards, 20–30x is FAIR, above 30x is RICH. This reflects the earnings multiple — not an overall valuation verdict. Price/Sales and EV/EBITDA below may tell a different story.',
  'High Today':       'The highest price the stock traded at today during market hours.',
  'Low Today':        'The lowest price the stock traded at today during market hours.',
  '52W High':         'The highest price the stock has traded at in the last 52 weeks. Useful for seeing how far off the stock is from its recent peak.',
  '52W Low':          'The lowest price in the last 52 weeks. Seeing a stock near its 52-week low can signal either a buying opportunity or a reason to dig deeper.',
  'Volume':           'Number of shares traded today. High volume means a lot of activity — could be news, earnings, or just momentum.',
  'Avg Volume':       'The average number of shares traded per day over the past few months. Comparing today\'s volume to this tells you if trading is unusually heavy or light.',
};

function fmtVol(v: number | null): string {
  if (v == null) return 'N/A';
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}

type Tab = 'overview' | 'financials' | 'valuation';

// ── Skeleton loaders ──────────────────────────────────────────────────────────

function FieldSkeleton({ width = '60%', height = 14 }: { width?: string | number; height?: number }) {
  return <div className="skeleton rounded inline-block" style={{ width, height }} />;
}

function MetricSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl border border-[#1a1a2e]" style={{ background: 'rgba(13,13,26,0.7)' }}>
      <FieldSkeleton width="50%" height={10} />
      <FieldSkeleton width="65%" height={22} />
    </div>
  );
}

// ── Overview: FIFA-style stat bars ────────────────────────────────────────────

interface StatBarConfig {
  label: string;
  display: string;
  percent: number;
  isGood: boolean;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}

function buildStats(data: StockData): StatBarConfig[] {
  const pct = (v: number | null, scale: number) =>
    v === null ? 0 : clamp((v / scale) * 100, 0, 100);

  return [
    {
      label: 'Revenue Growth',
      display: data.revenueGrowth !== null ? `${(data.revenueGrowth * 100).toFixed(1)}%` : 'N/A',
      percent: pct(data.revenueGrowth, 0.5),
      isGood: (data.revenueGrowth ?? 0) >= 0.10,
    },
    {
      label: 'Profit Margin',
      display: data.profitMargin !== null ? `${(data.profitMargin * 100).toFixed(1)}%` : 'N/A',
      percent: pct(data.profitMargin, 0.5),
      isGood: (data.profitMargin ?? 0) >= 0.15,
    },
    {
      label: 'Return on Equity',
      display: data.returnOnEquity !== null ? `${(data.returnOnEquity * 100).toFixed(1)}%` : 'N/A',
      percent: clamp(((data.returnOnEquity ?? 0) / 2.5) * 100, 0, 100),
      isGood: (data.returnOnEquity ?? 0) >= 0.15,
    },
    {
      label: 'EPS (TTM)',
      display: data.eps !== null ? `$${data.eps.toFixed(2)}` : 'N/A',
      percent: pct(data.eps, 30),
      isGood: (data.eps ?? 0) >= 5,
    },
    {
      label: 'Debt / Equity',
      display: data.debtToEquity !== null ? `${data.debtToEquity.toFixed(2)}` : 'N/A',
      percent: data.debtToEquity === null ? 0 : clamp(100 - (data.debtToEquity / 3) * 100, 0, 100),
      isGood: (data.debtToEquity ?? 999) < 1.0,
    },
    {
      label: 'Free Cash Flow',
      display: formatBig(data.freeCashFlow),
      percent: pct(data.freeCashFlow, 120e9),
      isGood: (data.freeCashFlow ?? 0) >= 5e9,
    },
  ];
}

function FIFAStatBar({ stat }: { stat: StatBarConfig }) {
  return (
    <div className="flex items-center gap-4 py-2.5 border-b border-[#1a1a2e] last:border-0">
      <span className="text-sm text-gray-400 w-36 flex-shrink-0 flex items-center">
        {stat.label}
        {TIPS[stat.label] && <InfoTip text={TIPS[stat.label]} />}
      </span>
      <span className="text-sm font-mono font-semibold text-white w-20 text-right flex-shrink-0 tabular-nums">
        {stat.display}
      </span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: stat.isGood ? '#10B981' : '#EF4444' }}
          initial={{ width: 0 }}
          animate={{ width: `${stat.percent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
      <span className="text-xs w-8 text-right flex-shrink-0"
        style={{ color: stat.isGood ? '#10B981' : '#EF4444' }}>
        {Math.round(stat.percent)}
      </span>
    </div>
  );
}

function OverviewTab({ data, loading }: { data: StockData | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="rounded-xl border border-[#1e1e3a] px-5 py-1" style={{ background: 'rgba(13,13,26,0.7)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2.5 border-b border-[#1a1a2e] last:border-0">
            <div className="skeleton rounded w-36 h-4 flex-shrink-0" />
            <div className="skeleton rounded w-20 h-4 flex-shrink-0 ml-auto" />
            <div className="flex-1 skeleton rounded-full h-2.5" />
            <div className="skeleton rounded w-8 h-4 flex-shrink-0" />
          </div>
        ))}
      </div>
    );
  }
  const stats = buildStats(data);
  return (
    <>
      <p className="text-xs text-gray-600 mb-4">
        Bar represents strength vs. Large-Cap / Blue Chip Benchmarks. Green = above benchmark, red = below.
      </p>
      <div className="rounded-xl border border-[#1e1e3a] px-5 py-1" style={{ background: 'rgba(13,13,26,0.7)' }}>
        {stats.map((s) => <FIFAStatBar key={s.label} stat={s} />)}
      </div>
    </>
  );
}

// ── Financials tab ─────────────────────────────────────────────────────────────

function FinancialsTab({ data, loading }: { data: StockData | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1e1e3a] p-5" style={{ background: 'rgba(13,13,26,0.7)' }}>
            <div className="skeleton rounded w-40 h-5 mb-4" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex justify-between py-2 border-b border-[#1a1a2e] last:border-0">
                <FieldSkeleton width="35%" />
                <div className="flex gap-8">
                  {Array.from({ length: 4 }).map((_, k) => <FieldSkeleton key={k} width={50} />)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return <FinancialTables data={data} />;
}

// ── Valuation tab ──────────────────────────────────────────────────────────────

const MAG7_AVG = { pe: 35, forwardPe: 27, ps: 11, evEbitda: 28 };

interface ValMetric { label: string; value: number | null; avg: number; suffix?: string; }

function ValBar({ m }: { m: ValMetric }) {
  if (m.value === null) {
    return (
      <div className="mb-6">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-400">{m.label}</span>
          <span className="text-sm text-gray-600">N/A</span>
        </div>
      </div>
    );
  }
  const scale = m.avg * 2;
  const fillPct = clamp((m.value / scale) * 100, 0, 100);
  const isCheap = m.value < m.avg;

  return (
    <div className="mb-7">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-300 font-medium flex items-center">
          {m.label}
          {TIPS[m.label] && <InfoTip text={TIPS[m.label]} />}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-white tabular-nums">
            {m.value.toFixed(1)}{m.suffix ?? 'x'}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${isCheap ? 'badge-cheap' : 'badge-rich'}`}>
            {isCheap ? 'BELOW AVG' : 'ABOVE AVG'}
          </span>
        </div>
      </div>
      <div className="relative h-3 rounded-full overflow-visible" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{ background: isCheap ? '#10B981' : '#EF4444' }}
          initial={{ width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
        />
        <div
          className="absolute top-[-4px] bottom-[-4px] w-0.5 rounded"
          style={{ left: '50%', background: '#4FD1E8', boxShadow: '0 0 6px rgba(79,209,232,0.6)' }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-xs text-gray-600">
        <span>0</span>
        <span style={{ color: '#4FD1E8' }}>Mag 7 avg: {m.avg}x</span>
        <span>{m.avg * 2}x</span>
      </div>
    </div>
  );
}

function ValuationTab({ data, loading }: { data: StockData | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-[#1e1e3a] p-5" style={{ background: 'rgba(13,13,26,0.7)' }}>
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <FieldSkeleton width={110} height={10} />
              <FieldSkeleton width={170} height={10} />
            </div>
            <FieldSkeleton width={80} height={36} />
          </div>
        </div>
        <div className="rounded-xl border border-[#1e1e3a] px-6 pt-5 pb-1" style={{ background: 'rgba(13,13,26,0.7)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-7">
              <div className="flex justify-between mb-2">
                <FieldSkeleton width={140} height={14} />
                <FieldSkeleton width={80} height={24} />
              </div>
              <div className="skeleton rounded-full h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const signal = getValuationSignal(data.forwardPE);
  const signalClass =
    signal === 'CHEAP' ? 'badge-cheap' : signal === 'FAIR' ? 'badge-fair' : signal === 'RICH' ? 'badge-rich' : 'badge-na';
  const signalLabel =
    signal === 'CHEAP' ? 'CHEAP ON EARNINGS' : signal === 'FAIR' ? 'FAIR ON EARNINGS' : signal === 'RICH' ? 'RICH ON EARNINGS' : 'N/A';
  const metrics: ValMetric[] = [
    { label: 'P/E Ratio (Trailing)', value: data.peRatio,      avg: MAG7_AVG.pe },
    { label: 'Forward P/E',          value: data.forwardPE,    avg: MAG7_AVG.forwardPe },
    { label: 'Price / Sales (TTM)',  value: data.priceToSales, avg: MAG7_AVG.ps },
    { label: 'EV / EBITDA',         value: data.evToEbitda,   avg: MAG7_AVG.evEbitda },
  ];

  return (
    <>
      <div className="rounded-xl border border-[#1e1e3a] p-5 mb-6 flex items-center justify-between" style={{ background: 'rgba(13,13,26,0.7)' }}>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center">
            Earnings Multiple Signal
            <InfoTip text={TIPS['Earnings Multiple Signal']} />
          </p>
          <p className="text-xs text-gray-600">Forward P/E vs. 20 / 30 thresholds — earnings only</p>
        </div>
        <span className={`text-base font-black tracking-widest px-4 py-2 rounded-lg ${signalClass}`}>{signalLabel}</span>
      </div>
      <div className="rounded-xl border border-[#1e1e3a] px-6 pt-5 pb-1" style={{ background: 'rgba(13,13,26,0.7)' }}>
        <p className="text-xs text-gray-600 mb-5">
          Teal line = Mag 7 average. Bar fills left to right up to 2× average. Green = cheaper than peers.
        </p>
        {metrics.map((m) => <ValBar key={m.label} m={m} />)}
      </div>
    </>
  );
}

// ── About section ─────────────────────────────────────────────────────────────

function AboutSection({ summary, loading }: { summary: string | null | undefined; loading: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="mb-6 space-y-2">
        <div className="skeleton rounded h-4 w-full" />
        <div className="skeleton rounded h-4 w-11/12" />
        <div className="skeleton rounded h-4 w-2/3" />
      </div>
    );
  }
  if (!summary) return null;

  const sentences = summary.match(/[^.!?]+[.!?]+/g) ?? [summary];
  const short = sentences.slice(0, 3).join(' ').trim();
  const hasMore = sentences.length > 3;

  return (
    <div className="mb-6">
      <p className="text-sm text-gray-400 leading-relaxed">
        {expanded ? summary : short}
        {hasMore && !expanded ? '…' : ''}
      </p>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-xs hover:opacity-80 transition-opacity"
          style={{ color: '#4FD1E8' }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

// ── Key stats row ──────────────────────────────────────────────────────────────

function KeyStatsSection({ data, loading }: { data: StockData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[#1e1e3a] p-5 mb-6" style={{ background: 'rgba(13,13,26,0.7)' }}>
        <div className="skeleton rounded w-24 h-3 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="skeleton rounded h-3 w-16" />
              <div className="skeleton rounded h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!data) return null;

  const stats = [
    { label: 'High Today',  value: data.dayHigh != null ? `$${data.dayHigh.toFixed(2)}` : 'N/A' },
    { label: 'Low Today',   value: data.dayLow  != null ? `$${data.dayLow.toFixed(2)}`  : 'N/A' },
    { label: '52W High',    value: data.fiftyTwoWeekHigh != null ? `$${data.fiftyTwoWeekHigh.toFixed(2)}` : 'N/A' },
    { label: '52W Low',     value: data.fiftyTwoWeekLow  != null ? `$${data.fiftyTwoWeekLow.toFixed(2)}`  : 'N/A' },
    { label: 'Volume',      value: fmtVol(data.volume) },
    { label: 'Avg Volume',  value: fmtVol(data.averageVolume) },
  ];

  return (
    <div className="rounded-xl border border-[#1e1e3a] p-5 mb-6" style={{ background: 'rgba(13,13,26,0.7)' }}>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Key Stats</p>
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-gray-600 mb-0.5 flex items-center">
              {label}
              {TIPS[label] && <InfoTip text={TIPS[label]} />}
            </p>
            <p className="text-sm font-semibold text-gray-200 tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Analyst ratings ────────────────────────────────────────────────────────────

function formatConsensus(key: string): string {
  return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function AnalystRatingsSection({ data, loading }: { data: StockData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[#1e1e3a] p-5 mb-6" style={{ background: 'rgba(13,13,26,0.7)' }}>
        <div className="skeleton rounded w-36 h-3 mb-4" />
        <div className="flex gap-6 items-center">
          <div className="skeleton rounded-full w-24 h-24 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton rounded h-3 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  const r = data?.analystRatings;
  if (!r) return null;
  // Always use actual counts as denominator so percentages can't exceed 100%
  const actual = r.buy + r.hold + r.sell;
  const total = actual > 0 ? actual : (r.total ?? 0);
  if (!total) return null;

  const buyPct  = Math.round((r.buy  / total) * 100);
  const holdPct = Math.round((r.hold / total) * 100);
  const sellPct = Math.max(0, 100 - buyPct - holdPct);

  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ * (1 - buyPct / 100);

  const bars = [
    { label: 'Buy',  count: r.buy,  pct: buyPct,  color: '#10B981' },
    { label: 'Hold', count: r.hold, pct: holdPct, color: '#F59E0B' },
    { label: 'Sell', count: r.sell, pct: sellPct, color: '#EF4444' },
  ];

  return (
    <div className="rounded-xl border border-[#1e1e3a] p-5 mb-6" style={{ background: 'rgba(13,13,26,0.7)' }}>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-4 flex items-center">
        Analyst Ratings
        <InfoTip text={TIPS['Analyst Ratings']} />
      </p>
      <div className="flex gap-6 items-center">
        {/* Buy % circle */}
        <div className="relative flex-shrink-0 w-24 h-24 flex items-center justify-center">
          <svg width="96" height="96" viewBox="0 0 96 96" className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
            <circle
              cx="48" cy="48" r={radius} fill="none"
              stroke="#10B981" strokeWidth="8"
              strokeDasharray={circ}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="relative z-10 text-center">
            <p className="text-xl font-bold text-white">{buyPct}%</p>
            <p className="text-[10px] text-gray-500">Buy</p>
          </div>
        </div>

        {/* Buy/Hold/Sell bars */}
        <div className="flex-1 space-y-3">
          {bars.map(({ label, count, pct, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-8 flex-shrink-0">{label}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
                />
              </div>
              <span className="text-xs text-gray-400 tabular-nums w-8 text-right flex-shrink-0">{pct}%</span>
              <span className="text-xs text-gray-600 tabular-nums w-5 text-right flex-shrink-0">{count}</span>
            </div>
          ))}
        </div>
      </div>
      {r.mean != null && (
        <p className="text-xs text-gray-600 mt-3">
          Consensus: <span className="text-gray-400">{r.key ? formatConsensus(r.key) : 'N/A'}</span>
          {r.total ? ` · ${r.total} analysts` : ''}
        </p>
      )}
    </div>
  );
}

// ── Key metric chips ───────────────────────────────────────────────────────────

function KeyMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-4 rounded-xl border border-[#1e1e3a]" style={{ background: 'rgba(13,13,26,0.7)' }}>
      <span className="text-xs text-gray-500 uppercase tracking-wider flex items-center">
        {label}
        {TIPS[label] && <InfoTip text={TIPS[label]} />}
      </span>
      <span className="text-lg font-semibold text-gray-100 tabular-nums">{value}</span>
      {sub && <span className="text-xs text-gray-600">{sub}</span>}
    </div>
  );
}

// ── Compare sub-components ────────────────────────────────────────────────────

const FACE_BASE: React.CSSProperties = {
  position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden',
  backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' as React.CSSProperties['WebkitBackfaceVisibility'],
  background: 'rgba(13,13,26,0.95)', border: '1px solid rgba(79,209,232,0.18)',
  cursor: 'pointer',
};

function CompareCard({ isFlipped, pick, onClick }: { isFlipped: boolean; pick: Company | null; onClick: () => void }) {
  return (
    <div style={{ perspective: '900px', width: CARD_W, height: CARD_H }} onClick={onClick}>
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div style={FACE_BASE}>
          <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(79,209,232,0.65)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p className="text-xs font-bold tracking-widest text-gray-300 uppercase">Compare</p>
            <p className="text-[10px] text-gray-600 text-center leading-relaxed">Pick a stock to compare side by side</p>
          </div>
        </div>
        {/* Back */}
        <div style={{ ...FACE_BASE, transform: 'rotateY(180deg)', borderColor: pick ? `${pick.brandColor}55` : 'rgba(79,209,232,0.18)' }}>
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
            {pick ? (
              <>
                <CompanyLogo company={pick} size={40} />
                <p className="text-xs font-bold tracking-wider mt-1" style={{ color: pick.brandColor }}>{pick.ticker}</p>
                <p className="text-[9px] text-gray-500">vs {pick.shortName}</p>
                <p className="text-[9px] text-gray-700 mt-2">tap to cancel</p>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full border border-[rgba(79,209,232,0.25)] flex items-center justify-center">
                  <span style={{ color: '#4FD1E8' }} className="text-lg font-bold">?</span>
                </div>
                <p className="text-xs text-gray-400">Picking…</p>
                <p className="text-[9px] text-gray-700 mt-2">tap to cancel</p>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PickerView({ company, onPick }: { company: Company; onPick: (c: Company) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
      <h2 className="text-2xl font-bold text-white mb-1">Pick a card to compare</h2>
      <p className="text-sm text-gray-500 mb-8">
        Choose a stock to go head-to-head with{' '}
        <span style={{ color: company.brandColor }}>{company.name}</span>
      </p>
      <div className="flex gap-4 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible">
        {COMPANIES.map((c) => {
          const isSelf = c.ticker === company.ticker;
          return (
            <div key={c.ticker} className="flex flex-col items-center gap-2 flex-shrink-0"
              style={{ opacity: isSelf ? 0.25 : 1, pointerEvents: isSelf ? 'none' : 'auto' }}>
              <HoloCardWrapper width={CARD_W} height={CARD_H} onClick={() => onPick(c)}>
                <CardFront company={c} cardW={CARD_W} />
              </HoloCardWrapper>
              <p className="text-xs text-gray-500 font-medium">{c.ticker}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function ConfirmView({
  companyA, companyB, onConfirm, onChangePick,
}: {
  companyA: Company; companyB: Company;
  onConfirm: () => void; onChangePick: () => void;
}) {
  const { w, h } = useNarrowCardSize();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
      <h2 className="text-2xl font-bold text-white mb-1">Ready to compare?</h2>
      <p className="text-sm text-gray-500 mb-8">Confirm your matchup before diving in</p>
      <div className="flex items-center justify-center gap-4 mb-10 sm:gap-10">
        <div className="flex flex-col items-center gap-2">
          <HoloCardWrapper width={w} height={h}>
            <CardFront company={companyA} cardW={w} />
          </HoloCardWrapper>
          <p className="text-sm font-bold text-white text-center">{companyA.name}</p>
          <p className="text-xs text-gray-600">{companyA.ticker}</p>
        </div>
        <div className="flex-shrink-0">
          <p className="text-3xl font-black text-gray-700 tracking-widest">VS</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <HoloCardWrapper width={w} height={h}>
            <CardFront company={companyB} cardW={w} />
          </HoloCardWrapper>
          <p className="text-sm font-bold text-white text-center">{companyB.name}</p>
          <p className="text-xs text-gray-600">{companyB.ticker}</p>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <button
          onClick={onConfirm}
          className="px-6 py-2.5 rounded-lg font-bold text-sm tracking-wider transition-opacity hover:opacity-90"
          style={{ background: '#4FD1E8', color: '#000810' }}
        >
          Compare →
        </button>
        <button
          onClick={onChangePick}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Pick different
        </button>
      </div>
    </motion.div>
  );
}

// ── Main detail component ──────────────────────────────────────────────────────

export default function StockDetail({
  company,
  onBack,
  onOpenSidebar,
  onCompare,
}: {
  company: Company;
  onBack: () => void;
  onOpenSidebar?: () => void;
  onCompare?: (target: Company) => void;
}) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [compareStep, setCompareStep] = useState<'idle' | 'picking' | 'confirm'>('idle');
  const [comparePick, setComparePick] = useState<Company | null>(null);

  const cancelCompare = useCallback(() => { setCompareStep('idle'); setComparePick(null); }, []);
  const handleBack = useCallback(() => {
    if (compareStep !== 'idle') { cancelCompare(); } else { onBack(); }
  }, [compareStep, cancelCompare, onBack]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stock/${company.ticker}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json as StockData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [company.ticker]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const signal = data ? getValuationSignal(data.forwardPE) : 'N/A';
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'financials', label: 'Financials' },
    { id: 'valuation',  label: 'Valuation' },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)' }}
    >
      {/* ── Sticky header ──────────────────────────────────────── */}
      <div className="sticky top-0 z-50 border-b border-[#1a1a2e] backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.9)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          {onOpenSidebar && <HamburgerButton onClick={onOpenSidebar} className="flex-shrink-0" />}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#4FD1E8] transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
          <div className="flex-1 flex items-center justify-center gap-2">
            <span className="font-bold text-sm" style={{ color: company.brandColor }}>{company.ticker}</span>
            <span className="text-gray-500 text-sm hidden sm:inline">{company.name}</span>
            {signal !== 'N/A' && (
              <span className={`text-xs px-2 py-0.5 rounded font-bold tracking-widest
                ${signal === 'CHEAP' ? 'badge-cheap' : signal === 'FAIR' ? 'badge-fair' : 'badge-rich'}`}>
                {signal} P/E
              </span>
            )}
          </div>
          {loading
            ? <div className="skeleton rounded w-20 h-6 flex-shrink-0" />
            : data
            ? <p className="text-lg font-semibold text-gray-100 tabular-nums flex-shrink-0">{formatPrice(data.price)}</p>
            : null}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Mobile/tablet card row: same 3 cards, horizontal instead of stacked ─ */}
        <div className="lg:hidden mb-6 -mx-4 px-4">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {compareStep === 'idle' ? (
              <>
                <div className="flex-shrink-0"><MiniCard company={company} data={data} loading={loading} face="front" /></div>
                <div className="flex-shrink-0"><MiniCard company={company} data={data} loading={loading} face="back" /></div>
                <div className="flex-shrink-0">
                  <CompareCard isFlipped={false} pick={null} onClick={() => setCompareStep('picking')} />
                </div>
              </>
            ) : (
              <>
                <div className="flex-shrink-0"><MiniCard company={company} data={data} loading={loading} face="front" /></div>
                <div className="flex-shrink-0">
                  <CompareCard isFlipped={true} pick={comparePick} onClick={cancelCompare} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-8">

          {/* ── Pinned left column: two full-size holographic cards ─ */}
          <div className="flex-shrink-0 hidden lg:block" style={{ width: CARD_W }}>
            <div className="sticky top-20 flex flex-col gap-4 items-center">
              <MiniCard company={company} data={data} loading={loading} face="front" />
              <MiniCard company={company} data={data} loading={loading} face="back" />
              <CompareCard
                isFlipped={compareStep !== 'idle'}
                pick={comparePick}
                onClick={() => {
                  if (compareStep !== 'idle') { cancelCompare(); }
                  else { setCompareStep('picking'); }
                }}
              />
              <p className="text-xs text-gray-600 text-center mt-1">{company.shortName}</p>
            </div>
          </div>

          {/* ── Main content ────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {compareStep === 'picking' ? (
              <PickerView
                company={company}
                onPick={(c) => { setComparePick(c); setCompareStep('confirm'); }}
              />
            ) : compareStep === 'confirm' ? (
              <ConfirmView
                companyA={company}
                companyB={comparePick!}
                onConfirm={() => onCompare?.(comparePick!)}
                onChangePick={() => setCompareStep('picking')}
              />
            ) : (<>
            {/* Company name */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">{company.name}</h2>
              <p className="text-sm text-gray-500 mb-5">{company.ticker} &middot; NASDAQ</p>

              {/* About */}
              <AboutSection summary={data?.summary} loading={loading} />

              {/* Key metric chips */}
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => <MetricSkeleton key={i} />)}
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl border border-red-900 bg-red-950/20 text-red-400 text-sm">
                  {error}
                  <button onClick={fetchData} className="ml-3 underline hover:no-underline">Retry</button>
                </div>
              ) : data ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <KeyMetric label="Price"       value={formatPrice(data.price)} />
                  <KeyMetric label="Market Cap"  value={formatBig(data.marketCap)} />
                  <KeyMetric label="P/E Ratio"   value={formatRatio(data.peRatio)} />
                  <KeyMetric label="Forward P/E" value={formatRatio(data.forwardPE)} />
                  <KeyMetric label="EPS (TTM)"   value={data.eps != null ? `$${data.eps.toFixed(2)}` : 'N/A'} />
                  <KeyMetric label="Revenue"     value={formatBig(data.revenue)} sub="trailing 12mo" />
                </div>
              ) : null}
            </div>

            {/* Key stats + analyst ratings (below metrics grid, above charts) */}
            <KeyStatsSection data={data} loading={loading} />
            <AnalystRatingsSection data={data} loading={loading} />

            {/* ── Charts ─────────────────────────────────────────── */}
            <StockCharts ticker={company.ticker} />

            {/* ── Tab bar ─────────────────────────────────────────── */}
            <div className="flex gap-1 mb-6 border-b border-[#1e1e3a]">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="relative px-5 py-2.5 text-sm font-medium transition-colors"
                  style={{ color: activeTab === t.id ? '#4FD1E8' : '#6B7280' }}
                >
                  {t.label}
                  {activeTab === t.id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ background: '#4FD1E8' }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content — skeletons always show while loading */}
            {!error && (
              <AnimatePresence>
                {activeTab === 'overview' && (
                  <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    <OverviewTab data={data} loading={loading} />
                  </motion.div>
                )}
                {activeTab === 'financials' && (
                  <motion.div key="financials" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    <FinancialsTab data={data} loading={loading} />
                  </motion.div>
                )}
                {activeTab === 'valuation' && (
                  <motion.div key="valuation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    <ValuationTab data={data} loading={loading} />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            </>)}
          </div>
        </div>
      </div>
      <footer className="w-full text-center py-4 px-6 text-xs text-gray-500">
        Mag 7 Valuations is a research and learning tool. Data sourced from Yahoo Finance and may be delayed up to 15 minutes. Not investment advice.
        <br />
        Built by Donovan Young
      </footer>
    </div>
  );
}
