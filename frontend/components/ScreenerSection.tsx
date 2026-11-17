import React, { useMemo, useState } from 'react';
import { ArrowDownUp, ArrowRight, Plus, X } from 'lucide-react';
import {
  EQUITY_UNIVERSE,
  MUTUAL_FUNDS_UNIVERSE,
  PREBUILT_SCREENS,
  SCREENER_FILTER_PARAMS,
} from '../data/indianMarketData';
import {
  ScreenerSortKey,
  filterScreenerStocks,
  sortScreenerStocks,
} from '../utils/screenerEngine';

interface ScreenerSectionProps {
  selectedSymbol: string;
  onSelectAsset: (symbol: string) => void;
}

export const ScreenerSection: React.FC<ScreenerSectionProps> = ({
  selectedSymbol,
  onSelectAsset,
}) => {
  const [assetMode, setAssetMode] = useState<'Stocks' | 'Mutual Funds'>('Stocks');
  const [activePresetId, setActivePresetId] = useState<string>('growth_bargains');
  const [activeFilters, setActiveFilters] = useState<string[]>(
    PREBUILT_SCREENS[0].filters
  );
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortKey, setSortKey] = useState<ScreenerSortKey>('mktCapCr');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const indianStocks = useMemo(
    () => EQUITY_UNIVERSE.filter((s) => s.exchange === 'NSE'),
    []
  );

  const filteredStocks = useMemo(() => {
    const matched = filterScreenerStocks(indianStocks, activeFilters);
    return sortScreenerStocks(matched, sortKey, sortDir);
  }, [indianStocks, activeFilters, sortKey, sortDir]);

  const handleSelectPreset = (presetId: string) => {
    const preset = PREBUILT_SCREENS.find((p) => p.id === presetId);
    if (!preset) return;
    setAssetMode('Stocks');
    setActivePresetId(presetId);
    setActiveFilters(preset.filters);
  };

  const toggleFilter = (filterId: string) => {
    setActivePresetId('custom');
    setActiveFilters((prev) =>
      prev.includes(filterId) ? prev.filter((f) => f !== filterId) : [...prev, filterId]
    );
  };

  const handleSort = (key: ScreenerSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const totalUniverseLabel = assetMode === 'Stocks' ? '5,124' : '1,480';
  const matchCountLabel =
    assetMode === 'Stocks'
      ? `${filteredStocks.length} of ${totalUniverseLabel} match`
      : `${MUTUAL_FUNDS_UNIVERSE.length} of ${totalUniverseLabel} match`;

  return (
    <section
      id="screeners"
      aria-label="Stock and Mutual Fund Screeners"
      className="w-full bg-[#0A1410] text-[#F1F5F3] py-16 lg:py-20 border-b border-white/[0.06]"
    >
      <div className="max-w-[1220px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left 4 Columns: Screener Narrative, Metrics & Pre-Built Screens */}
        <div className="lg:col-span-4 space-y-6">
          <div>
            <div className="text-xs font-medium text-[#4ADE80] mb-2">
              Screeners
            </div>
            <h2 className="font-display font-semibold text-3xl md:text-4xl tracking-tight text-white leading-tight">
              Filter 5,000+ stocks.
              <br />
              <span className="font-editorial font-medium text-[#D8E5DF]">
                200+ parameters.
              </span>
            </h2>
            <p className="text-sm text-[#9DB0A6] leading-relaxed mt-3">
              Combine fundamentals and technicals — PE, debt-to-equity, ROCE, promoter holding, RSI and more. Screen mutual funds with 50+ filters across returns, risk and expense ratio.
            </p>
          </div>

          {/* 3 Tabular Coverage Metrics */}
          <div className="grid grid-cols-3 gap-4 py-4 border-y border-white/[0.08]">
            <div>
              <div className="text-2xl font-display font-bold font-mono text-white">
                5k+
              </div>
              <div className="text-xs text-[#8FA499] mt-0.5">Indian stocks</div>
            </div>
            <div>
              <div className="text-2xl font-display font-bold font-mono text-white">
                200+
              </div>
              <div className="text-xs text-[#8FA499] mt-0.5">Stock filters</div>
            </div>
            <div>
              <div className="text-2xl font-display font-bold font-mono text-white">
                50+
              </div>
              <div className="text-xs text-[#8FA499] mt-0.5">MF filters</div>
            </div>
          </div>

          {/* Pre-Built Screens */}
          <div>
            <div className="text-[11px] font-medium text-[#7E9488] tracking-wide mb-2.5">
              Pre-built screens
            </div>
            <div className="flex flex-wrap gap-2">
              {PREBUILT_SCREENS.map((preset) => {
                const isActive =
                  assetMode === 'Stocks' && activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#173025] border-[#22C55E] text-[#86EFAC]'
                        : 'bg-[#0F1E18] border-white/10 text-[#B8C7BF] hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 8 Columns: Interactive High-Density Screener Table Card */}
        <div className="lg:col-span-8 bg-[#0E1B16] rounded-2xl border border-[#1E352A] overflow-hidden">
          {/* Top Bar: Mode Switcher + Match Count + Add Filter */}
          <div className="px-5 py-4 border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center p-1 rounded-lg bg-[#09130F] border border-white/[0.06]">
              {(['Stocks', 'Mutual Funds'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAssetMode(mode)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    assetMode === mode
                      ? 'bg-[#1B372A] text-white'
                      : 'text-[#8FA499] hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 relative">
              <span className="text-xs font-mono tabular-nums text-[#8FA499]">
                {matchCountLabel}
              </span>
              {assetMode === 'Stocks' && (
                <button
                  type="button"
                  onClick={() => setShowFilterMenu((v) => !v)}
                  className="px-3 py-1.5 rounded-lg bg-[#12251D] border border-[#244335] text-xs font-medium text-[#D8E5DF] hover:border-[#22C55E] inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#4ADE80]" />
                  <span>Add filter</span>
                </button>
              )}

              {showFilterMenu && assetMode === 'Stocks' && (
                <div className="absolute right-0 top-10 z-30 w-64 rounded-xl bg-[#102019] border border-[#244335] p-3 shadow-2xl space-y-1.5">
                  <div className="text-[11px] font-semibold text-[#8FA499] px-1 pb-1 border-b border-white/[0.06]">
                    Toggle Screener Filters
                  </div>
                  {SCREENER_FILTER_PARAMS.map((param) => {
                    const enabled = activeFilters.includes(param.id);
                    return (
                      <button
                        key={param.id}
                        type="button"
                        onClick={() => toggleFilter(param.id)}
                        className={`w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          enabled
                            ? 'bg-[#193529] text-[#86EFAC]'
                            : 'text-[#B8C7BF] hover:bg-white/[0.05]'
                        }`}
                      >
                        <span>{param.label}</span>
                        <span className="font-mono text-[11px]">
                          {enabled ? 'Active' : '+'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Active Parameter Chips (Stocks Mode) */}
          {assetMode === 'Stocks' && (
            <div className="px-5 py-3 border-b border-white/[0.06] flex flex-wrap items-center gap-2 bg-[#0B1612]">
              {activeFilters.length === 0 ? (
                <span className="text-xs text-[#7E9488]">
                  Showing all NSE equities. Select a Pre-built screen or click Add filter.
                </span>
              ) : (
                activeFilters.map((id) => {
                  const def = SCREENER_FILTER_PARAMS.find((p) => p.id === id);
                  if (!def) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleFilter(id)}
                      aria-label={`Remove filter ${def.label}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#162C23] border border-[#264638] text-xs font-mono text-[#CFE0D7] hover:border-[#EF4444]/60 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{def.label}</span>
                      <X className="w-3 h-3 text-[#7E9488]" />
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {assetMode === 'Stocks' ? (
              <table className="w-full text-left border-collapse min-w-[660px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] font-medium text-[#7E9488]">
                    <th className="py-3 pl-5 pr-3">Company</th>
                    <th className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('mktCapCr')}
                        className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                      >
                        <span>Mkt Cap</span>
                        <ArrowDownUp className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('pe')}
                        className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                      >
                        <span>PE</span>
                        <ArrowDownUp className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('roce')}
                        className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                      >
                        <span>ROCE</span>
                        <ArrowDownUp className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right">D/E</th>
                    <th className="py-3 px-3 text-right">Promoter</th>
                    <th className="py-3 pl-3 pr-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('return1Y')}
                        className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                      >
                        <span>1Y Return</span>
                        <ArrowDownUp className="w-3 h-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-xs">
                  {filteredStocks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 px-5 text-center text-[#8FA499]">
                        No stocks match all active criteria.{' '}
                        <button
                          type="button"
                          onClick={() => setActiveFilters([])}
                          className="text-[#4ADE80] underline ml-1 cursor-pointer"
                        >
                          Reset filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredStocks.map((stock) => {
                      const selected = stock.symbol === selectedSymbol;
                      return (
                        <tr
                          key={stock.symbol}
                          onClick={() => onSelectAsset(stock.symbol)}
                          className={`transition-colors cursor-pointer ${
                            selected
                              ? 'bg-[#173025]/80'
                              : 'hover:bg-[#13241D]'
                          }`}
                        >
                          <td className="py-3.5 pl-5 pr-3">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-lg bg-[#162C23] border border-white/10 flex items-center justify-center font-mono text-[10px] font-bold text-[#86EFAC] shrink-0">
                                {stock.shortCode}
                              </span>
                              <div>
                                <div className="font-semibold text-white">
                                  {stock.name}
                                </div>
                                <div className="text-[11px] font-mono text-[#7E9488]">
                                  {stock.symbol}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#D8E5DF]">
                            {stock.mktCapDisplay}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#D8E5DF]">
                            {stock.pe.toFixed(1)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#D8E5DF]">
                            {stock.roce.toFixed(1)}%
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#D8E5DF]">
                            {stock.debtToEquity.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#D8E5DF]">
                            {stock.promoterHolding.toFixed(1)}%
                          </td>
                          <td
                            className={`py-3.5 pl-3 pr-5 text-right font-mono tabular-nums font-semibold ${
                              stock.return1Y >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'
                            }`}
                          >
                            {stock.return1Y >= 0 ? '+' : ''}
                            {stock.return1Y.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse min-w-[660px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] font-medium text-[#7E9488]">
                    <th className="py-3 pl-5 pr-3">Scheme Name</th>
                    <th className="py-3 px-3 text-right">AUM</th>
                    <th className="py-3 px-3 text-right">Expense</th>
                    <th className="py-3 px-3 text-right">3Y CAGR</th>
                    <th className="py-3 px-3 text-right">Sharpe</th>
                    <th className="py-3 pl-3 pr-5 text-right">1Y Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-xs">
                  {MUTUAL_FUNDS_UNIVERSE.map((mf) => (
                    <tr
                      key={mf.symbol}
                      className="hover:bg-[#13241D] transition-colors"
                    >
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-[#162C23] border border-white/10 flex items-center justify-center font-mono text-[10px] font-bold text-[#86EFAC] shrink-0">
                            {mf.shortCode}
                          </span>
                          <div>
                            <div className="font-semibold text-white">{mf.name}</div>
                            <div className="text-[11px] text-[#7E9488]">
                              {mf.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#D8E5DF]">
                        {mf.aumDisplay}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#D8E5DF]">
                        {mf.expenseRatio.toFixed(2)}%
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#4ADE80]">
                        {mf.cagr3Y.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#D8E5DF]">
                        {mf.sharpe.toFixed(2)}
                      </td>
                      <td className="py-3.5 pl-3 pr-5 text-right font-mono tabular-nums font-semibold text-[#4ADE80]">
                        +{mf.return1Y.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom Table Footer */}
          <div className="px-5 py-3.5 border-t border-white/[0.06] bg-[#0B1612] flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-[#7E9488]">
              Fundamentals updated from Q2 FY25 filings · Click any row to load full Scorecard
            </span>
            <button
              type="button"
              onClick={() => setActiveFilters([])}
              className="px-3.5 py-1.5 rounded-lg bg-[#22C55E] text-[#05140C] font-semibold text-xs hover:bg-[#4ADE80] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Open full screener</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
