import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yf = new YahooFinance();

const ALLOWED = new Set(['META', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'NVDA', 'TSLA']);

type Interval = '1d' | '1wk' | '1mo';
const PERIOD_MAP: Record<string, { months?: number; years?: number; ytd?: boolean; max?: boolean; interval: Interval }> = {
  '1M':  { months: 1,  interval: '1d' },
  '3M':  { months: 3,  interval: '1d' },
  '6M':  { months: 6,  interval: '1d' },
  'YTD': { ytd: true,  interval: '1d' },
  '1Y':  { years: 1,   interval: '1d' },
  'ALL': { max: true,  interval: '1wk' },
};

function periodStart(cfg: typeof PERIOD_MAP[string]): Date {
  const now = new Date();
  if (cfg.max) return new Date('2000-01-01');
  if (cfg.ytd) return new Date(now.getFullYear(), 0, 1);
  const d = new Date(now);
  if (cfg.months) d.setMonth(d.getMonth() - cfg.months);
  if (cfg.years)  d.setFullYear(d.getFullYear() - cfg.years);
  return d;
}

function safe(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(val);
  return isFinite(n) ? n : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();
  const period = (new URL(req.url).searchParams.get('period') ?? '1Y').toUpperCase();

  if (!ALLOWED.has(ticker)) {
    return NextResponse.json({ error: 'Ticker not supported' }, { status: 400 });
  }

  const cfg = PERIOD_MAP[period] ?? PERIOD_MAP['1Y'];

  try {
    const [hist, quote] = await Promise.all([
      yf.historical(ticker, {
        period1: periodStart(cfg),
        interval: cfg.interval,
      }, { validateResult: false }),
      yf.quoteSummary(ticker, {
        modules: ['defaultKeyStatistics'],
      }, { validateResult: false }),
    ]);

    const eps = safe((quote.defaultKeyStatistics as any)?.trailingEps);

    const data = hist
      .filter(h => h.close != null)
      .map(h => ({
        date:  h.date.toISOString().slice(0, 10),
        price: Math.round(h.close! * 100) / 100,
        pe:    eps && eps > 0 ? Math.round((h.close! / eps) * 100) / 100 : null,
      }));

    return NextResponse.json({ ticker, period, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
