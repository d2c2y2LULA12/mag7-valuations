import { NextRequest, NextResponse } from 'next/server';
import type { StockData, IncomeStatementRow, BalanceSheetRow, CashFlowRow } from '@/lib/types';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Module-level auth cache ──────────────────────────────────────────────────
// Persists across requests in the same Node.js process (Next.js dev server or
// a long-running production instance). Re-fetches crumb after 25 minutes.
type AuthCache = { crumb: string; cookie: string; expiresAt: number };
let authCache: AuthCache | null = null;

async function getAuth(): Promise<AuthCache> {
  if (authCache && Date.now() < authCache.expiresAt) return authCache;

  // Step 1 — Load Yahoo Finance to get session cookies
  const homeRes = await fetch('https://finance.yahoo.com/', {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
    cache: 'no-store',
  });

  // Node 18.14+ exposes getSetCookie() which handles multi-value headers properly
  type HeadersWithGSC = Headers & { getSetCookie?: () => string[] };
  const h = homeRes.headers as HeadersWithGSC;
  const rawCookies: string[] =
    typeof h.getSetCookie === 'function'
      ? h.getSetCookie()
      : (homeRes.headers.get('set-cookie') ?? '').split(/,(?=\s*[A-Za-z0-9_-]+=)/);

  const cookie = rawCookies
    .map((s) => s.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  // Step 2 — Exchange cookies for a crumb
  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': UA,
      'Cookie': cookie,
      'Accept': 'text/plain, */*',
      'Referer': 'https://finance.yahoo.com/',
    },
    cache: 'no-store',
  });

  const crumb = (await crumbRes.text()).trim();

  // A valid crumb is a short alphanumeric string (8-12 chars). Reject HTML / error pages.
  if (!crumb || crumb.length < 3 || crumb.startsWith('<') || crumb.includes(' ')) {
    throw new Error(`Yahoo Finance crumb unavailable (got: "${crumb.slice(0, 40)}")`);
  }

  authCache = { crumb, cookie, expiresAt: Date.now() + 25 * 60_000 };
  return authCache;
}

