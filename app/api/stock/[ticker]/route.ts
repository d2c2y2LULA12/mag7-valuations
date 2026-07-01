import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yf = new YahooFinance();

const ALLOWED = new Set(['META', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'NVDA', 'TSLA']);

function safe(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(val);
  return isFinite(n) ? n : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();
  if (!ALLOWED.has(ticker)) {
    return NextResponse.json({ error: 'Ticker not supported' }, { status: 400 });
  }

  try {
    const result: any = await yf.quoteSummary(ticker, {
      modules: [
        'price',
        'summaryDetail',
        'financialData',
        'defaultKeyStatistics',
        'incomeStatementHistory',
        'balanceSheetHistory',
        'cashflowStatementHistory',
        'recommendationTrend',
        'assetProfile',
      ],
    }, { validateResult: false });

    const price   = result.price            as Record<string, unknown> | undefined;
    const fin     = result.financialData    as Record<string, unknown> | undefined;
    const stats   = result.defaultKeyStatistics as Record<string, unknown> | undefined;
    const detail  = result.summaryDetail    as Record<string, unknown> | undefined;
    const profile = result.assetProfile     as Record<string, unknown> | undefined;

    // Income statements (up to 4 years)
    const incomeRows = (result.incomeStatementHistory as any)
      ?.incomeStatementHistory ?? [];
    const incomeStatements = incomeRows.slice(0, 4).map((s: any) => ({
      year: new Date(s.endDate).getFullYear(),
      revenue:         safe(s.totalRevenue),
      grossProfit:     safe(s.grossProfit),
      operatingIncome: safe(s.ebit ?? s.operatingIncome),
      netIncome:       safe(s.netIncome),
      eps:             safe(s.dilutedEps ?? s.basicEps),
    }));

    // Balance sheets
    const balanceRows = (result.balanceSheetHistory as any)
      ?.balanceSheetStatements ?? [];
    const balanceSheets = balanceRows.slice(0, 4).map((s: any) => ({
      year:             new Date(s.endDate).getFullYear(),
      totalAssets:      safe(s.totalAssets),
      totalLiabilities: safe(s.totalLiab ?? s.totalLiabilities),
      totalEquity:      safe(s.totalStockholderEquity ?? s.commonStockEquity),
      cash:             safe(s.cash ?? s.cashAndCashEquivalents),
      longTermDebt:     safe(s.longTermDebt),
    }));

    // Cash flows
    const cashRows = (result.cashflowStatementHistory as any)
      ?.cashflowStatements ?? [];
    const cashFlows = cashRows.slice(0, 4).map((s: any) => {
      const ocf   = safe(s.totalCashFromOperatingActivities ?? s.operatingCashFlow);
      const capex = safe(s.capitalExpenditures);
      const fcf   = safe(s.freeCashFlow) ?? (ocf != null && capex != null ? ocf + capex : null);
      return { year: new Date(s.endDate).getFullYear(), operatingCashFlow: ocf, capex, freeCashFlow: fcf };
    });

    // Analyst ratings
    const trend = (result.recommendationTrend as any)?.trend?.[0];
    const buy   = (trend?.strongBuy ?? 0) + (trend?.buy  ?? 0);
    const hold  = trend?.hold ?? 0;
    const sell  = (trend?.sell ?? 0) + (trend?.strongSell ?? 0);

    return NextResponse.json({
      ticker,
      price:          safe(price?.regularMarketPrice),
      change:         null,
      changePercent:  safe(price?.regularMarketChangePercent),
      peRatio:        safe(detail?.trailingPE),
      forwardPE:      safe(stats?.forwardPE),
      eps:            safe(stats?.trailingEps),
      forwardEps:     safe(stats?.forwardEps),
      marketCap:      safe(price?.marketCap),
      revenue:        safe(fin?.totalRevenue),
      netIncome:      incomeStatements[0]?.netIncome ?? null,
      profitMargin:   safe(fin?.profitMargins),
      grossMargin:    safe(fin?.grossMargins),
      revenueGrowth:  safe(fin?.revenueGrowth),
      returnOnEquity: safe(fin?.returnOnEquity),
      debtToEquity:   safe(fin?.debtToEquity),
      freeCashFlow:   safe(fin?.freeCashflow),
      priceToSales:   safe(detail?.priceToSalesTrailing12Months),
      evToEbitda:     safe(stats?.enterpriseToEbitda),
      summary:        (profile?.longBusinessSummary as string) ?? null,
      dayHigh:        safe(price?.regularMarketDayHigh),
      dayLow:         safe(price?.regularMarketDayLow),
      fiftyTwoWeekHigh: safe(detail?.fiftyTwoWeekHigh),
      fiftyTwoWeekLow:  safe(detail?.fiftyTwoWeekLow),
      volume:          safe(price?.regularMarketVolume),
      averageVolume:   safe(detail?.averageVolume),
      analystRatings: {
        mean:  safe(detail?.trailingAnnualDividendYield ?? null),
        key:   (detail as any)?.recommendationKey ?? '',
        total: buy + hold + sell || null,
        buy, hold, sell,
      },
      incomeStatements,
      balanceSheets,
      cashFlows,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
