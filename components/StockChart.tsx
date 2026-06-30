'use client';

import { useState, useEffect } from 'react';

interface DataPoint {
  date: string;
  price: number;
  pe: number | null;
}

interface ChartData {
  ticker: string;
  period: string;
  data: DataPoint[];
}

const TIME_RANGES = ['1M', '3M', '6M', 'YTD', '1Y', 'All'] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const RANGE_TO_API: Record<TimeRange, string> = {
  '1M': '1M', '3M': '3M', '6M': '6M', 'YTD': 'YTD', '1Y': '1Y', 'All': 'ALL',
};

// Fixed SVG coordinate space — scales to container width via preserveAspectRatio="none"
const VW = 1000;
const VH = 130;
const PAD = { t: 8, r: 4, b: 8, l: 4 };
const CW = VW - PAD.l - PAD.r;
const CH = VH - PAD.t - PAD.b;

function buildSvgPaths(values: number[]): { line: string; area: string } {
  if (values.length < 2) return { line: '', area: '' };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const x = (i: number) => PAD.l + (i / (values.length - 1)) * CW;
  const y = (v: number) => PAD.t + (1 - (v - min) / range) * CH;

  const moves = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = moves.join(' ');
  const baseline = PAD.t + CH;
  const area = `${line} L${x(values.length - 1).toFixed(1)},${baseline} L${PAD.l},${baseline} Z`;

  return { line, area };
}

function formatDateLabel(date: string, range: TimeRange): string {
  const d = new Date(date);
  if (range === '1M' || range === '3M') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (range === '6M' || range === 'YTD') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function LineChart({
  values,
  color,
  gradientId,
}: {
  values: number[];
  color: string;
  gradientId: string;
}) {
  if (values.length < 2) return null;
  const { line, area } = buildSvgPaths(values);

  return (
    <svg
      width="100%"
      height={VH}
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} stroke={color} strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ChartCard({
  title,
  subtitle,
  values,
  color,
  gradientId,
  ticker,
  range,
  startDate,
  endDate,
  fmtValue,
  suffix,
}: {
  title: string;
  subtitle?: string;
  values: number[];
  color: string;
  gradientId: string;
  ticker: string;
  range: TimeRange;
  startDate: string;
  endDate: string;
  fmtValue: (v: number) => string;
  suffix?: string;
}) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = values[values.length - 1];
  const first = values[0];
  const change = ((latest - first) / first) * 100;
  const positive = change >= 0;

  return (
    <div
      className="rounded-xl border border-[#1e1e3a] p-4"
      style={{ background: 'rgba(13,13,26,0.7)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
          {subtitle && <p className="text-[11px] text-gray-600 mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-white tabular-nums">{fmtValue(latest)}{suffix}</p>
          <p
            className="text-xs font-semibold tabular-nums"
            style={{ color: positive ? '#10B981' : '#EF4444' }}
          >
            {positive ? '+' : ''}{change.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <LineChart values={values} color={color} gradientId={gradientId} />

      {/* Date range + stats row */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-gray-600">{formatDateLabel(startDate, range)}</span>
        <div className="flex gap-4 text-[11px] text-gray-600">
          <span>Low: <span className="text-gray-400 tabular-nums">{fmtValue(min)}{suffix}</span></span>
          <span>High: <span className="text-gray-400 tabular-nums">{fmtValue(max)}{suffix}</span></span>
        </div>
        <span className="text-[11px] text-gray-600">{formatDateLabel(endDate, range)}</span>
      </div>
    </div>
  );
}

export default function StockCharts({ ticker }: { ticker: string }) {
  const [range, setRange] = useState<TimeRange>('1Y');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/stock/${ticker}/history?period=${RANGE_TO_API[range]}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) { setChartData(d); setLoading(false); }
      })
      .catch((e) => {
        if (!cancelled) { setError(String(e)); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [ticker, range]);

  const prices = chartData?.data.map((d) => d.price) ?? [];
  const peData = chartData?.data.filter((d) => d.pe != null) ?? [];
  const pes = peData.map((d) => d.pe as number);

  const startDate = chartData?.data[0]?.date ?? '';
  const endDate = chartData?.data[chartData.data.length - 1]?.date ?? '';

  return (
    <div className="mb-6">
      {/* Time range selector */}
      <div className="flex items-center gap-1.5 mb-4">
        {TIME_RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
            style={{
              background: range === r ? 'rgba(79,209,232,0.15)' : 'rgba(255,255,255,0.04)',
              color: range === r ? '#4FD1E8' : '#6B7280',
              border: `1px solid ${range === r ? 'rgba(79,209,232,0.4)' : 'transparent'}`,
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton rounded-xl" style={{ height: 170 }} />
          <div className="skeleton rounded-xl" style={{ height: 170 }} />
        </div>
      ) : error ? (
        <p className="text-sm text-red-400 p-4">Chart data unavailable.</p>
      ) : prices.length < 2 ? (
        <p className="text-sm text-gray-600 p-4">No data for this range.</p>
      ) : (
        <div className="space-y-3">
          <ChartCard
            title="Stock Price"
            values={prices}
            color="#10B981"
            gradientId={`price-${ticker}-${range}`}
            ticker={ticker}
            range={range}
            startDate={startDate}
            endDate={endDate}
            fmtValue={(v) => `$${v.toFixed(2)}`}
          />
          {pes.length >= 2 && (
            <ChartCard
              title="Est. P/E Ratio"
              subtitle="Price ÷ current TTM EPS"
              values={pes}
              color="#4FD1E8"
              gradientId={`pe-${ticker}-${range}`}
              ticker={ticker}
              range={range}
              startDate={peData[0]?.date ?? startDate}
              endDate={peData[peData.length - 1]?.date ?? endDate}
              fmtValue={(v) => v.toFixed(1)}
              suffix="x"
            />
          )}
        </div>
      )}
    </div>
  );
}
