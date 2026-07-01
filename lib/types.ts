export interface Company {
  ticker: string;
  name: string;
  shortName: string;
  domain: string;
  iconSlug: string;
  brandColor: string;
  cardTint: string;
}

export interface IncomeStatementRow {
  year: number;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  eps: number | null;
}

export interface BalanceSheetRow {
  year: number;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  cash: number | null;
  longTermDebt: number | null;
}

export interface CashFlowRow {
  year: number;
  operatingCashFlow: number | null;
  capex: number | null;
  freeCashFlow: number | null;
}

export interface AnalystRatings {
  mean: number | null;
  key: string;
  total: number | null;
  buy: number;
  hold: number;
  sell: number;
}

export interface StockData {
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  eps: number | null;
  forwardEps: number | null;
  marketCap: number | null;
  revenue: number | null;
  netIncome: number | null;
  profitMargin: number | null;
  grossMargin: number | null;
  revenueGrowth: number | null;
  returnOnEquity: number | null;
  debtToEquity: number | null;
  freeCashFlow: number | null;
  priceToSales: number | null;
  evToEbitda: number | null;
  summary: string | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  volume: number | null;
  averageVolume: number | null;
  analystRatings: AnalystRatings | null;
  incomeStatements: IncomeStatementRow[];
  balanceSheets: BalanceSheetRow[];
  cashFlows: CashFlowRow[];
  fetchedAt: string;
}

export type ValuationSignal = 'CHEAP' | 'FAIR' | 'RICH' | 'N/A';
