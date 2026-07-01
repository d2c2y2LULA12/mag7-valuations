'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Company, StockData } from '@/lib/types';
import { MiniCard, CARD_W } from './TradingCard';
import { HamburgerButton } from './Sidebar';
import FinancialTables from './FinancialTables';
import StockCharts from './StockChart';
import { formatBig, formatRatio, formatPrice, getValuationSignal } from '@/lib/constants';

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
      isGood: (data.revenueGrowth ?? 0) >= 0.12,
    },
    {
      label: 'Profit Margin',
      display: data.profitMargin !== null ? `${(data.profitMargin * 100).toFixed(1)}%` : 'N/A',
      percent: pct(data.profitMargin, 0.5),
      isGood: (data.profitMargin ?? 0) >= 0.18,
    },
    {
      label: 'Return on Equity',
      display: data.returnOnEquity !== null ? `${(data.returnOnEquity * 100).toFixed(1)}%` : 'N/A',
      percent: clamp(((data.returnOnEquity ?? 0) / 2.5) * 100, 0, 100),
      isGood: (data.returnOnEquity ?? 0) >= 0.5,
    },
    {
      label: 'EPS (TTM)',
      display: data.eps !== null ? `$${data.eps.toFixed(2)}` : 'N/A',
      percent: pct(data.eps, 30),
      isGood: (data.eps ?? 0) >= 8,
    },
    {
      label: 'Debt / Equity',
      display: data.debtToEquity !== null ? `${data.debtToEquity.toFixed(1)}` : 'N/A',
      percent: data.debtToEquity === null ? 0 : clamp(100 - (data.debtToEquity / 300) * 100, 0, 100),
      isGood: (data.debtToEquity ?? 999) < 100,
    },
    {
      label: 'Free Cash Flow',
      display: formatBig(data.freeCashFlow),
      percent: pct(data.freeCashFlow, 120e9),
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <p className="text-xs text-gray-600 mb-4">
        Bar represents strength vs. Mag 7 peers. Green = above benchmark, red = below.
      </p>
      <div className="rounded-xl border border-[#1e1e3a] px-5 py-1" style={{ background: 'rgba(13,13,26,0.7)' }}>
        {stats.map((s) => <FIFAStatBar key={s.label} stat={s} />)}
      </div>
    </motion.div>
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
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <FinancialTables data={data} />
    </motion.div>
  );
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
  const metrics: ValMetric[] = [
    { label: 'P/E Ratio (Trailing)', value: data.peRatio,      avg: MAG7_AVG.pe },
    { label: 'Forward P/E',          value: data.forwardPE,    avg: MAG7_AVG.forwardPe },
    { label: 'Price / Sales (TTM)',  value: data.priceToSales, avg: MAG7_AVG.ps },
    { label: 'EV / EBITDA',         value: data.evToEbitda,   avg: MAG7_AVG.evEbitda },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="rounded-xl border border-[#1e1e3a] p-5 mb-6 flex items-center justify-between" style={{ background: 'rgba(13,13,26,0.7)' }}>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Valuation Signal</p>
          <p className="text-xs text-gray-600">Based on Forward P/E vs. 20 / 30 thresholds</p>
        </div>
        <span className={`text-xl font-black tracking-widest px-4 py-2 rounded-lg ${signalClass}`}>{signal}</span>
      </div>
      <div className="rounded-xl border border-[#1e1e3a] px-6 pt-5 pb-1" style={{ background: 'rgba(13,13,26,0.7)' }}>
        <p className="text-xs text-gray-600 mb-5">
          Teal line = Mag 7 average. Bar fills left to right up to 2× average. Green = cheaper than peers.
        </p>
        {metrics.map((m) => <ValBar key={m.label} m={m} />)}
      </div>
    </motion.div>
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
            <p className="text-xs text-gray-600 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-gray-200 tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Analyst ratings ────────────────────────────────────────────────────────────

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
  const total = r.total || (r.buy + r.hold + r.sell);
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
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Analyst Ratings</p>
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
          Consensus: <span className="text-gray-400 capitalize">{r.key || 'N/A'}</span>
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
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-lg font-semibold text-gray-100 tabular-nums">{value}</span>
      {sub && <span className="text-xs text-gray-600">{sub}</span>}
    </div>
  );
}

// ── Main detail component ──────────────────────────────────────────────────────

export default function StockDetail({
  company,
  onBack,
  onOpenSidebar,
}: {
  company: Company;
  onBack: () => void;
  onOpenSidebar?: () => void;
}) {
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
            onClick={onBack}
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
                {signal}
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
        <div className="flex gap-8">

          {/* ── Pinned left column: two full-size holographic cards ─ */}
          <div className="flex-shrink-0 hidden lg:block" style={{ width: CARD_W }}>
            <div className="sticky top-20 flex flex-col gap-4 items-center">
              <MiniCard company={company} data={data} loading={loading} face="front" />
              <MiniCard company={company} data={data} loading={loading} face="back" />
              <p className="text-xs text-gray-600 text-center mt-1">{company.shortName}</p>
            </div>
          </div>

          {/* ── Main content ────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
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
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <OverviewTab data={data} loading={loading} />
                  </motion.div>
                )}
                {activeTab === 'financials' && (
                  <motion.div key="financials" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <FinancialsTab data={data} loading={loading} />
                  </motion.div>
                )}
                {activeTab === 'valuation' && (
                  <motion.div key="valuation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <ValuationTab data={data} loading={loading} />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
