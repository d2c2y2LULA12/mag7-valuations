'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Company, StockData } from '@/lib/types';
import { MiniCard } from './TradingCard';
import FinancialTables from './FinancialTables';
import { formatBig, formatPercent, formatRatio, formatPrice, getValuationSignal } from '@/lib/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'financials' | 'valuation';

// ── Overview: FIFA-style stat bars ────────────────────────────────────────────

interface StatBarConfig {
  label: string;
  value: number | null;
  display: string;
  percent: number;       // 0–100 bar width
  isGood: boolean;       // green vs red
  lowerIsBetter?: boolean;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}

function buildStats(data: StockData): StatBarConfig[] {
  const pct = (v: number | null, scale: number): number =>
    v === null ? 0 : clamp((v / scale) * 100, 0, 100);

  return [
    {
      label: 'Revenue Growth',
      value: data.revenueGrowth,
      display: data.revenueGrowth !== null ? `${(data.revenueGrowth * 100).toFixed(1)}%` : 'N/A',
      percent: pct(data.revenueGrowth, 0.5),   // 50% growth = full bar
      isGood: (data.revenueGrowth ?? 0) >= 0.12,
    },
    {
      label: 'Profit Margin',
      value: data.profitMargin,
      display: data.profitMargin !== null ? `${(data.profitMargin * 100).toFixed(1)}%` : 'N/A',
      percent: pct(data.profitMargin, 0.5),
      isGood: (data.profitMargin ?? 0) >= 0.18,
    },
    {
      label: 'Return on Equity',
      value: data.returnOnEquity,
      display: data.returnOnEquity !== null ? `${(data.returnOnEquity * 100).toFixed(1)}%` : 'N/A',
      percent: clamp(((data.returnOnEquity ?? 0) / 2.5) * 100, 0, 100), // 250% = full bar
      isGood: (data.returnOnEquity ?? 0) >= 0.5,
    },
    {
      label: 'EPS (TTM)',
      value: data.eps,
      display: data.eps !== null ? `$${data.eps.toFixed(2)}` : 'N/A',
      percent: pct(data.eps, 30),   // $30 = full bar
      isGood: (data.eps ?? 0) >= 8,
    },
    {
      label: 'Debt / Equity',
      value: data.debtToEquity,
      display: data.debtToEquity !== null ? `${data.debtToEquity.toFixed(1)}` : 'N/A',
      // Lower is better — invert the bar
      percent: data.debtToEquity === null ? 0 : clamp(100 - (data.debtToEquity / 300) * 100, 0, 100),
      isGood: (data.debtToEquity ?? 999) < 100,
      lowerIsBetter: true,
    },
    {
      label: 'Free Cash Flow',
      value: data.freeCashFlow,
      display: formatBig(data.freeCashFlow),
      percent: pct(data.freeCashFlow, 120e9),  // $120B = full bar
      isGood: (data.freeCashFlow ?? 0) >= 20e9,
    },
  ];
}

function FIFAStatBar({ stat }: { stat: StatBarConfig }) {
  return (
    <div className="flex items-center gap-4 py-2.5 border-b border-[#1a1a2e] last:border-0">
      <span className="text-sm text-gray-400 w-36 flex-shrink-0">{stat.label}</span>
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
      <span className="text-xs w-8 text-right flex-shrink-0" style={{ color: stat.isGood ? '#10B981' : '#EF4444' }}>
        {Math.round(stat.percent)}
      </span>
    </div>
  );
}

function OverviewTab({ data }: { data: StockData }) {
  const stats = buildStats(data);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <p className="text-xs text-gray-600 mb-4">
        Bar represents strength vs. Mag 7 peers. Green = above benchmark, red = below.
      </p>
      <div
        className="rounded-xl border border-[#1e1e3a] px-5 py-1"
        style={{ background: 'rgba(13,13,26,0.7)' }}
      >
        {stats.map((s) => (
          <FIFAStatBar key={s.label} stat={s} />
        ))}
      </div>
    </motion.div>
  );
}

// ── Financials tab ─────────────────────────────────────────────────────────────

function FinancialsTab({ data }: { data: StockData }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <FinancialTables data={data} />
    </motion.div>
  );
}

// ── Valuation tab ──────────────────────────────────────────────────────────────

// Approximate Mag 7 averages (2025)
const MAG7_AVG = {
  pe: 35,
  forwardPe: 27,
  ps: 11,
  evEbitda: 28,
};

interface ValMetric {
  label: string;
  value: number | null;
  avg: number;
  suffix?: string;
}

