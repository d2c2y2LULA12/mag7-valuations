'use client';

import { StockData } from '@/lib/types';
import { formatBig } from '@/lib/constants';

function Table({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: { label: string; values: (string | number | null)[] }[];
}) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[#4FD1E8] mb-3 px-1">
        {title}
      </h3>
      <div className="rounded-xl overflow-hidden border border-[#1e1e3a]" style={{ background: 'rgba(13,13,26,0.7)' }}>
        <table className="fin-table">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row.label}</td>
                {row.values.map((v, j) => (
                  <td key={j}>{v === null ? <span className="text-[#374151]">N/A</span> : v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FinancialTables({ data }: { data: StockData }) {
  const incomeYears = data.incomeStatements.map((r) => String(r.year));
  const balanceYears = data.balanceSheets.map((r) => String(r.year));
  const cfYears = data.cashFlows.map((r) => String(r.year));

  const incomeHeaders = ['', ...incomeYears];
  const balanceHeaders = ['', ...balanceYears];
  const cfHeaders = ['', ...cfYears];

  const incomeRows = [
    {
      label: 'Revenue',
      values: data.incomeStatements.map((r) => formatBig(r.revenue)),
    },
    {
      label: 'Gross Profit',
      values: data.incomeStatements.map((r) => formatBig(r.grossProfit)),
    },
    {
      label: 'Operating Income',
      values: data.incomeStatements.map((r) => formatBig(r.operatingIncome)),
    },
    {
      label: 'Net Income',
      values: data.incomeStatements.map((r) => formatBig(r.netIncome)),
    },
    {
      label: 'EPS (diluted)',
      values: data.incomeStatements.map((r) =>
        r.eps !== null ? `$${r.eps.toFixed(2)}` : null
      ),
    },
  ];

  const balanceRows = [
    {
      label: 'Total Assets',
      values: data.balanceSheets.map((r) => formatBig(r.totalAssets)),
    },
    {
      label: 'Total Liabilities',
      values: data.balanceSheets.map((r) => formatBig(r.totalLiabilities)),
    },
    {
      label: 'Total Equity',
      values: data.balanceSheets.map((r) => formatBig(r.totalEquity)),
    },
    {
      label: 'Cash',
      values: data.balanceSheets.map((r) => formatBig(r.cash)),
    },
    {
      label: 'Long-term Debt',
      values: data.balanceSheets.map((r) => formatBig(r.longTermDebt)),
    },
  ];

  const cfRows = [
    {
      label: 'Operating Cash Flow',
      values: data.cashFlows.map((r) => formatBig(r.operatingCashFlow)),
    },
    {
      label: 'Capital Expenditures',
      values: data.cashFlows.map((r) => formatBig(r.capex)),
    },
    {
      label: 'Free Cash Flow',
      values: data.cashFlows.map((r) => formatBig(r.freeCashFlow)),
    },
  ];

  return (
    <div>
      {data.incomeStatements.length > 0 && (
        <Table title="Income Statement" headers={incomeHeaders} rows={incomeRows} />
      )}
      {data.balanceSheets.length > 0 && (
        <Table title="Balance Sheet" headers={balanceHeaders} rows={balanceRows} />
      )}
      {data.cashFlows.length > 0 && (
        <Table title="Cash Flow" headers={cfHeaders} rows={cfRows} />
      )}
    </div>
  );
}
