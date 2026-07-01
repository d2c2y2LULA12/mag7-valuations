'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
  dates,
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
  dates: string[];
  color: string;
  gradientId: string;
  ticker: string;
  range: TimeRange;
  startDate: string;
  endDate: string;
  fmtValue: (v: number) => string;
  suffix?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => { setHoverIdx(null); setMousePos(null); }, [values]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || values.length < 2) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const norm = Math.max(0, Math.min(1, px / rect.width));
    setHoverIdx(Math.round(norm * (values.length - 1)));
    setMousePos({ x: px, y: py });
  }, [values.length]);

  const handleMouseLeave = useCallback(() => {
    setHoverIdx(null);
    setMousePos(null);
  }, []);

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const valueRange = max - min || 1;
  const latest = values[values.length - 1];
  const first = values[0];
  const change = ((latest - first) / first) * 100;
  const positive = (suffix === 'x' ? latest - first : change) >= 0;
  const changeLabel = suffix === 'x'
    ? `${positive ? '+' : ''}${(latest - first).toFixed(1)}x`
    : `${positive ? '+' : ''}${change.toFixed(1)}%`;

  const hoverX = hoverIdx !== null
    ? PAD.l + (hoverIdx / (values.length - 1)) * CW
    : null;
  const hoverY = hoverIdx !== null
    ? PAD.t + (1 - (values[hoverIdx] - min) / valueRange) * CH
    : null;

  // Flip tooltip left when cursor is in the right 35% of the chart
  const cw = containerRef.current?.clientWidth ?? 400;
  const tooltipOnLeft = mousePos !== null && mousePos.x > cw * 0.65;

  return (
    <div
      className="rounded-xl border border-[#1e1e3a] p-4"
      style={{ background: 'rgba(13,13,26,0.7)' }}
    >
      {/* Header — always shows latest value + period change */}
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
            {changeLabel}
          </p>
        </div>
      </div>

      {/* Chart with crosshair + floating tooltip */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ height: VH, cursor: 'crosshair', overflow: 'visible' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <LineChart values={values} color={color} gradientId={gradientId} />

        {/* Crosshair overlay */}
        {hoverX !== null && hoverY !== null && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width="100%"
            height={VH}
            viewBox={`0 0 ${VW} ${VH}`}
            preserveAspectRatio="none"
            style={{ display: 'block', overflow: 'visible' }}
          >
            <line
              x1={hoverX} y1={PAD.t}
              x2={hoverX} y2={PAD.t + CH}
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <circle cx={hoverX} cy={hoverY} r="5" fill={color} stroke="#0a0a0a" strokeWidth="2" />
          </svg>
        )}

        {/* Floating tooltip */}
        {mousePos !== null && hoverIdx !== null && (
          <div
            className="absolute pointer-events-none z-20"
            style={{
              top: Math.max(0, mousePos.y - 44),
              ...(tooltipOnLeft
                ? { right: cw - mousePos.x + 14 }
                : { left: mousePos.x + 14 }),
              background: 'rgba(8,10,22,0.93)',
              border: '1px solid rgba(79,209,232,0.28)',
              borderRadius: 8,
              padding: '6px 10px',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
            }}
          >
            <p style={{ color: '#4FD1E8', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
              {fmtValue(values[hoverIdx])}{suffix}
            </p>
            {dates[hoverIdx] && (
              <p style={{ color: '#6B7280', fontSize: 11, marginTop: 1 }}>
                {formatDateLabel(dates[hoverIdx], range)}
              </p>
            )}
          </div>
        )}
      </div>

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
        if (!cancelled) {
          if (d?.data) { setChartData(d); } else { setError(d?.error ?? 'No data'); }
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) { setError(String(e)); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [ticker, range]);

  const prices = chartData?.data?.map((d) => d.price) ?? [];
  const priceDates = chartData?.data?.map((d) => d.date) ?? [];
  const peData = chartData?.data?.filter((d) => d.pe != null) ?? [];
  const pes = peData.map((d) => d.pe as number);
  const peDates = peData.map((d) => d.date);

  const startDate = chartData?.data?.[0]?.date ?? '';
  const endDate = chartData?.data ? chartData.data[chartData.data.length - 1]?.date ?? '' : '';

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
            dates={priceDates}
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
              dates={peDates}
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
