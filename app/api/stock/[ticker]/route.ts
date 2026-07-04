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
    const [result, finSeries, balSeries, cfSeries]: [any, any, any, any] = await Promise.all([
      yf.quoteSummary(ticker, {
        modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics', 'recommendationTrend', 'assetProfile'],
      }, { validateResult: false }),
      yf.fundamentalsTimeSeries(ticker, { type: 'annual', period1: '2020-01-01', module: 'financials' } as any, { validateResult: false }),
      yf.fundamentalsTimeSeries(ticker, { type: 'annual', period1: '2020-01-01', module: 'balance-sheet' } as any, { validateResult: false }),
      yf.fundamentalsTimeSeries(ticker, { type: 'annual', period1: '2020-01-01', module: 'cash-flow' } as any, { validateResult: false }),
    ]);

    const price   = result.price            as Record<string, unknown> | undefined;
    const fin     = result.financialData    as Record<string, unknown> | undefined;
    const stats   = result.defaultKeyStatistics as Record<string, unknown> | undefined;
    const detail  = result.summaryDetail    as Record<string, unknown> | undefined;
    const profile = result.assetProfile     as Record<string, unknown> | undefined;

    const rowYear = (s: any) => s.date ? new Date(s.date).getFullYear() : null;
    // Filter rows with actual data, then take most-recent 4 (rows come oldest-first)
    const recent4 = (arr: any[], hasData: (s: any) => boolean) =>
      arr.filter(hasData).slice(-4);

    // Income statements from fundamentalsTimeSeries
    const finRows: any[] = Array.isArray(finSeries) ? finSeries : [];
    const incomeStatements = recent4(finRows, s => s.totalRevenue != null).map((s: any) => ({
      year:            rowYear(s),
      revenue:         safe(s.totalRevenue),
      grossProfit:     safe(s.grossProfit),
      operatingIncome: safe(s.operatingIncome ?? s.EBIT),
      netIncome:       safe(s.netIncome),
      eps:             safe(s.dilutedEPS),
    }));

    // Balance sheets from fundamentalsTimeSeries
    const balRows: any[] = Array.isArray(balSeries) ? balSeries : [];
    const balanceSheets = recent4(balRows, s => s.totalAssets != null).map((s: any) => {
      const assets  = safe(s.totalAssets);
      const equity  = safe(s.stockholdersEquity ?? s.commonStockEquity);
      const liab    = safe(s.totalLiabilitiesNetMinorityInterest)
                   ?? (assets != null && equity != null ? assets - equity : null);
      return {
        year:             rowYear(s),
        totalAssets:      assets,
        totalLiabilities: liab,
        totalEquity:      equity,
        cash:             safe(s.cashAndCashEquivalents ?? s.cashCashEquivalentsAndShortTermInvestments),
        longTermDebt:     safe(s.longTermDebt ?? s.longTermDebtAndCapitalLeaseObligation),
      };
    });

    // Cash flows from fundamentalsTimeSeries
    const cfRows: any[] = Array.isArray(cfSeries) ? cfSeries : [];
    const cashFlows = recent4(cfRows, s => s.cashFlowFromContinuingOperatingActivities != null || s.operatingCashFlow != null).map((s: any) => {
      const ocf   = safe(s.cashFlowFromContinuingOperatingActivities ?? s.operatingCashFlow);
      const capex = safe(s.capitalExpenditure);
      const fcf   = safe(s.freeCashFlow) ?? (ocf != null && capex != null ? ocf + capex : null);
      return { year: rowYear(s), operatingCashFlow: ocf, capex, freeCashFlow: fcf };
    });

    // Analyst ratings
    const trend = (result.recommendationTrend as any)?.trend?.[0];
    const buy   = (trend?.strongBuy ?? 0) + (trend?.buy  ?? 0);
    const hold  = trend?.hold ?? 0;
    const sell  = (trend?.sell ?? 0) + (trend?.strongSell ?? 0);

    // Derive D/E from balance sheet (totalLiabilities / totalEquity) so it
    // matches the Financials tab numbers. Yahoo's financialData.debtToEquity
    // uses only long-term debt and is on a different scale.
    const latestBal = balanceSheets[balanceSheets.length - 1] ?? null;
    const derivedDebtToEquity =
      latestBal?.totalLiabilities != null &&
      latestBal?.totalEquity != null &&
      latestBal.totalEquity !== 0
        ? latestBal.totalLiabilities / latestBal.totalEquity
        : null;

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
      debtToEquity:   derivedDebtToEquity,
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
        mean:  safe((fin as any)?.recommendationMean ?? null),
        key:   (fin as any)?.recommendationKey ?? '',
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