function ValBar({ m }: { m: ValMetric }) {
  if (m.value === null) return (
    <div className="mb-6">
      <div className="flex justify-between mb-1">
        <span className="text-sm text-gray-400">{m.label}</span>
        <span className="text-sm text-gray-600">N/A</span>
      </div>
    </div>
  );

  // Scale: 0 = 0, 50% mark = avg, 100% = 2× avg
  const scale = m.avg * 2;
  const fillPct = clamp((m.value / scale) * 100, 0, 100);
  const avgPct = 50; // always at 50%
  const isCheap = m.value < m.avg;

  return (
    <div className="mb-7">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-300 font-medium">{m.label}</span>
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
        {/* Fill bar */}
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{ background: isCheap ? '#10B981' : '#EF4444' }}
          initial={{ width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
        />
        {/* Avg marker */}
        <div
          className="absolute top-[-4px] bottom-[-4px] w-0.5 rounded"
          style={{ left: `${avgPct}%`, background: '#4FD1E8', boxShadow: '0 0 6px rgba(79,209,232,0.6)' }}
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

function ValuationTab({ data }: { data: StockData }) {
  const signal = getValuationSignal(data.forwardPE);
  const signalClass =
    signal === 'CHEAP' ? 'badge-cheap' : signal === 'FAIR' ? 'badge-fair' : signal === 'RICH' ? 'badge-rich' : 'badge-na';

  const metrics: ValMetric[] = [
    { label: 'P/E Ratio (Trailing)',  value: data.peRatio,     avg: MAG7_AVG.pe },
    { label: 'Forward P/E',           value: data.forwardPE,   avg: MAG7_AVG.forwardPe },
    { label: 'Price / Sales (TTM)',   value: data.priceToSales, avg: MAG7_AVG.ps },
    { label: 'EV / EBITDA',          value: data.evToEbitda,  avg: MAG7_AVG.evEbitda },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Valuation signal badge */}
      <div
        className="rounded-xl border border-[#1e1e3a] p-5 mb-6 flex items-center justify-between"
        style={{ background: 'rgba(13,13,26,0.7)' }}
      >
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Valuation Signal</p>
          <p className="text-xs text-gray-600">Based on Forward P/E vs. 20 / 30 thresholds</p>
        </div>
        <span className={`text-xl font-black tracking-widest px-4 py-2 rounded-lg ${signalClass}`}>
          {signal}
        </span>
      </div>

      {/* Metric bars */}
      <div
        className="rounded-xl border border-[#1e1e3a] px-6 pt-5 pb-1"
        style={{ background: 'rgba(13,13,26,0.7)' }}
      >
        <p className="text-xs text-gray-600 mb-5">
          Teal line = Mag 7 average. Bar fills left to right up to 2× average. Green = cheaper than peers.
        </p>
        {metrics.map((m) => (
          <ValBar key={m.label} m={m} />
        ))}
      </div>
    </motion.div>
  );
}

// ── Key metric chips ───────────────────────────────────────────────────────────

function KeyMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="flex flex-col gap-0.5 p-4 rounded-xl border border-[#1e1e3a]"
      style={{ background: 'rgba(13,13,26,0.7)' }}
    >
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-lg font-semibold text-gray-100 tabular-nums">{value}</span>
      {sub && <span className="text-xs text-gray-600">{sub}</span>}
    </div>
  );
}

// ── Main detail component ──────────────────────────────────────────────────────

export default function StockDetail({ company, onBack }: { company: Company; onBack: () => void }) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)' }}
    >
      {/* ── Sticky header bar ───────────────────────────────────── */}
      <div
        className="sticky top-0 z-50 border-b border-[#1a1a2e] backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.9)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#4FD1E8] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm" style={{ color: company.brandColor }}>{company.ticker}</span>
            <span className="text-gray-500 text-sm">{company.name}</span>
            {signal !== 'N/A' && (
              <span className={`text-xs px-2 py-0.5 rounded font-bold tracking-widest
                ${signal === 'CHEAP' ? 'badge-cheap' : signal === 'FAIR' ? 'badge-fair' : 'badge-rich'}`}>
                {signal}
              </span>
            )}
          </div>

          {data && (
            <p className="text-lg font-semibold text-gray-100 tabular-nums">{formatPrice(data.price)}</p>
          )}
        </div>
      </div>

      {/* ── Body: pinned card + scrollable content ──────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-8">

          {/* ── Pinned card column ────────────────────────────── */}
          <div className="flex-shrink-0 hidden md:block" style={{ width: 140 }}>
            <div className="sticky top-20 flex flex-col gap-3 items-center">
              <MiniCard company={company} data={data} loading={loading} face="front" />
              <MiniCard company={company} data={data} loading={loading} face="back" />
              <p className="text-xs text-gray-600 text-center">{company.shortName}</p>
            </div>
          </div>

          {/* ── Main content ──────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Company name + key metrics */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-1">{company.name}</h2>
              <p className="text-sm text-gray-500 mb-5">{company.ticker} &middot; NASDAQ</p>

              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: '#1a1a2e' }} />
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl border border-red-900 bg-red-950/20 text-red-400 text-sm">
                  {error}
                  <button onClick={fetchData} className="ml-3 underline hover:no-underline">Retry</button>
                </div>
              ) : data ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <KeyMetric label="Price"        value={formatPrice(data.price)} />
                  <KeyMetric label="Market Cap"   value={formatBig(data.marketCap)} />
                  <KeyMetric label="P/E Ratio"    value={formatRatio(data.peRatio)} />
                  <KeyMetric label="Forward P/E"  value={formatRatio(data.forwardPE)} />
                  <KeyMetric label="EPS (TTM)"    value={data.eps != null ? `$${data.eps.toFixed(2)}` : 'N/A'} />
                  <KeyMetric label="Revenue"      value={formatBig(data.revenue)} sub="trailing 12mo" />
                </div>
              ) : null}
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 mb-6 border-b border-[#1e1e3a] pb-0">
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

            {/* Tab content */}
            {!loading && !error && data && (
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div key="overview">
                    <OverviewTab data={data} />
                  </motion.div>
                )}
                {activeTab === 'financials' && (
                  <motion.div key="financials">
                    <FinancialsTab data={data} />
                  </motion.div>
                )}
                {activeTab === 'valuation' && (
                  <motion.div key="valuation">
                    <ValuationTab data={data} />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
