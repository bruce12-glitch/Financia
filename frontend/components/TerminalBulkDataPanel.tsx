import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  GitCompare,
  Layers,
  Search,
  Table2,
} from 'lucide-react';
import { SCREENER_FUNDS, ScreenerInstrumentType } from '../utils/screenerEngine';
import {
  buildBulkDataCsv,
  buildBulkInstrumentRows,
  BulkSortField,
  computeAggregatedBasketSummary,
  sortBulkInstrumentRows,
} from '../utils/portfolioAllocatorEngine';

export interface TerminalBulkDataPanelProps {
  primarySymbol: string;
  comparisonTickers: string[];
  onSelectPrimary: (symbol: string) => void;
  onChangeComparisonTickers: (next: string[]) => void;
  onJumpToCompare: () => void;
  onJumpToAllocator: () => void;
}

export const TerminalBulkDataPanel: React.FC<TerminalBulkDataPanelProps> = ({
  primarySymbol,
  comparisonTickers,
  onSelectPrimary,
  onChangeComparisonTickers,
  onJumpToCompare,
  onJumpToAllocator,
}) => {
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ScreenerInstrumentType>('ALL');
  const [search, setSearch] = useState<string>('');
  const [sortField, setSortField] = useState<BulkSortField>('validationScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const selectedSet = useMemo(
    () => new Set([primarySymbol, ...comparisonTickers]),
    [primarySymbol, comparisonTickers]
  );

  const basketFunds = useMemo(() => {
    const matched = Array.from(selectedSet)
      .map((sym) => SCREENER_FUNDS.find((f) => f.symbol === sym))
      .filter((f): f is NonNullable<typeof f> => Boolean(f));
    return matched.length > 0 ? matched : SCREENER_FUNDS.slice(0, 3);
  }, [selectedSet]);

  const basketSummary = useMemo(
    () => computeAggregatedBasketSummary(basketFunds),
    [basketFunds]
  );

  const rows = useMemo(() => {
    const source = scope === 'selected' ? basketFunds : SCREENER_FUNDS;
    const allRows = buildBulkInstrumentRows(source);
    const q = search.trim().toLowerCase();
    const filtered = allRows.filter((row) => {
      if (typeFilter !== 'ALL' && row.instrumentType !== typeFilter) return false;
      if (!q) return true;
      return (
        row.symbol.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        row.leadManager.toLowerCase().includes(q)
      );
    });
    return sortBulkInstrumentRows(filtered, sortField, sortDir);
  }, [scope, basketFunds, typeFilter, search, sortField, sortDir]);

  const handleSort = (field: BulkSortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      const ascDefault: BulkSortField[] = ['symbol', 'expenseRatioPct', 'var95MonthlyPct', 'maxDrawdown3YPct'];
      setSortDir(ascDefault.includes(field) ? 'asc' : 'desc');
    }
  };

  const handleToggleBasket = (symbol: string) => {
    if (symbol === primarySymbol) return;
    if (comparisonTickers.includes(symbol)) {
      onChangeComparisonTickers(comparisonTickers.filter((s) => s !== symbol));
    } else {
      onChangeComparisonTickers([...comparisonTickers.slice(-4), symbol]);
    }
  };

  const handleExportCsv = () => {
    const csv = buildBulkDataCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financia-bulk-funds-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderSortIcon = (field: BulkSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-[#94a3b8] inline-block ml-1" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#2563eb] inline-block ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#2563eb] inline-block ml-1" />
    );
  };

  return (
    <div data-testid="terminal-bulk-data-panel" className="space-y-5">
      {/* Aggregated Basket Metrics Strip */}
      <div className="rounded-[12px] bg-white border border-[#e2e8f0] p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-[#e2e8f0]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.07em] text-[#2563eb] font-semibold">
              <Table2 className="w-3.5 h-3.5" />
              <span>Full-Universe Bulk Data Ledger · {SCREENER_FUNDS.length} Instruments</span>
            </div>
            <h3 className="text-base font-display font-semibold text-[#0f172a] mt-0.5">
              Bulk Instrument Screener, Ratios &amp; Basket Builder
            </h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Inspect all {SCREENER_FUNDS.length} Mutual Funds &amp; ETFs side-by-side, check instruments to aggregate into your active comparison basket ({basketFunds.length} selected), or export the full dataset to CSV.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onJumpToCompare}
              className="h-9 px-3.5 rounded-[8px] bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <GitCompare className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Compare Selected ({basketFunds.length})</span>
            </button>
            <button
              type="button"
              onClick={onJumpToAllocator}
              className="h-9 px-3.5 rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Allocate Basket %</span>
            </button>
            <button
              type="button"
              data-testid="terminal-bulk-export-csv"
              onClick={handleExportCsv}
              className="h-9 px-3.5 rounded-[8px] border border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-xs font-semibold text-[#0f172a] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>Export CSV ({rows.length})</span>
            </button>
          </div>
        </div>

        {/* Aggregated Active Basket Strip */}
        <div
          data-testid="terminal-bulk-basket-summary"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          <div className="rounded-[9px] bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">Active Basket</div>
            <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
              {basketSummary.count} funds
            </div>
            <div className="text-[10.5px] text-[#64748b]">
              {basketSummary.mfCount} MF · {basketSummary.etfCount} ETF
            </div>
          </div>
          <div className="rounded-[9px] bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">Avg 1Y Return</div>
            <div className="text-base font-mono font-bold text-[#059669] tabular-nums mt-0.5">
              {basketSummary.avgReturn1YPct >= 0 ? '+' : ''}
              {basketSummary.avgReturn1YPct.toFixed(2)}%
            </div>
            <div className="text-[10.5px] text-[#64748b]">3Y avg: {basketSummary.avgReturn3YPct.toFixed(1)}%</div>
          </div>
          <div className="rounded-[9px] bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">Avg Expense TER</div>
            <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
              {basketSummary.avgExpenseRatioPct.toFixed(2)}%
            </div>
            <div className="text-[10.5px] text-[#64748b]">Direct plan drag</div>
          </div>
          <div className="rounded-[9px] bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">Avg Sharpe 3Y</div>
            <div className="text-base font-mono font-bold text-[#2563eb] tabular-nums mt-0.5">
              {basketSummary.avgSharpe3Y.toFixed(2)}
            </div>
            <div className="text-[10.5px] text-[#64748b]">Score {basketSummary.avgValidationScore.toFixed(0)}/100</div>
          </div>
          <div className="rounded-[9px] bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">Avg 1M VaR 95%</div>
            <div className="text-base font-mono font-bold text-[#dc2626] tabular-nums mt-0.5">
              {basketSummary.avgVar95MonthlyPct.toFixed(2)}%
            </div>
            <div className="text-[10.5px] text-[#64748b]">Monthly tail loss</div>
          </div>
          <div className="rounded-[9px] bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-[10.5px] font-mono uppercase text-[#64748b]">Avg 3Y Max DD</div>
            <div className="text-base font-mono font-bold text-[#dc2626] tabular-nums mt-0.5">
              {basketSummary.avgMaxDrawdown3YPct.toFixed(1)}%
            </div>
            <div className="text-[10.5px] text-[#64748b]">
              Avg Calmar: {basketSummary.avgCalmarRatio.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar + Full Sortable Table */}
      <div className="rounded-[12px] bg-white border border-[#e2e8f0] overflow-hidden">
        <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <label htmlFor="terminal-bulk-search" className="sr-only">
                Filter bulk fund dataset
              </label>
              <input
                id="terminal-bulk-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter symbol, manager, category..."
                className="h-8 pl-8 pr-3 rounded-[7px] bg-white border border-[#cbd5e1] text-xs text-[#0f172a] placeholder:text-[#64748b] focus:outline-none focus:border-[#2563eb] w-56"
              />
            </div>

            <div className="inline-flex items-center p-0.5 rounded-[7px] bg-white border border-[#cbd5e1]">
              {(['all', 'selected'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setScope(sc)}
                  className={`px-2.5 py-1 rounded-[5px] text-[11px] font-semibold cursor-pointer ${
                    scope === sc ? 'bg-[#0f172a] text-white' : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  {sc === 'all' ? `All (${SCREENER_FUNDS.length})` : `Basket (${basketFunds.length})`}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center p-0.5 rounded-[7px] bg-white border border-[#cbd5e1]">
              {(['ALL', 'Mutual Fund', 'ETF'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-[5px] text-[11px] font-semibold cursor-pointer ${
                    typeFilter === t ? 'bg-[#2563eb] text-white' : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  {t === 'ALL' ? 'All Types' : t === 'Mutual Fund' ? 'MFs' : 'ETFs'}
                </button>
              ))}
            </div>
          </div>

          <span className="text-[11px] font-mono text-[#64748b]">
            Showing {rows.length} rows · Click any column header to sort
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1140px]">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[10.5px] font-mono uppercase tracking-wider text-[#64748b]">
                <th className="py-2.5 pl-4 pr-2 font-semibold w-10">Pick</th>
                <th className="py-2.5 px-2 font-semibold">
                  <button type="button" onClick={() => handleSort('symbol')} className="inline-flex items-center cursor-pointer hover:text-[#0f172a]">
                    Instrument {renderSortIcon('symbol')}
                  </button>
                </th>
                <th className="py-2.5 px-2 font-semibold">Manager</th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  <button type="button" onClick={() => handleSort('price')} className="inline-flex items-center justify-end cursor-pointer hover:text-[#0f172a]">
                    Price/NAV {renderSortIcon('price')}
                  </button>
                </th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  <button type="button" onClick={() => handleSort('aumSortUsdB')} className="inline-flex items-center justify-end cursor-pointer hover:text-[#0f172a]">
                    AUM {renderSortIcon('aumSortUsdB')}
                  </button>
                </th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  <button type="button" onClick={() => handleSort('expenseRatioPct')} className="inline-flex items-center justify-end cursor-pointer hover:text-[#0f172a]">
                    TER {renderSortIcon('expenseRatioPct')}
                  </button>
                </th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  <button type="button" onClick={() => handleSort('return1YPct')} className="inline-flex items-center justify-end cursor-pointer hover:text-[#0f172a]">
                    1Y % {renderSortIcon('return1YPct')}
                  </button>
                </th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  <button type="button" onClick={() => handleSort('return3YPct')} className="inline-flex items-center justify-end cursor-pointer hover:text-[#0f172a]">
                    3Y % {renderSortIcon('return3YPct')}
                  </button>
                </th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  <button type="button" onClick={() => handleSort('sharpe3Y')} className="inline-flex items-center justify-end cursor-pointer hover:text-[#0f172a]">
                    Sharpe {renderSortIcon('sharpe3Y')}
                  </button>
                </th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  <button type="button" onClick={() => handleSort('sortino3Y')} className="inline-flex items-center justify-end cursor-pointer hover:text-[#0f172a]">
                    Sortino {renderSortIcon('sortino3Y')}
                  </button>
                </th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  <button type="button" onClick={() => handleSort('var95MonthlyPct')} className="inline-flex items-center justify-end cursor-pointer hover:text-[#0f172a]">
                    VaR 95% {renderSortIcon('var95MonthlyPct')}
                  </button>
                </th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  <button type="button" onClick={() => handleSort('maxDrawdown3YPct')} className="inline-flex items-center justify-end cursor-pointer hover:text-[#0f172a]">
                    Max DD {renderSortIcon('maxDrawdown3YPct')}
                  </button>
                </th>
                <th className="py-2.5 px-2 font-semibold text-right">
                  <button type="button" onClick={() => handleSort('validationScore')} className="inline-flex items-center justify-end cursor-pointer hover:text-[#0f172a]">
                    Score {renderSortIcon('validationScore')}
                  </button>
                </th>
                <th className="py-2.5 pl-2 pr-4 font-semibold text-right">Focus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9] text-xs">
              {rows.map((row) => {
                const isPrimary = row.symbol === primarySymbol;
                const inBasket = selectedSet.has(row.symbol);
                return (
                  <tr
                    key={row.symbol}
                    data-testid={`terminal-bulk-row-${row.symbol}`}
                    className={`transition-colors ${
                      isPrimary
                        ? 'bg-[#eff6ff]'
                        : inBasket
                          ? 'bg-[#f8fafc]'
                          : 'hover:bg-[#f8fafc]'
                    }`}
                  >
                    <td className="py-2.5 pl-4 pr-2">
                      <input
                        type="checkbox"
                        checked={inBasket}
                        disabled={isPrimary}
                        onChange={() => handleToggleBasket(row.symbol)}
                        aria-label={`Include ${row.symbol} in active comparison basket`}
                        className="w-3.5 h-3.5 accent-[#2563eb] cursor-pointer disabled:opacity-60"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#0f172a]">{row.symbol}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#475569]">
                          {row.instrumentType === 'Mutual Fund' ? 'MF' : 'ETF'}
                        </span>
                        {isPrimary && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2563eb] text-white">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#64748b] truncate max-w-[205px]">
                        {row.name}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-[#334155] truncate max-w-[130px]">
                      {row.leadManager}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-[#0f172a]">
                        {row.currency === 'INR' ? '₹' : '$'}
                        {row.price.toFixed(2)}
                      </div>
                      <div className={`text-[10.5px] ${row.changePct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
                        {row.changePct >= 0 ? '+' : ''}
                        {row.changePct.toFixed(2)}%
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#334155] whitespace-nowrap">
                      {row.aumLabel}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#334155] whitespace-nowrap">
                      {row.expenseRatioPct.toFixed(2)}%
                    </td>
                    <td className={`py-2.5 px-2 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${row.return1YPct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
                      {row.return1YPct >= 0 ? '+' : ''}
                      {row.return1YPct.toFixed(1)}%
                    </td>
                    <td className={`py-2.5 px-2 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${row.return3YPct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
                      {row.return3YPct >= 0 ? '+' : ''}
                      {row.return3YPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold tabular-nums text-[#2563eb] whitespace-nowrap">
                      {row.sharpe3Y.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#334155] whitespace-nowrap">
                      {row.sortino3Y.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold tabular-nums text-[#dc2626] whitespace-nowrap">
                      {row.var95MonthlyPct.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold tabular-nums text-[#dc2626] whitespace-nowrap">
                      {row.maxDrawdown3YPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold tabular-nums text-[#0f172a] whitespace-nowrap">
                      {row.validationScore}
                    </td>
                    <td className="py-2.5 pl-2 pr-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectPrimary(row.symbol)}
                        className="h-7 px-2.5 rounded-[6px] border border-[#cbd5e1] bg-white hover:border-[#2563eb] hover:text-[#2563eb] text-[11px] font-semibold text-[#334155] cursor-pointer"
                      >
                        {isPrimary ? 'Active' : 'Set Primary'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
