from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
import math
import time
from typing import Optional, Dict, List, Any

app = FastAPI(title="Mag7 Valuations API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

ALLOWED_TICKERS = {"META", "AAPL", "MSFT", "AMZN", "GOOGL", "NVDA", "TSLA"}
CACHE_TTL = 300        # 5 minutes for quote data
HISTORY_TTL = 600      # 10 minutes for historical data

_cache: Dict[str, Dict] = {}
_history_cache: Dict[str, Dict] = {}

PERIOD_MAP = {
    "1M":  ("1mo",  "1d"),
    "3M":  ("3mo",  "1d"),
    "6M":  ("6mo",  "1d"),
    "YTD": ("ytd",  "1d"),
    "1Y":  ("1y",   "1d"),
    "ALL": ("max",  "1wk"),
}


def safe(val: Any) -> Optional[float]:
    """Return float or None, filtering out NaN/Inf."""
    if val is None:
        return None
    try:
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return None


def df_get(df: pd.DataFrame, col: Any, *labels: str) -> Optional[float]:
    """Try multiple row labels on a DataFrame column, return first match."""
    if df is None or df.empty:
        return None
    for label in labels:
        if label in df.index:
            try:
                return safe(df.at[label, col])
            except Exception:
                continue
    return None


def parse_income(df: pd.DataFrame) -> List[Dict]:
    rows = []
    if df is None or df.empty:
        return rows
    for col in list(df.columns)[:4]:
        year = col.year if hasattr(col, "year") else int(str(col)[:4])
        rows.append({
            "year": year,
            "revenue": df_get(df, col, "Total Revenue", "TotalRevenue"),
            "grossProfit": df_get(df, col, "Gross Profit", "GrossProfit"),
            "operatingIncome": df_get(df, col, "Operating Income", "OperatingIncome", "EBIT", "Ebit"),
            "netIncome": df_get(df, col, "Net Income", "NetIncome"),
            "eps": df_get(df, col, "Diluted EPS", "DilutedEPS", "Basic EPS", "BasicEPS"),
        })
    return rows


def parse_balance(df: pd.DataFrame) -> List[Dict]:
    rows = []
    if df is None or df.empty:
        return rows
    for col in list(df.columns)[:4]:
        year = col.year if hasattr(col, "year") else int(str(col)[:4])
        rows.append({
            "year": year,
            "totalAssets": df_get(df, col, "Total Assets", "TotalAssets"),
            "totalLiabilities": df_get(df, col,
                "Total Liabilities Net Minority Interest",
                "TotalLiabilitiesNetMinorityInterest",
                "Total Liab",
            ),
            "totalEquity": df_get(df, col,
                "Common Stock Equity", "CommonStockEquity",
                "Stockholders Equity", "StockholdersEquity",
                "Total Stockholder Equity",
            ),
            "cash": df_get(df, col, "Cash And Cash Equivalents", "CashAndCashEquivalents", "Cash"),
            "longTermDebt": df_get(df, col, "Long Term Debt", "LongTermDebt"),
        })
    return rows


def parse_cashflow(df: pd.DataFrame) -> List[Dict]:
    rows = []
    if df is None or df.empty:
        return rows
    for col in list(df.columns)[:4]:
        year = col.year if hasattr(col, "year") else int(str(col)[:4])
        ocf = df_get(df, col, "Operating Cash Flow", "OperatingCashFlow", "Cash From Operations")
        capex = df_get(df, col, "Capital Expenditure", "CapitalExpenditure", "Capital Expenditures")
        fcf = df_get(df, col, "Free Cash Flow", "FreeCashFlow")
        # Derive FCF from OCF + capex if not directly available (capex is negative in yfinance)
        if fcf is None and ocf is not None and capex is not None:
            fcf = ocf + capex
        rows.append({
            "year": year,
            "operatingCashFlow": ocf,
            "capex": capex,
            "freeCashFlow": fcf,
        })
    return rows


def fetch_analyst_ratings(stock: Any, info: Dict) -> Optional[Dict]:
    mean = safe(info.get("recommendationMean"))
    key = info.get("recommendationKey") or ""
    total_raw = info.get("numberOfAnalystOpinions")
    total = int(total_raw) if total_raw else None

    buy = hold = sell = 0
    try:
        recs = stock.recommendations
        if recs is not None and not recs.empty:
            cols = recs.columns.tolist()
            if "period" in cols:
                row = recs[recs["period"] == "0m"]
                if row.empty:
                    row = recs.iloc[[-1]]
                r = row.iloc[0]
                buy = int(r.get("strongBuy", 0) or 0) + int(r.get("buy", 0) or 0)
                hold = int(r.get("hold", 0) or 0)
                sell = int(r.get("sell", 0) or 0) + int(r.get("strongSell", 0) or 0)
    except Exception:
        pass

    computed = buy + hold + sell
    return {
        "mean": mean,
        "key": key,
        "total": total or (computed if computed > 0 else None),
        "buy": buy,
        "hold": hold,
        "sell": sell,
    }


def fetch_ticker(ticker: str) -> Dict:
    stock = yf.Ticker(ticker)
    info = stock.info

    # Support both yfinance old and new API
    income_df = None
    for attr in ("income_stmt", "financials"):
        try:
            df = getattr(stock, attr)
            if df is not None and not df.empty:
                income_df = df
                break
        except Exception:
            pass

    balance_df = None
    try:
        df = stock.balance_sheet
        if df is not None and not df.empty:
            balance_df = df
    except Exception:
        pass

    cashflow_df = None
    try:
        df = stock.cashflow
        if df is not None and not df.empty:
            cashflow_df = df
    except Exception:
        pass

    income_rows = parse_income(income_df)

    return {
        "ticker": ticker,
        "price": safe(info.get("currentPrice") or info.get("regularMarketPrice")),
        "change": None,
        "changePercent": safe(info.get("regularMarketChangePercent")),
        "peRatio": safe(info.get("trailingPE")),
        "forwardPE": safe(info.get("forwardPE")),
        "eps": safe(info.get("trailingEps")),
        "forwardEps": safe(info.get("forwardEps")),
        "marketCap": safe(info.get("marketCap")),
        "revenue": safe(info.get("totalRevenue")),
        "netIncome": income_rows[0].get("netIncome") if income_rows else None,
        "profitMargin": safe(info.get("profitMargins")),
        "grossMargin": safe(info.get("grossMargins")),
        "revenueGrowth": safe(info.get("revenueGrowth")),
        "returnOnEquity": safe(info.get("returnOnEquity")),
        "debtToEquity": safe(info.get("debtToEquity")),
        "freeCashFlow": safe(info.get("freeCashflow")),
        "priceToSales": safe(info.get("priceToSalesTrailingTwelveMonths")),
        "evToEbitda": safe(info.get("enterpriseToEbitda")),
        "summary": info.get("longBusinessSummary") or None,
        "dayHigh": safe(info.get("dayHigh")),
        "dayLow": safe(info.get("dayLow")),
        "fiftyTwoWeekHigh": safe(info.get("fiftyTwoWeekHigh")),
        "fiftyTwoWeekLow": safe(info.get("fiftyTwoWeekLow")),
        "volume": safe(info.get("volume")),
        "averageVolume": safe(info.get("averageVolume")),
        "analystRatings": fetch_analyst_ratings(stock, info),
        "incomeStatements": income_rows,
        "balanceSheets": parse_balance(balance_df),
        "cashFlows": parse_cashflow(cashflow_df),
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.get("/api/stock/{ticker}")
async def get_stock(ticker: str):
    ticker = ticker.upper()
    if ticker not in ALLOWED_TICKERS:
        raise HTTPException(400, f"Ticker not supported: {ticker}")

    entry = _cache.get(ticker)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        return entry["data"]

    last_err = None
    for attempt in range(2):
        try:
            data = fetch_ticker(ticker)
            _cache[ticker] = {"data": data, "ts": time.time()}
            return data
        except Exception as e:
            last_err = str(e)
            if attempt == 0:
                time.sleep(1)

    if entry:
        return {**entry["data"], "stale": True}

    raise HTTPException(500, f"Failed to fetch {ticker}: {last_err}")


@app.get("/api/stock/{ticker}/history")
async def get_history(ticker: str, period: str = "1Y"):
    ticker = ticker.upper()
    period = period.upper()
    if ticker not in ALLOWED_TICKERS:
        raise HTTPException(400, f"Ticker not supported: {ticker}")
    if period not in PERIOD_MAP:
        period = "1Y"

    cache_key = f"{ticker}:{period}"
    entry = _history_cache.get(cache_key)
    if entry and time.time() - entry["ts"] < HISTORY_TTL:
        return entry["data"]

    yf_period, yf_interval = PERIOD_MAP[period]
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=yf_period, interval=yf_interval)
        eps = safe(stock.info.get("trailingEps"))

        points = []
        for date, row in hist.iterrows():
            close = safe(row.get("Close"))
            if close is None:
                continue
            pe = round(close / eps, 2) if (eps and eps > 0) else None
            date_str = date.strftime("%Y-%m-%d") if hasattr(date, "strftime") else str(date)[:10]
            points.append({"date": date_str, "price": round(close, 2), "pe": pe})

        result = {"ticker": ticker, "period": period, "data": points}
        _history_cache[cache_key] = {"data": result, "ts": time.time()}
        return result
    except Exception as e:
        raise HTTPException(500, f"History fetch failed for {ticker}: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok"}