// ── Authenticated Yahoo Finance fetch ────────────────────────────────────────
async function yfFetch(path: string, retried = false): Promise<Record<string, unknown>> {
  const a = await getAuth();
  const sep = path.includes('?') ? '&' : '?';
  const url = `${path}${sep}crumb=${encodeURIComponent(a.crumb)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Cookie': a.cookie,
      'Accept': 'application/json, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://finance.yahoo.com/',
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    // On auth errors, clear cache and retry once with a fresh crumb
    if ((res.status === 401 || res.status === 403 || res.status === 429) && !retried) {
      authCache = null;
      return yfFetch(path, true);
    }
    throw new Error(`Yahoo Finance ${res.status} for ${path.split('?')[0]}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function raw(obj: Record<string, unknown> | null | undefined, key: string): number | null {
  if (!obj) return null;
  const v = obj[key];
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v !== null && 'raw' in v) return (v as { raw: number }).raw ?? null;
  return null;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();

  try {
    const QUOTE_FIELDS = [
      'regularMarketPrice',
      'regularMarketChangePercent',
      'trailingPE',
      'forwardPE',
      'marketCap',
      'epsTrailingTwelveMonths',
      'epsForward',
      'priceToSalesTrailingTwelveMonths',
      'enterpriseToEbitda',
    ].join(',');

    const SUMMARY_MODULES = [
      'financialData',
      'defaultKeyStatistics',
      'incomeStatementHistory',
      'balanceSheetHistory',
      'cashflowStatementHistory',
    ].join(',');

    // Fetch v8 quote + v10 quoteSummary in parallel
    const [quoteRes, summaryRes] = await Promise.allSettled([
      yfFetch(
        `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${ticker}&fields=${QUOTE_FIELDS}`
      ),
      yfFetch(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${SUMMARY_MODULES}`
      ),
    ]);

    // Extract quote fields (gracefully — partial data is better than nothing)
    type QR = Record<string, number | null>;
    const quote: QR =
      quoteRes.status === 'fulfilled'
        ? (((quoteRes.value as Record<string, unknown>)?.quoteResponse as Record<string, unknown>)
            ?.result as QR[])?.[0] ?? {}
        : {};

    // Extract summary result object
    type SR = Record<string, unknown>;
    const summary: SR =
      summaryRes.status === 'fulfilled'
        ? (((summaryRes.value as Record<string, unknown>)?.quoteSummary as SR)
            ?.result as SR[])?.[0] ?? {}
        : {};

    const fd = (summary.financialData ?? {}) as Record<string, unknown>;

    // ── Income statements ────────────────────────────────────────────────────
    const incomeStatements: IncomeStatementRow[] = (
      (summary.incomeStatementHistory as Record<string, unknown[]> | undefined)
        ?.incomeStatementHistory ?? []
    )
      .slice(0, 4)
      .map((s) => {
        const row = s as Record<string, unknown>;
        const endDate = row.endDate as { raw: number } | null;
        return {
          year: endDate ? new Date(endDate.raw * 1000).getFullYear() : 0,
          revenue: raw(row, 'totalRevenue'),
          grossProfit: raw(row, 'grossProfit'),
          operatingIncome: raw(row, 'ebit'),
          netIncome: raw(row, 'netIncome'),
          eps: raw(row, 'dilutedEps'),
        };
      });

    // ── Balance sheets ───────────────────────────────────────────────────────
    const balanceSheets: BalanceSheetRow[] = (
      (summary.balanceSheetHistory as Record<string, unknown[]> | undefined)
        ?.balanceSheetStatements ?? []
    )
      .slice(0, 4)
      .map((s) => {
        const row = s as Record<string, unknown>;
        const endDate = row.endDate as { raw: number } | null;
        return {
          year: endDate ? new Date(endDate.raw * 1000).getFullYear() : 0,
          totalAssets: raw(row, 'totalAssets'),
          totalLiabilities: raw(row, 'totalLiab'),
          totalEquity: raw(row, 'totalStockholderEquity'),
          cash: raw(row, 'cash'),
          longTermDebt: raw(row, 'longTermDebt'),
        };
      });

    // ── Cash flows ───────────────────────────────────────────────────────────
    const cashFlows: CashFlowRow[] = (
      (summary.cashflowStatementHistory as Record<string, unknown[]> | undefined)
        ?.cashflowStatements ?? []
    )
      .slice(0, 4)
      .map((s) => {
        const row = s as Record<string, unknown>;
        const endDate = row.endDate as { raw: number } | null;
        const ocf = raw(row, 'totalCashFromOperatingActivities');
        const capex = raw(row, 'capitalExpenditures'); // negative in YF
        return {
          year: endDate ? new Date(endDate.raw * 1000).getFullYear() : 0,
          operatingCashFlow: ocf,
          capex,
          freeCashFlow: ocf !== null && capex !== null ? ocf + capex : null,
        };
      });

    const data: StockData = {
      ticker,
      price: (quote.regularMarketPrice as number) ?? null,
      change: null,
      changePercent: (quote.regularMarketChangePercent as number) ?? null,
      peRatio: (quote.trailingPE as number) ?? null,
      forwardPE: (quote.forwardPE as number) ?? null,
      eps: (quote.epsTrailingTwelveMonths as number) ?? null,
      forwardEps: (quote.epsForward as number) ?? null,
      marketCap: (quote.marketCap as number) ?? null,
      priceToSales: (quote.priceToSalesTrailingTwelveMonths as number) ?? null,
      evToEbitda: (quote.enterpriseToEbitda as number) ?? null,
      revenue: raw(fd, 'totalRevenue'),
      netIncome: incomeStatements[0]?.netIncome ?? null,
      profitMargin: raw(fd, 'profitMargins'),
      grossMargin: raw(fd, 'grossMargins'),
      revenueGrowth: raw(fd, 'revenueGrowth'),
      returnOnEquity: raw(fd, 'returnOnEquity'),
      debtToEquity: raw(fd, 'debtToEquity'),
      freeCashFlow: raw(fd, 'freeCashflow'),
      incomeStatements,
      balanceSheets,
      cashFlows,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[/api/stock/${ticker}]`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
